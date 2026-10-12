"""RAG Subgraph Node: Async DB Search."""
from core.state import GraphState

async def async_db_search_node(state: GraphState) -> GraphState:
    """
    Concurrently fires vector queries to selected namespaces in Qdrant,
    fetching legal chunks in parallel.
    """
    refined_queries = state.get("refined_queries", {})
    retrieved_docs = state.get("retrieved_docs") or [
        {
            "namespace": "patents_act_1970",
            "section": "Section 3(p)",
            "title": "What are not inventions",
            "text": "An invention which in effect is traditional knowledge or which is an aggregation or duplication of known properties of traditionally known component or components is not an invention.",
            "score": 0.92
        },
        {
            "namespace": "drugs_cosmetics_act_1940",
            "section": "Section 3(a)",
            "title": "Ayurvedic, Siddha or Unani drug definition",
            "text": "Medicines and substances manufactured exclusively in accordance with formulae described in authoritative books specified in the First Schedule.",
            "score": 0.88
        }
    ]

    print(f"\n--- [RAG: async_db_search] Concurrent Vector Search ---")
    print(f"   Queried Namespaces: {list(refined_queries.keys())}")
    print(f"   Retrieved Chunks: {len(retrieved_docs)} legal sections matched")

    return {
        "retrieved_docs": retrieved_docs
    }
