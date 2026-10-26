"""RAG Subgraph Node: Helper Injection.

Deterministic, non-LLM step that injects mandatory statutory compliance warnings
(e.g., Section 3(p) TKDL bars, National Biodiversity Authority ABS rules,
FSSAI Ayurveda Aahara prohibitions) based strictly on formulation category and jurisdiction.
"""

from typing import Dict, Any, List
from core.state import GraphState

STATUTORY_CATEGORY_RULES: Dict[str, List[str]] = {
    "classical": [
        "MANDATORY STATUTORY BAR: Under Indian Patents Act, 1970 Section 3(p), classical formulations documented in TKDL cannot be patented as new inventions.",
        "MANUFACTURING REGULATION: Must adhere to First Schedule authoritative texts (D&C Act 1940 Section 3(a)) and require Form 24-D manufacturing license with Schedule T GMP compliance."
    ],
    "proprietary": [
        "EFFICACY BURDEN: Under Patents Act Section 3(e), herbal admixtures must provide verifiable empirical proof of synergistic therapeutic efficacy beyond individual ingredient effects.",
        "MANDATORY ABS COMPLIANCE: Commercial utilization of Indian biological resources requires prior intimation to State Biodiversity Board (SBB) / NBA approval under Biological Diversity Act Section 3 & 7."
    ],
    "phytopharmaceutical": [
        "REGULATORY PATHWAY: Regulated under CDSCO Phytopharmaceutical Drug framework (D&C Rules Eighth Amendment, 2015), requiring pre-clinical safety, stability, and Phase I-III clinical trial documentation.",
        "PATENT & ABS CLEARANCE: Requires proof of enhanced efficacy under Patents Act Section 3(d) and mandatory NBA approval under Section 6 of Biological Diversity Act before patent grant."
    ],
    "aahar_food": [
        "DIETARY COMPLIANCE: Must comply with FSSAI (Ayurveda Aahara) Regulations, 2022. Only recipes from First Schedule texts or approved botanical food ingredients are permitted.",
        "PROHIBITION OF DRUG CLAIMS: Regulation 6 strictly prohibits synthetic vitamins/minerals, pure isolated chemical compounds, or medicinal therapeutic cure claims on product labels."
    ],
    "cosmetic": [
        "COSMETIC REGULATION: Must comply with Drugs & Cosmetics Rules (Part XIII) and Bureau of Indian Standards (BIS) specifications; therapeutic or medicinal claims are prohibited.",
        "IP PROTECTION: Protection is primarily available via Trademark brand names and Designs Act (bottle/container aesthetics)."
    ],
    "new_drug": [
        "NEW CHEMICAL ENTITY: Governed by New Drugs and Clinical Trials Rules, 2019. Full IND application and CT-06 clinical trial permissions are mandatory.",
        "PATENT CRITERIA: Standard criteria of Novelty, Inventive Step, and Industrial Applicability apply, subject to NBA Section 6 clearance if biological origin."
    ]
}

async def helper_injection_node(state: GraphState) -> Dict[str, Any]:
    """
    Deterministic helper injection.
    Examines route_path, user query context, and formulation_category to inject
    statutory compliance alerts only when relevant to product patenting/commercialization.
    """
    user_query = (state.get("rewritten_query") or state.get("user_query") or "").lower()
    route_path = state.get("route_path")

    # Distinguish general legal summaries / definition queries from formulation/product queries
    is_general_query = any(k in user_query for k in ["summary", "summarize", "overview", "what is", "explain", "history", "difference between", "define", "introduction", "tell me about"])
    is_formulation_or_patent = any(k in user_query for k in ["patent", "commercial", "manufactur", "license", "formulation", "product", "extract", "sell", "export", "market", "abs", "biodiversity", "tkdl", "trademark", "brand"])

    warnings: List[str] = []

    # Only inject category-specific mandatory rules when relevant to formulation/product commercialization or patent queries
    if route_path in ("path_c", "path_b") or (is_formulation_or_patent and not is_general_query):
        category = (state.get("formulation_category") or "").lower()
        if category in STATUTORY_CATEGORY_RULES:
            warnings = list(STATUTORY_CATEGORY_RULES[category])

    # Cross-cutting check: If selected namespaces include biodiversity_abs and user asks about biological resources
    selected_namespaces = state.get("selected_namespaces") or []
    if "biodiversity_abs" in selected_namespaces and any(k in user_query for k in ["abs", "biodiversity", "biological", "source", "nba", "access", "benefit"]):
        if not any("Biological Diversity Act" in w for w in warnings):
            warnings.append(
                "MANDATORY ABS COMPLIANCE: Commercial utilization of Indian biological resources requires prior approval from National Biodiversity Authority (NBA) under Biological Diversity Act Section 3 & 6."
            )

    print(f"\n--- [RAG: helper_injection] Context-Aware Statutory Compliance Injection ---")
    print(f"   Route Path: {route_path}")
    print(f"   Warnings Injected: {len(warnings)}")
    for w in warnings:
        print(f"   -> {w}")

    return {
        "helper_warnings": warnings
    }
