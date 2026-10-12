"""Node: Agentic Router (3-Way Split).

Evaluates user query and conversational history to dynamically route execution down:
- Path A: Direct to Generator (Memory-only follow-ups, e.g. "explain simply")
- Path B: Query Rewriter (Follow-ups needing retrieval, e.g. "how do I register it?")
- Path C: Formulation Classifier (New questions introducing formulations or regulatory queries)
Uses LangSmith Prompt Hub and resilient structured LLMs.
"""

from typing import List, Dict, Any, Literal
from pydantic import BaseModel, Field
from core.state import GraphState
from core.prompts import get_router_prompt
from core.llm import get_resilient_structured_model

class RouterOutput(BaseModel):
    """Structured output schema for routing decision."""
    route_path: Literal["path_a", "path_b", "path_c"] = Field(
        description=(
            "path_a: Conversational/memory-only follow-up that requires NO new database search (e.g. 'explain that simply'). "
            "path_b: Follow-up requiring database retrieval where pronouns or previous context must be resolved (e.g. 'how do I register it?'). "
            "path_c: New question introducing a new product, formulation, or regulatory query needing classification."
        )
    )
    reasoning: str = Field(
        description="One-line justification for the selected path."
    )

def format_chat_history(history: List[Dict[str, Any]]) -> str:
    """Formats recent turns from chat history into a clean string for the LLM."""
    if not history:
        return "No prior conversation."
    
    formatted = []
    # Take up to the last 5 messages for recency
    for msg in history[-5:]:
        role = msg.get("role", "user").capitalize()
        content = msg.get("content", "")
        formatted.append(f"{role}: {content}")
    return "\n".join(formatted)

async def agentic_router_node(state: GraphState) -> GraphState:
    """
    Analyzes prompt + conversation history to route traffic to Path A, B, or C.
    """
    user_query = state.get("user_query", "")
    chat_history = state.get("chat_history", [])
    history_str = format_chat_history(chat_history)

    # Pull prompt from LangSmith Prompt Hub
    prompt = get_router_prompt()
    model = get_resilient_structured_model(RouterOutput)
    chain = prompt | model

    try:
        result: RouterOutput = await chain.ainvoke({
            "user_query": user_query,
            "chat_history": history_str
        })
        route = result.route_path
        reasoning = result.reasoning
    except Exception as e:
        # Safe default for fresh queries if LLM call fails❌
        # Show Error to user on frontend!!! ✅
        route = "path_c"
        reasoning = f"Defaulted to path_c due to fallback & Error in chain-invoke: {e}"

    print("\n--- [NODE: agentic_router] Traffic Routing Decision ---")
    print(f"   Selected Route: -> {route.upper()}")
    print(f"   Reasoning:      {reasoning}")

    return {
        "route_path": route
    }
