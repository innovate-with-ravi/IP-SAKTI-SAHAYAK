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

test_cases = [
    {
        "name": "Case 1: Classical Patent Inquiry",
        "state": {
            "user_query": "Can I patent an Ayurvedic formulation of Triphala Churna for digestive disorders in India?",
            "formulation_category": "classical",
            "jurisdiction": "IN"
        }
    },
    {
        "name": "Case 2: The Bottle Shape & Brand Name Edge Case (Designs + Trademarks)",
        "state": {
            "user_query": "Can I protect my unique glass bottle shape and brand name for my classical Triphala oil?",
            "formulation_category": "classical",
            "jurisdiction": "IN"
        }
    },
    {
        "name": "Case 3: Ayurveda Aahar Food Bar",
        "state": {
            "user_query": "I developed an Ashwagandha protein energy bar for winter immunity, what licensing applies?",
            "formulation_category": "aahar_food",
            "jurisdiction": "IN"
        }
    },
    {
        "name": "Case 4: Geographical Indication (GI Tag)",
        "state": {
            "user_query": "How can our farming cooperative register a Geographical Indication for Navara rice?",
            "formulation_category": "classical",
            "jurisdiction": "IN"
        }
    },
    {
        "name": "Case 5: Phytopharmaceutical Drug",
        "state": {
            "user_query": "We isolated a standardized 95% withanolides extract for clinical arthritis trials. Can we patent it?",
            "formulation_category": "phytopharmaceutical",
            "jurisdiction": "IN"
        }
    }
]

async def run_tests():
    for tc in test_cases:
        print("=" * 75)
        print(f"TEST: {tc['name']}")
        print(f"Query: \"{tc['state']['user_query']}\"")
        print("=" * 75)
        router_res = await multi_source_router_node(tc["state"])
        tc["state"].update(router_res)
        refiner_res = await query_refiner_node(tc["state"])
        tc["state"].update(refiner_res)
        print()

if __name__ == "__main__":
    asyncio.run(run_tests())
