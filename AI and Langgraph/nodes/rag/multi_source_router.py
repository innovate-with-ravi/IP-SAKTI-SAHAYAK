"""RAG Subgraph Node: Multi-Source Router.

Routes the user inquiry across the 10 authoritative legal database namespaces:
1. patents (Patents Act 1970, Rules 2024, PCT, TRIPS)
2. designs (Designs Act 2000, Hague)
3. trademarks (Trade Marks Act 1999, Rules 2017, Madrid)
4. copyright (Copyright Act 1957, Rules 2013)
5. geographical_indications (GI Act 1999, Rules 2025)
6. plant_varieties (PPV&FR Act 2001)
7. biodiversity_abs (Biological Diversity Act 2023, Rules 2024/2025, Nagoya)
8. ayush_drug_regulations (Drugs & Cosmetics Act 1940 & Rules 1945)
9. fssai_ayurveda_aahara (Ayurveda Aahara Regulations 2022)
10. traditional_knowledge (AFI Parts I & II, API, TKDL)

Evaluates the specific user intent (e.g. bottle design vs patenting),
the formulation category, and jurisdiction to select 1 to 4 focused legal namespaces.
"""

from typing import List, Dict, Any, Literal
from pydantic import BaseModel, Field
from core.state import GraphState
from core.prompts import get_multi_source_router_prompt
from core.llm import get_resilient_structured_model

# 10 Authoritative Legal Namespaces
LegalNamespace = Literal[
    "patents",
    "designs",
    "trademarks",
    "copyright",
    "geographical_indications",
    "plant_varieties",
    "biodiversity_abs",
    "ayush_drug_regulations",
    "fssai_ayurveda_aahara",
    "traditional_knowledge"
]

class MultiSourceRouterOutput(BaseModel):
    """Structured output schema for legal namespace selection."""
    selected_namespaces: List[LegalNamespace] = Field(
        description="1 to 5 statutory legal namespaces strictly matching what the user query is asking."
    )
    reasoning: str = Field(
        description="Brief legal justification for selecting these namespaces."
    )

async def multi_source_router_node(state: GraphState) -> Dict[str, Any]:
    """
    Selects only the relevant legal namespaces/databases based on the user's specific intent,
    the formulation category, and jurisdiction to keep vector retrieval targeted.
    """
    query = state.get("rewritten_query") or state.get("user_query", "")
    category = state.get("formulation_category") or "general_ayurveda"
    jurisdiction = state.get("jurisdiction", "IN")

    prompt = get_multi_source_router_prompt()
    model = get_resilient_structured_model(MultiSourceRouterOutput)
    chain = prompt | model

    try:
        result: MultiSourceRouterOutput = await chain.ainvoke({
            "jurisdiction": jurisdiction,
            "formulation_category": category,
            "user_query": query
        })
        selected_namespaces = list(dict.fromkeys(result.selected_namespaces))  # ""Preserve order, deduplicate => list(dict.fromkeys(xyz))""
        reasoning = result.reasoning
    except Exception as e:
        print(f"[multi_source_router_node]: Error in chain invoke ({e}). Applying safe fallback.")
        if category == "classical":
            selected_namespaces = ["traditional_knowledge", "patents", "biodiversity_abs"]
        elif category == "aahar_food":
            selected_namespaces = ["fssai_ayurveda_aahara", "trademarks"]
        else:
            selected_namespaces = ["patents", "ayush_drug_regulations", "biodiversity_abs"]
        reasoning = f"Defaulted due to error: {e}"

    # Guardrail check: Ensure at least one namespace is selected
    if not selected_namespaces:
        selected_namespaces = ["patents", "ayush_drug_regulations"]

    print(f"\n--- [RAG: multi_source_router] Filtering Legal Corpora ---")
    print(f"   Jurisdiction:      {jurisdiction} | Category: {category}")
    print(f"   Target Namespaces: {selected_namespaces}")
    print(f"   Router Reasoning:  {reasoning}")

    return {
        "selected_namespaces": selected_namespaces
    }
