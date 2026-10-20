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

def format_messages_history(messages: List[Any]) -> str:
    """Formats recent turns from messages into a clean string for the LLM."""
    if not messages:
        return "No prior conversation."
    
    formatted = []
    # Take up to the last 6 messages for context
    for msg in messages[-6:]:
        if hasattr(msg, "type"):
            role = "User" if msg.type in ("human", "user") else "Assistant"
            content = msg.content
        elif isinstance(msg, dict):
            role = msg.get("role", "user").capitalize()
            content = msg.get("content", "")
        else:
            role = "User"
            content = str(msg)
        formatted.append(f"{role}: {content}")
    return "\n".join(formatted)

async def agentic_router_node(state: GraphState) -> GraphState:
    """
    Analyzes prompt + conversation history to route traffic to Path A, B, or C.
    """
    user_query = state.get("user_query", "")
    messages = state.get("messages", [])
    
    if not user_query and messages:
        last_msg = messages[-1]
        user_query = last_msg.content if hasattr(last_msg, "content") else last_msg.get("content", "")

    # If the last message is the current query, history is everything before it
    history_messages = messages[:-1] if messages and user_query else messages
    history_str = format_messages_history(history_messages)

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
