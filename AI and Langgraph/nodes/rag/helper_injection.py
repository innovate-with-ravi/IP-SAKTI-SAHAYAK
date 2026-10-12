"""RAG Subgraph Node: Helper Injection."""
from core.state import GraphState

async def helper_injection_node(state: GraphState) -> GraphState:
    """
    Deterministic, non-LLM step that injects mandatory statutory compliance warnings
    (e.g. Section 3(p) TKDL bars, National Biodiversity Authority ABS rules)
    based strictly on formulation state and jurisdiction.
    """
    category = state.get("formulation_category", "classical")
    helper_warnings = state.get("helper_warnings") or [
        "MANDATORY STATUTORY BAR: Under Indian Patent Act Section 3(p), classical formulations documented in TKDL cannot be patented as new inventions.",
        "MANDATORY ABS COMPLIANCE: Commercial utilization of Indian biological resources requires prior approval from National Biodiversity Authority (NBA) under Biological Diversity Act Section 3."
    ]

    print(f"\n--- [RAG: helper_injection] Deterministic Statutory Compliance Injection ---")
    print(f"   Category: {category}")
    print(f"   Warnings Injected: {len(helper_warnings)}")
    for w in helper_warnings:
        print(f"   -> {w}")

    return {
        "helper_warnings": helper_warnings
    }
