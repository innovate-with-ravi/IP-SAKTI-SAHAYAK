import asyncio
from langgraph_sdk import get_client

async def main():
    client = get_client(url="http://127.0.0.1:2024")
    thread = await client.threads.create()
    print("Created Thread ID:", thread["thread_id"])

    async for chunk in client.runs.stream(
        thread_id=thread["thread_id"],
        assistant_id="ip_sakti_sahayak",
        input={
            "user_query": "Can I patent a classical formulation like Chyawanprash?",
            "jurisdiction": "IN",
            "language": "en"
        },
        stream_mode=["messages", "updates"]
    ):
        if chunk.event == "messages/partial":
            # Print content of partial message
            msg = chunk.data[0] if isinstance(chunk.data, list) else chunk.data
            meta = chunk.data[1] if isinstance(chunk.data, list) and len(chunk.data) > 1 else {}
            node = meta.get("langgraph_node")
            content = msg.get("content", "")
            if node == "generator":
                print(f"[GEN TOKEN]: {repr(content)[:40]}")
        elif chunk.event == "updates":
            print(f"[UPDATE]: {list(chunk.data.keys())}")

if __name__ == "__main__":
    asyncio.run(main())
