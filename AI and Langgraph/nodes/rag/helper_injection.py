"""RAG Subgraph Node: Helper Injection."""
from core.state import GraphState

async def helper_injection_node(state: GraphState) -> GraphState:
    """
    Deterministic, non-LLM step that injects mandatory statutory compliance warnings
    (e.g. Section 3(p) TKDL bars, National Biodiversity Authority ABS rules)
    based strictly on formulation state and jurisdiction.
    """
    # TODO: Implement deterministic helper warnings lookup
    return {
        "helper_warnings": []
    }
