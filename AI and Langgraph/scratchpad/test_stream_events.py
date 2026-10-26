import asyncio
from langgraph_sdk import get_client

async def main():
    client = get_client(url="http://127.0.0.1:2024")
    thread = await client.threads.create()
    print("Created Thread ID:", thread["thread_id"])

    gen_messages = 0
    async for chunk in client.runs.stream(
        thread_id=thread["thread_id"],
        assistant_id="ip_sakti_sahayak",
        input={
            "user_query": "Can I patent a classical formulation like Chyawanprash?",
            "jurisdiction": "IN",
            "language": "en"
        },
        stream_mode=["messages", "values"]
    ):
        if chunk.event == "messages/metadata":
            meta = list(chunk.data.values())[0]["metadata"]
            print(f"\n[MODEL START IN NODE]: {meta.get('langgraph_node')}")
        elif chunk.event == "messages/partial":
            # Check content of partial message
            msg = chunk.data[0] if isinstance(chunk.data, list) else chunk.data
            content = msg.get("content", "")
            if content:
                print(content, end="", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
