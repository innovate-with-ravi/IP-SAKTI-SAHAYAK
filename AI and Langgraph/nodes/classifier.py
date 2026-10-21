"""Nodes for Formulation Classification & HITL Clarification Loop.

Categorizes Ayurvedic products across the 6 statutory regulatory categories:
1. Classical / Generic medicine (First Schedule texts, Section 3(p) patent bar, TKDL defense)
2. Patent or Proprietary (P&P) Ayurvedic medicine (DCA Section 3(h), Rule 158B)
3. New / Non-classical Drug (Rule 122E, safety & efficacy trials, high patent potential)
4. Phytopharmaceutical drug (Standardized botanical fraction with markers, DCGI trials)
5. Ayurveda Aahar (FSSAI Ayurveda Aahar Regulations 2022, food regime)
6. Ayurvedic Cosmetic (DCA Rule 158B, beauty/cleansing only)

Decoupled into:
1. `formulation_evaluator_node` (Pure Brain): Runs LLM evaluation and category classification.
2. `clarification_pause_node` (Pure HITL): Pauses graph via interrupt() and collects answers without re-running LLM.
"""

from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from langgraph.types import interrupt
from langchain_core.prompts import ChatPromptTemplate
from core.state import GraphState
from core.prompts import get_classifier_prompt
from core.llm import get_resilient_structured_model

class FormulationClassifierOutput(BaseModel):
    """Structured output schema for formulation classification and clarification."""
    category: Literal[
        "classical",
        "proprietary",
        "new_drug",
        "phytopharmaceutical",
        "aahar_food",
        "cosmetic",
        "unknown"
    ] = Field(
        description="The statutory `regulatory category` under Drugs and Cosmetics Act, FSSAI, or Patent Act and `unknown` if product description is too ambiguous or missing key details to categorize safely."
    )
    needs_clarification: bool = Field(
        description="True if product description is too ambiguous or missing key details to categorize safely."
    )
    clarification_questions: List[str] = Field(
        default_factory=list,
        description="1-3 targeted, concise clarifying questions to ask the user if needs_clarification is True."
    )
    reasoning: str = Field(
        description="Statutory justification explaining why this category or clarification was chosen."
    )

class ForcedClassificationOutput(BaseModel):
    """Fallback schema forcing the LLM to make its single best-guess category when max attempts reached."""
    category: Literal[
        "classical",
        "proprietary",
        "new_drug",
        "phytopharmaceutical",
        "aahar_food",
        "cosmetic"
    ] = Field(
        description="Best-guess regulatory category based on all available information. Cannot be unknown."
    )
    reasoning: str = Field(
        description="Brief reasoning for the forced classification."
    )

def format_clarification_history(history: List[Dict[str, Any]]) -> str:
    """Formats question and answer history into readable context for the classifier."""
    if not history:
        return "No clarification answers provided yet."

    formatted = []
    for idx, item in enumerate(history, 1):
        questions = item.get("questions", [])
        answer = item.get("answer", "")
        q_str = " | ".join(questions) if isinstance(questions, list) else str(questions)
        formatted.append(f"Turn {idx}:\n  Clarifying Question Asked: {q_str}\n  User Clarification Answer: {answer}")

    formatted_history = "\n\n".join(formatted)    
    # print(f"[formatted_history]: {formatted_history}") # just for debugging
    return formatted_history

async def force_llm_classification(user_query: str, history: List[Dict[str, Any]]) -> str:
    """
    Failsafe: When max clarification attempts (3) are reached and category is still unknown,
    prompts the LLM to make its single best-guess regulatory classification.
    """
    history_str = format_clarification_history(history)
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are the Senior Ayurvedic Regulatory Classifier. The user inquiry has completed maximum clarification attempts.\n"
                   "Based strictly on all available information below, select your single best-guess statutory category from:\n"
                   "- 'classical': If derived from traditional texts (Charaka, AFI, TKDL).\n"
                   "- 'proprietary': If a commercial branded Ayurvedic medicine with known herbs.\n"
                   "- 'new_drug': If claiming clinical novelty or new therapeutic indications.\n"
                   "- 'phytopharmaceutical': If purified extract with standardized markers.\n"
                   "- 'aahar_food': If food, dietary supplement, tea, beverage, candy, or energy bar.\n"
                   "- 'cosmetic': If skin care, face cream, hair oil, shampoo, or cosmetic wash.\n"
                   "You must pick the most probable category. Do NOT return unknown."),
        ("human", "User Original Query: {user_query}\n\nClarification History:\n{history}\n\nMake best-guess classification:")
    ])
    model = get_resilient_structured_model(ForcedClassificationOutput)
    chain = prompt | model
    try:
        res: ForcedClassificationOutput = await chain.ainvoke({ # why don't we use streaming here, won't the user get a final response hit at his face at last ``
            "user_query": user_query,
            "history": history_str
        })
        return res.category
    except Exception as e:
        print(f"[force_llm_classification]: Error ({e}). Defaulting to 'proprietary'.")
        return "proprietary"

async def formulation_evaluator_node(state: GraphState) -> Dict[str, Any]:
    """
    Pure Brain: Evaluates formulation category using LLM.
    Does NOT call interrupt(). If ambiguous, stores questions in state for clarification_pause.
    """
    user_query = state.get("user_query", "")
    attempts = state.get("clarification_attempts", 0)
    history = state.get("clarification_history", [])
    history_str = format_clarification_history(history)

    print(f"\n--- [CLASSIFIER_SUBGRAPH: formulation_evaluator] Evaluating Formulation (Attempt {attempts + 1}/3) ---")

    # Hard circuit breaker: If already attempted 3 times, force classification
    if attempts >= 3:
        print("   Circuit breaker reached (3 attempts). Forcing best-guess classification...")
        forced_category = await force_llm_classification(user_query, history)
        print(f"   Forced Category: -> {forced_category.upper()}")
        return {
            "formulation_category": forced_category,
            "needs_clarification": False,
            "clarification_questions": [],
            "clarification_attempts": attempts
        }

    prompt = get_classifier_prompt()
    model = get_resilient_structured_model(FormulationClassifierOutput)
    chain = prompt | model

    # Augment user query with clarification history if any answers have been received
    augmented_query = user_query
    if history:
        augmented_query = f"{user_query}\n\n[Clarification Context from User]:\n{history_str}"

    try:
        result: FormulationClassifierOutput = await chain.ainvoke({"user_query": augmented_query})
        category = result.category
        needs_clarification = result.needs_clarification
        questions = result.clarification_questions
        reasoning = result.reasoning
    except Exception as e:
        print(f"[formulation_evaluator_node]: Error in chain invoke ({e}). Forcing best-guess classification...")
        category = await force_llm_classification(user_query, history)
        needs_clarification = False
        questions = []
        reasoning = f"Fallback classification via force_llm_classification due to: {e}"

    # If category is unknown and no clarification requested, force-classify
    if category == "unknown" and not needs_clarification:
        print("   Category is 'unknown' and no clarification requested. Invoking force_llm_classification...")
        category = await force_llm_classification(user_query, history)
        reasoning = f"Force-classified based on available information: {category}"

    # CASE A: Ambiguous formulation -> Request clarification
    if needs_clarification or category == "unknown":
        print(f"   Formulation Ambiguous. Needs Clarification: True")
        print(f"   Questions Generated: {questions}")
        return {
            "needs_clarification": True,
            "clarification_questions": questions,
            "clarification_attempts": attempts
        }

    # CASE B: Confidently classified!
    print(f"   Category Confirmed: -> {category.upper()}")
    print(f"   Reasoning: {reasoning}")
    return {
        "formulation_category": category,
        "needs_clarification": False,
        "clarification_questions": [],
        "clarification_attempts": attempts
    }

async def clarification_pause_node(state: GraphState) -> Dict[str, Any]:
    """
    Pure HITL: Pauses execution via interrupt() to collect user input.
    Contains ZERO LLM calls, ensuring 100% idempotent execution on resume.
    """
    questions = state.get("clarification_questions", [])
    attempts = state.get("clarification_attempts", 0)

    print(f"\n--- [CLASSIFIER_SUBGRAPH: clarification_pause] Waiting for Human Input ---")
    print(f"   Pausing execution via interrupt() (Attempt {attempts + 1}/3)...")    

    # Interrupt pauses graph execution until Command(resume=...) is passed
    user_answer = interrupt({
        "type": "clarification_needed",
        "questions": questions,
        "attempt": attempts + 1,
        "reasoning": "Product details are insufficient to determine the statutory regulatory category under DCA/FSSAI."
    })
    
    if str(user_answer).strip().lower()=='guess':
        print("[user_ans] Forcing best-guess classification...")
        forced_category = await force_llm_classification(user_query, history)
        print(f"   Forced Category: -> {forced_category.upper()}")
        return {
            "formulation_category": forced_category,
            "needs_clarification": False,
            "clarification_questions": [],
            "clarification_attempts": attempts
        }

    # Execution resumes here once Command(resume=...) is passed!
    print(f"\n   [HITL Resumed]: Received user clarification answer: \"{user_answer}\"")

    new_history = list(state.get("clarification_history", []))
    new_history.append({
        "questions": questions,
        "answer": str(user_answer)
    })

    return {
        "clarification_history": new_history,
        "clarification_attempts": attempts + 1,
        "needs_clarification": False
    }

def route_classifier_flow(state: GraphState) -> str:
    """Decides whether to pause for clarification or finish classification."""
    if state.get("needs_clarification", False):
        return "clarification_pause"
    return "__end__"
