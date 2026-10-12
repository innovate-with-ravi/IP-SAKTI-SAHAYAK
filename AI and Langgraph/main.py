"""Test runner for IP-SAKTI Sahayak LangGraph workflow."""
import asyncio
from graph import app

async def main():
    initial_state = {
        "user_query": "Can I patent an Ayurvedic formulation of Triphala Churna for digestive disorders in India?",
        "chat_history": [],
        "jurisdiction": "IN",
        "language": "en"
    }

    print("Running initial graph test...")
    result = await app.ainvoke(initial_state)
    print("Execution completed.")
    print("Final State Result:", result)

if __name__ == "__main__":
    asyncio.run(main())
