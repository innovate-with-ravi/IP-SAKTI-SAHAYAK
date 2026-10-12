"""RAG Subgraph Node: Multi-Source Router."""
from core.state import GraphState

async def multi_source_router_node(state: GraphState) -> GraphState:
    """
    Selects only the relevant legal namespaces/databases based on formulation
    and jurisdiction to keep vector search space focused.
    """
    category = state.get("formulation_category", "classical")
    jurisdiction = state.get("jurisdiction", "IN")
    selected_namespaces = state.get("selected_namespaces") or [
        "patents_act_1970",
        "drugs_cosmetics_act_1940",
        "biodiversity_act_2002"
    ]

    print(f"\n--- [RAG: multi_source_router] Filtering Legal Corpora ---")
    print(f"   Jurisdiction: {jurisdiction} | Category: {category}")
    print(f"   Target Namespaces: {selected_namespaces}")

    return {
        "selected_namespaces": selected_namespaces
    }
