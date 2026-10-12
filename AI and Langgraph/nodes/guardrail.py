"""Node: Guardrail & Intent Assessor."""
from core.state import GraphState

async def guardrail_assessor_node(state: GraphState) -> GraphState:
    """
    Evaluates user input to block out-of-scope requests (e.g. recipes, medical prescriptions, direct legal advice).
    """
    # TODO: Implement guardrail evaluation logic
    return {
        "is_safe": True,
        "guardrail_reason": None,
    }
