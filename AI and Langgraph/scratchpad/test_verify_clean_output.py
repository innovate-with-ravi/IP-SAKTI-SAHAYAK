import asyncio
from langgraph_sdk import get_client

async def test_query(client, title, query):
    print(f"\n==========================================")
    print(f"TEST: {title}")
    print(f"QUERY: {query}")
    print(f"==========================================")
    thread = await client.threads.create()
    res = await client.runs.wait(
        thread_id=thread["thread_id"],
        assistant_id="ip_sakti_sahayak",
        input={"user_query": query, "jurisdiction": "IN"}
    )
    state = await client.threads.get_state(thread["thread_id"])
    vals = state.get("values", {})
    print(f"Route Path: {vals.get('route_path')}")
    print(f"Helper Warnings Count: {len(vals.get('helper_warnings') or [])}")
    print(f"Helper Warnings: {vals.get('helper_warnings')}")
    print(f"Citations Count: {len(vals.get('citations') or [])}")
    for c in (vals.get('citations') or []):
        print(f"  - Statute: {c.get('statute')} | Section: {c.get('section')}")
    print(f"Final Answer Preview: {(vals.get('final_answer') or '')[:120]}...")

async def main():
    client = get_client(url="http://127.0.0.1:2024")
    # Test 1: Summary query (should NOT have compliance warnings or fake citations)
    await test_query(client, "General Legal Summary", "Give me a summary of Patents Act 1970")
    # Test 2: Classical Formulation query (SHOULD have TKDL mandatory bar)
    await test_query(client, "Classical Formulation Patent", "Can I patent a classical formulation like Chyawanprash?")

if __name__ == "__main__":
    asyncio.run(main())
