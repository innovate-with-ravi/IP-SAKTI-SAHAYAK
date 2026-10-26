"""Test runner for IP-SAKTI Sahayak LangGraph workflow using v3 Event Streaming."""
import sys
import asyncio
from dotenv import load_dotenv
from langchain_core.runnables import RunnableConfig
from langgraph.types import Command

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Load environment variables for LangSmith Tracing & API keys
load_dotenv()

from langsmith import traceable

from graph import build_graph
from core.checkpointer import get_checkpointer

# Local runner instance compiled with postgres/in-memory checkpointer for interrupt/resume testing
app = build_graph(checkpointer=get_checkpointer())

@traceable # add @traceable on a parent function/runnable/component to get the unified tracing for all child ones
async def run_scenario(scenario_name: str, initial_state: dict, simulated_clarifications: list = None):
    """
    Executes a graph run using v3 Event Streaming.
    Uses the canonical `while True` loop to handle 0, 1, or multiple interrupts seamlessly.
    Decorated with @traceable to unify pre-interrupt and post-resume executions into a single LangSmith trace.

    - arguments:
      - simulated_clarifications: list = A list of clarifying answers(one ans for each attempt), one entry in this list represents a clarifying answer for one attempt  
    """
    print("=" * 70)
    print(f"🚀 RUNNING: {scenario_name}")
    print("=" * 70)
    print(f"User Query:   {initial_state.get('user_query')}")
    print(f"Jurisdiction: {initial_state.get('jurisdiction')}")
    print("-" * 70)

    thread_id = f"thread-{scenario_name.lower().replace(' ', '-')}"
    config: RunnableConfig = {
        "configurable": {"thread_id": thread_id},
        "run_name": f"test-{scenario_name.lower().replace(' ', '-')}"
    }

    stream_input = initial_state
    clarification_queue = list(simulated_clarifications or [])

    # The canonical HITL Loop: continues streaming & resuming until interrupted() is False
    while True:
        # 1. Execute or Resume with v3 Event Streaming
        stream = await app.astream_events(stream_input, config=config, version="v3")

        # 2. Check if the graph finished cleanly (no pause)
        if not await stream.interrupted():
            output = await stream.output()
            break

        # 3. Handle Human-In-The-Loop Interrupt
        interrupts = await stream.interrupts()
        payload = interrupts[0].value
        print("\n" + "!" * 70)
        print("⏸️  GRAPH PAUSED: Human-In-The-Loop Clarification Needed")
        print("!" * 70)
        print(f"Attempt:   {payload.get('attempt')}/3")
        print(f"Reasoning: {payload.get('reasoning')}")
        print("\nClarifying Questions:")
        for idx, q in enumerate(payload.get("questions", []), 1):
            print(f"  {idx}. {q}")
        print("-" * 70)

        # 4. Provide clarification (pull next from simulated queue or fallback)
        if clarification_queue:
            answer = clarification_queue.pop(0)
        else:
            answer = "We purified a specific marker compound with 95% withanolides for therapeutic clinical trials in arthritis."
        
        print(f"💬 Submitting User Clarification:\n\"{answer}\"\n")

        # 5. Set up Command for the next iteration of the loop!
        stream_input = Command(resume=answer)

    # Final state inspection
    print("\n" + "=" * 70)
    print("🏁 EXECUTION COMPLETE - FINAL STATE")
    print("=" * 70)
    print(f"Is Safe:               {output.get('is_safe')}")
    print(f"Route Path:            {output.get('route_path')}")
    print(f"Formulation Category:  {output.get('formulation_category')}")
    print(f"Rewritten Query:       {output.get('rewritten_query')}")
    print(f"Clarification Attempts:{output.get('clarification_attempts')}")
    print(f"Guardrail Reason:      {output.get('guardrail_reason')}")
    print(f"Final Answer:          {output.get('final_answer')}")
    print("=" * 70 + "\n")

    # Order keys so final_answer and messages appear first in LangSmith's root run preview
    return {
        "final_answer": output.get("final_answer"),
        "messages": output.get("messages"),
        **{k: v for k, v in output.items() if k not in ("final_answer", "messages")}
    }

async def main():
    # SCENARIO 1: Ambiguous botanical formulation (Path C -> HITL Interrupt -> User Clarification -> phytopharmaceutical -> RAG)
    await run_scenario(
        scenario_name="Scenario 1: Ambiguous Formulation (HITL Pause & Resume)",
        initial_state={
            "user_query": "I developed a concentrated botanical liquid from Ashwagandha and Giloy. Can I patent and sell it?",
            "messages": [
                {"role": "user", "content": "I developed a concentrated botanical liquid from Ashwagandha and Giloy. Can I patent and sell it?"}
            ],
            "jurisdiction": "IN",
            "language": "en",
        },
        simulated_clarifications=[
            "We purified a specific marker compound with 95% withanolides for therapeutic clinical trials in arthritis."
        ],
        # pyrefly: ignore [unexpected-keyword]
        langsmith_extra={"name": "Scenario 1: Ambiguous Formulation (HITL Pause & Resume)"}
    )

    # SCENARIO 2: Out-of-Scope Query (Guardrail Block -> Early Exit straight to END)
    await run_scenario(
        scenario_name="Scenario 2: Out-of-Scope Query (Guardrail Early Exit)",
        initial_state={
            "user_query": "Can you give me an authentic home recipe to prepare Amla chyawanprash for winter immunity?",
            "messages": [
                {"role": "user", "content": "Can you give me an authentic home recipe to prepare Amla chyawanprash for winter immunity?"}
            ],
            "jurisdiction": "IN",
            "language": "en",
        },
        # pyrefly: ignore [unexpected-keyword]
        langsmith_extra={"name": "Scenario 2: Out-of-Scope Query (Guardrail Early Exit)"}
    )

    # SCENARIO 3: Follow-up query requiring retrieval (Path B: Query Rewriter -> RAG Subgraph -> Generator)
    await run_scenario(
        scenario_name="Scenario 3: Contextual Follow-up (Path B Query Rewriter)",
        initial_state={
            "user_query": "How do I register it?",
            "messages": [
                {"role": "user", "content": "I developed a new herbal cough syrup with standardized Adhatoda vasica extract."},
                {"role": "assistant", "content": "This falls under Ayurvedic Proprietary Medicine."},
                {"role": "user", "content": "How do I register it?"}
            ],
            "jurisdiction": "IN",
            "language": "en",
        },
        # pyrefly: ignore [unexpected-keyword]
        langsmith_extra={"name": "Scenario 3: Contextual Follow-up (Path B Query Rewriter)"}
    )

if __name__ == "__main__":
    asyncio.run(main())
