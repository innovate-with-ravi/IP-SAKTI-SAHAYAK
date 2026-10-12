"""Test runner for IP-SAKTI Sahayak LangGraph workflow."""
from langchain_core.runnables import RunnableConfig
import sys
import asyncio
from dotenv import load_dotenv

# Ensure UTF-8 output encoding on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Load environment variables for LangSmith Tracing & API keys
load_dotenv()

from graph import app

async def main():
    # ---------------------------------------------------------------------
    # Test Scenarios (Uncomment the one you wish to test):
    # ---------------------------------------------------------------------

    # SCENARIO 1: Legitimate Ayurvedic patent query (Path C -> RAG Subgraph -> Generator)
    initial_state = {
        # "user_query": "Can I patent an Ayurvedic formulation of Triphala Churna for digestive disorders in India?",
        "user_query": "Can you give me an authentic home recipe to prepare Amla chyawanprash for winter immunity?",
        "chat_history": [],
        "jurisdiction": "IN",
        "language": "en",
    }

    # SCENARIO 2: Out-of-scope request (Hypothetical Lawsuit / Recipe -> Early Exit to END)
    # initial_state = {
    #     "user_query": "How can I file a lawsuit against Dabur to sue them for infringing on ancient Chyawanprash recipes in court?",
    #     "chat_history": [],
    #     "jurisdiction": "IN",
    #     "language": "en",
    # }

    # SCENARIO 3: Follow-up query requiring retrieval (Path B: Query Rewriter -> RAG Subgraph -> Generator)
    # initial_state = {
    #     "user_query": "How do I register it?",
    #     "chat_history": [
    #         {"role": "user", "content": "I developed a new herbal cough syrup with standardized Adhatoda vasica extract."},
    #         {"role": "assistant", "content": "This falls under Ayurvedic Proprietary Medicine."}
    #     ],
    #     "jurisdiction": "IN",
    #     "language": "en",
    # }

    print("================================================================")
    print("🚀 STARTING IP-SAKTI SAHAYAK LANGGRAPH EXECUTION")
    print("================================================================")
    print(f"User Query:   {initial_state.get('user_query')}")
    print(f"Jurisdiction: {initial_state.get('jurisdiction')}")
    print("----------------------------------------------------------------")

    # Global Streaming Step-by-Step Execution
    final_state = {}
    config: RunnableConfig = {
        "run_name": "manual-testing-abstention(home recipe)"
    }

    async for chunk in app.astream(initial_state, stream_mode="updates", config=config):
        for node_name, state_update in chunk.items():
            print(f"\n[GLOBAL STEP COMPLETED]: Node '{node_name}'")
            final_state.update(state_update)

    print("\n================================================================")
    print("🏁 EXECUTION COMPLETE - FINAL SYNTHESIZED STATE")
    print("================================================================")
    print(f"Final Answer:     {final_state.get('final_answer')}")
    print(f"Confidence Score: {final_state.get('confidence_score')}")
    print(f"Citations:        {final_state.get('citations')}")
    print("================================================================")

if __name__ == "__main__":
    asyncio.run(main())
