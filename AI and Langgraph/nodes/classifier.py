"""Node: Formulation Classifier & Clarifier (Path C)."""
from core.state import GraphState

async def formulation_classifier_node(state: GraphState) -> GraphState:
    """
    Acts as a state machine / human-in-the-loop clarifier to classify
    Ayurvedic product (Classical vs. Proprietary vs. Phytopharmaceutical vs. Food vs. Cosmetic).
    """
    formulation_category = state.get("formulation_category", "classical")
    needs_clarification = state.get("needs_clarification", False)
    clarification_questions = state.get("clarification_questions", [])

    print(f"\n--- [NODE: formulation_classifier] Ayurvedic Product Categorization ---")
    print(f"   Category: -> {formulation_category.upper()}")
    print(f"   Needs Clarification: {needs_clarification}")
    if needs_clarification and clarification_questions:
        print(f"   Clarifying Questions: {clarification_questions}")

    return {
        "needs_clarification": needs_clarification,
        "clarification_questions": clarification_questions,
        "formulation_category": formulation_category
    }
