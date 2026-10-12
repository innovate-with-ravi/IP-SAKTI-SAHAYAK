"""Node: Agentic Router (3-Way Split)."""
from core.state import GraphState

async def agentic_router_node(state: GraphState) -> GraphState:
    """
    Analyzes prompt + short-term memory to route traffic:
    Path A (Direct to Generator), Path B (Query Rewriter), Path C (Formulation Classifier).
    """
    route = state.get("route_path")
    if not route:
        # Default to Path C for new formulation queries
        route = "path_c"

    print(f"\n--- [NODE: agentic_router] Traffic Routing Decision ---")
    print(f"   Selected Route: -> {route.upper()}")

    return {
        "route_path": route
    }
