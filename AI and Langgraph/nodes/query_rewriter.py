### CHECK THE CODE ONCE

"""Node: Query Rewriter (Path B).

Acts as an intent extractor resolving ambiguous pronouns ("it", "this", "my product")
and historical context from chat history into a standalone, search-ready legal query
suitable for vector search across official acts, schedules, and registries.
Uses LangSmith Prompt Hub and resilient structured LLMs.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from core.state import GraphState
from core.prompts import get_query_rewriter_prompt
from core.llm import get_resilient_structured_model

class QueryRewriterOutput(BaseModel):
    """Structured output schema for rewritten legal query."""
    rewritten_query: str = Field(
        description="Self-contained, standalone legal search query resolving all pronouns and previous context."
    )
    resolved_references: Optional[str] = Field(
        default=None,
        description="Brief explanation of the pronouns or historical references that were resolved."
    )

def format_messages_history(messages: List[Any]) -> str:
    """Formats recent turns from messages into a clean string for the LLM."""
    if not messages:
        return "No prior conversation."

    formatted = []
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

async def query_rewriter_node(state: GraphState) -> GraphState:
    """
    Resolves vague pronouns and contextual references from conversation history
    into a standalone legal search query while preserving classification state.
    """
    user_query = state.get("user_query", "")
    messages = state.get("messages", [])
    
    if not user_query and messages:
        last_msg = messages[-1]
        user_query = last_msg.content if hasattr(last_msg, "content") else last_msg.get("content", "")

    formulation_category = state.get("formulation_category") or "Not specified"
    # This messages array from Langsmith Studio includes the even the latest user query So if both messages and user query are present, that is in case we invoke the graph from main.py file, then we exclude the last message in history messages array
    history_messages = messages[:-1] if messages and user_query else messages
    history_str = format_messages_history(history_messages)

    # Pull prompt from LangSmith Prompt Hub
    prompt = get_query_rewriter_prompt()
    model = get_resilient_structured_model(QueryRewriterOutput)
    chain = prompt | model

    try:
        result: QueryRewriterOutput = await chain.ainvoke({ # Don't we need to use astream instead of ainvoke to make it feel continuous to user
            "user_query": user_query,
            "chat_history": history_str,
            "formulation_category": formulation_category
        })
        rewritten_query = result.rewritten_query
        resolved_refs = result.resolved_references
    except Exception as e:
        print(f"[query_rewriter_node]: Error in chain invoke ({e}). Fallback to original query.")
        rewritten_query = user_query
        resolved_refs = None

    print("\n--- [NODE: query_rewriter] Resolving Pronouns & Ambiguity ---")
    print(f"   Original:  \"{user_query}\"")
    print(f"   Rewritten: \"{rewritten_query}\"")
    if resolved_refs:
        print(f"   Resolved:  {resolved_refs}")

    return {
        "rewritten_query": rewritten_query
    }
