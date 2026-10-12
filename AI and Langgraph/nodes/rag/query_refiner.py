"""RAG Subgraph Node: Query Refiner."""
from core.state import GraphState

async def query_refiner_node(state: GraphState) -> GraphState:
    """
    Translates user intent into distinct semantic search queries
    tailored specifically to how each selected legal corpus is written.
    """
    selected_namespaces = state.get("selected_namespaces", ["patents_act_1970"])
    base_query = state.get("rewritten_query") or state.get("user_query", "")
    
    refined_queries = state.get("refined_queries") or {
        ns: f"{base_query} [statutory keywords for {ns}]" for ns in selected_namespaces
    }

    print(f"\n--- [RAG: query_refiner] Semantic Query Specialization ---")
    for ns, q in refined_queries.items():
        print(f"   -> [{ns}]: \"{q}\"")

    return {
        "refined_queries": refined_queries
    }
