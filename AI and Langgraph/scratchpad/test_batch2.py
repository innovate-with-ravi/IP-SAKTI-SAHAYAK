import os
import sys
import asyncio
from dotenv import load_dotenv

# Add project root to sys.path
sys.path.insert(0, r"d:\CODING\Hackathons\SIH\IP-SAKTI-SAHAYAK\AI and Langgraph")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()

from nodes.rag.multi_source_router import multi_source_router_node
from nodes.rag.query_refiner import query_refiner_node
from nodes.rag.db_search import async_db_search_node
from nodes.rag.helper_injection import helper_injection_node
from subgraphs.rag_subgraph import create_rag_subgraph
from nodes.generator import generator_node

test_cases = [
    {
        "name": "Case 1: Classical Patent Inquiry (Section 3(p) TKDL Bar)",
        "state": {
            "user_query": "Can I patent an Ayurvedic formulation of Triphala Churna for digestive disorders in India?",
            "formulation_category": "classical",
            "jurisdiction": "IN"
        }
    },
    {
        "name": "Case 2: Bottle Shape & Brand Name (Designs + Trademarks)",
        "state": {
            "user_query": "Can I protect my unique glass bottle shape and brand name for my classical Triphala oil?",
            "formulation_category": "classical",
            "jurisdiction": "IN"
        }
    },
    {
        "name": "Case 3: Ayurveda Aahar Food Bar (FSSAI Regulations 2022)",
        "state": {
            "user_query": "I developed an Ashwagandha protein energy bar for winter immunity, what licensing applies?",
            "formulation_category": "aahar_food",
            "jurisdiction": "IN"
        }
    }
]

async def run_tests():
    print("=" * 70)
    print("BATCH 2 TEST: RAG SUBGRAPH + GENERATOR END-TO-END")
    print("=" * 70)

    rag_subgraph = create_rag_subgraph()

    for idx, tc in enumerate(test_cases, start=1):
        print(f"\n>>>>>>>> RUNNING {tc['name']} <<<<<<<<")
        state = dict(tc["state"])

        # 1. Test Multi-Source Router
        r1 = await multi_source_router_node(state)
        state.update(r1)

        # 2. Test Query Refiner (with Semaphore(5))
        r2 = await query_refiner_node(state)
        state.update(r2)

        # 3. Test Async DB Search (Plan 2: Two-Tier Global Reranking + Semaphore(5))
        r3 = await async_db_search_node(state)
        state.update(r3)

        # 4. Test Helper Injection (Deterministic statutory rules)
        r4 = await helper_injection_node(state)
        state.update(r4)

        # 5. Test Generator Node
        gen_res = await generator_node(state)
        state.update(gen_res)

        print("\n--- [FINAL SYNTHESIZED RESULT] ---")
        print(f"Confidence Score: {state.get('confidence_score')}")
        print("Citations:")
        for c in state.get("citations", []):
            print(f"  * {c.get('statute')} - {c.get('section')}")
        print("\nAnswer Preview:")
        print(state.get("final_answer")[:400] + ("..." if len(state.get("final_answer", "")) > 400 else ""))
        print("-" * 70)

if __name__ == "__main__":
    asyncio.run(run_tests())
