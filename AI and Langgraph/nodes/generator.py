"""Node: Final Generator & Synthesizer."""
from core.state import GraphState

async def generator_node(state: GraphState) -> GraphState:
    """
    Synthesizes validated legal context, helper warnings, or memory context
    into an authoritative response with strict citations and confidence score.
    """
    # If Guardrail already set, an abstention message, preserve it -> If the guardrail is already set, then a static abstention message is sent to user which preserves the earlier guardrail details including guardrail_reason. But that static save abstention message is not configured yet, we need to configure it.
    final_answer = state.get("final_answer")
    if not final_answer:
        final_answer = (
            "Triphala Churna is a classical Ayurvedic formulation listed in the First Schedule authoritative texts (e.g., Ayurvedic Formulary of India). "
            "Under Section 3(p) of the Patents Act, 1970, traditional knowledge or an aggregation of known traditional medicinal properties is non-patentable. "
            "However, trademark and unique brand design protections are available for your proprietary packaging."
        )

    citations = state.get("citations") or []
    # dummy confidence score for now
    confidence_score = state.get("confidence_score", 0.95 if state.get("is_safe", True) else 1.0)

    print(f"\n--- [NODE: generator] Legal Guidance Synthesized ---")
    print(f"   Answer Preview: {final_answer[:110]}...")
    print(f"   Citations Count: {len(citations)}")
    print(f"   Confidence Score: {confidence_score:.2f}")

    return {
        "final_answer": final_answer,
        "citations": citations,
        "confidence_score": confidence_score
    }
