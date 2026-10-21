# tests the frontend sdk using python code

import asyncio
from langgraph_sdk import get_client

async def main():
    client = get_client(url="http://127.0.0.1:2024")
    
    # 1. Create a thread
    thread = await client.threads.create()
    print("Created Thread ID:", thread["thread_id"])
    
    # 2. Run graph with ambiguous query
    run = await client.runs.create(
        thread_id=thread["thread_id"],
        assistant_id="ip_sakti_sahayak",
        input={
            "user_query": "I developed a concentrated botanical liquid from Ashwagandha and Giloy. Can I patent and sell it?",
            "jurisdiction": "IN",
            "language": "en"
        }
    )
    print("Run ID:", run["run_id"])
    
    # Wait for run to pause at interrupt
    run_status = await client.runs.join(thread_id=thread["thread_id"], run_id=run["run_id"])
    print("Run Status after join:", run_status)
    
    state = await client.threads.get_state(thread["thread_id"])
    print("\nInterrupt details:", state.get("tasks", [{}])[0].get("interrupts"))
    
    # Resume with user answer
    resume_run = await client.runs.create(
        thread_id=thread["thread_id"],
        assistant_id="ip_sakti_sahayak",
        command={
            "resume": "We purified a specific marker compound with 95% withanolides for therapeutic clinical trials in arthritis."
        }
    )
    print("\nResume Run ID:", resume_run["run_id"])
    resumed_status = await client.runs.join(thread_id=thread["thread_id"], run_id=resume_run["run_id"])
    print("Resumed Status:", resumed_status)
    
    final_state = await client.threads.get_state(thread["thread_id"])
    print("\nFinal State Values Keys:", list(final_state.get("values", {}).keys()))
    print("Category:", final_state.get("values", {}).get("formulation_category"))
    print("Final Answer Preview:", str(final_state.get("values", {}).get("final_answer"))[:200])

if __name__ == "__main__":
    asyncio.run(main())
