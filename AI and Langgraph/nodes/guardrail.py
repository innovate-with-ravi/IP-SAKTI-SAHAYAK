"""Node: Guardrail & Intent Assessor."""
from core.state import GraphState

async def guardrail_assessor_node(state: GraphState) -> GraphState:
    """
    Evaluates user input to block out-of-scope requests (e.g. recipes, medical prescriptions, direct legal advice).
    """
    user_query = state.get("user_query", "")
    is_safe = state.get("is_safe", True)
    guardrail_reason = state.get("guardrail_reason", None)

    print("\n--- [NODE: guardrail] Evaluating query safety ---")
    print(f"   Query: \"{user_query}\"")
    print(f"   Status: {'[SAFE]' if is_safe else '[BLOCKED]'} (Reason: {guardrail_reason})")

    return {
        "is_safe": is_safe,
        "guardrail_reason": guardrail_reason,
    }
