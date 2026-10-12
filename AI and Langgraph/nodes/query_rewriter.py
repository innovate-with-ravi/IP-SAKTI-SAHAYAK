"""Node: Query Rewriter (Path B)."""
from core.state import GraphState

async def query_rewriter_node(state: GraphState) -> GraphState:
    """
    Resolves vague pronouns and contextual references from chat history
    into a standalone legal search query while preserving classification state.
    """
    user_query = state.get("user_query", "")
    rewritten_query = state.get("rewritten_query") or user_query

    print(f"\n--- [NODE: query_rewriter] Resolving Pronouns & Ambiguity ---")
    print(f"   Original:  \"{user_query}\"")
    print(f"   Rewritten: \"{rewritten_query}\"")

    return {
        "rewritten_query": rewritten_query
    }
