"""RAG Subgraph definition (Scatter-Gather Core)."""
from langgraph.graph import StateGraph, START, END
from core.state import GraphState
from nodes.rag.multi_source_router import multi_source_router_node
from nodes.rag.query_refiner import query_refiner_node
from nodes.rag.db_search import async_db_search_node
from nodes.rag.rag_eval import rag_eval_node
from nodes.rag.helper_injection import helper_injection_node

def create_rag_subgraph() -> StateGraph:
    """
    Builds the scatter-gather RAG Subgraph:
    Multi-Source Router -> Query Refiner -> Async DB Search -> RAG EVAL -> Helper Injection.
    """
    subgraph = StateGraph(GraphState)

    subgraph.add_node("multi_source_router", multi_source_router_node)
    subgraph.add_node("query_refiner", query_refiner_node)
    subgraph.add_node("async_db_search", async_db_search_node)
    subgraph.add_node("rag_eval", rag_eval_node)
    subgraph.add_node("helper_injection", helper_injection_node)

    subgraph.add_edge(START, "multi_source_router")
    subgraph.add_edge("multi_source_router", "query_refiner")
    subgraph.add_edge("query_refiner", "async_db_search")
    # rag_eval temporarily bypassed per user request to test direct generation
    subgraph.add_edge("async_db_search", "helper_injection")
    subgraph.add_edge("helper_injection", END)

    return subgraph.compile()
