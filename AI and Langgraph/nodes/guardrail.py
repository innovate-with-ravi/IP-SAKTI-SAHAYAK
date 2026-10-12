"""Node: Guardrail & Intent Assessor.

Evaluates incoming user queries to ensure safe abstention and block out-of-scope requests
(e.g., medical diagnoses, recipes, home remedies, personal treatments).
Uses LangSmith Prompt Hub and resilient structured LLMs.
"""

from typing import Optional
from pydantic import BaseModel, Field
from core.state import GraphState
from core.prompts import get_guardrail_prompt
from core.llm import get_resilient_structured_model

# From the description of `guardrail_reason` it is clear that `guardrail_reason` is a user friendly explanation So we don't need to Go to the generator node to waste the tokens, instead we can directly display the guardrail reason to the user. Or why do you think that going to `generater`  node is necessary even after getting the user friendly guardrail reason? Change the graph structure according to the best choice.

class GuardrailOutput(BaseModel):
    """Structured output schema for query safety screening in guardrail-node."""
    is_safe: bool = Field(
        description="True if query is related to Ayurvedic IPR, patents, regulations, ABS, or TKDL. False if out of scope."
    )
    guardrail_reason: Optional[str] = Field(
        default=None,
        description="Clear, user-friendly explanation when a query is blocked or out of scope."
    )

async def guardrail_assessor_node(state: GraphState) -> GraphState:
    """
    Evaluates user input to block out-of-scope requests.
    If blocked, records reason and passes directly to generator for safe abstention.
    """
    user_query = state.get("user_query", "")

    # Pull prompt from LangSmith Prompt Hub
    prompt = get_guardrail_prompt()
    model = get_resilient_structured_model(GuardrailOutput)
    chain = prompt | model

    # Execute structured screening
    try:
        result: GuardrailOutput = await chain.ainvoke({"user_query": user_query})
        is_safe = result.is_safe
        reason = result.guardrail_reason
    except Exception as e:
        # Fallback safe pass if network issue occurs ❌
        # Show Error to user on frontend!!! ✅
        is_safe = True
        reason = None

    print("\n--- [NODE: guardrail] Evaluating query safety ---")
    print(f"   Query: \"{user_query}\"")
    print(f"   Status: {'[SAFE]' if is_safe else '[BLOCKED]'} (Reason: {reason})")

    return {
        "is_safe": is_safe,
        "guardrail_reason": reason,
    }
