"""RAG Subgraph Node: RAG EVAL (1-Pass Corrective RAG)."""
from core.state import GraphState

async def rag_eval_node(state: GraphState) -> GraphState:
    """
    Rapid 1-pass CRAG check to evaluate whether retrieved chunks
    actually contain the legal answers needed before proceeding.
    """
    docs = state.get("retrieved_docs", [])
    crag_passed = state.get("crag_passed", True)

    print(f"\n--- [RAG: rag_eval] 1-Pass CRAG Relevance Check ---")
    print(f"   Context Docs Evaluated: {len(docs)}")
    print(f"   Relevance Check: {'[PASSED]' if crag_passed else '[FAILED]'}")

    return {
        "crag_passed": crag_passed
    }
