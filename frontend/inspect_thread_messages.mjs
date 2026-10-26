import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "http://127.0.0.1:2024" });

async function main() {
  const threads = await client.threads.search({ limit: 1 });
  if (!threads.length) return;
  const threadId = threads[0].thread_id;
  console.log("Checking thread:", threadId);
  const state = await client.threads.getState(threadId);
  console.log("State values keys:", Object.keys(state.values));
  console.log("Number of messages in state:", state.values.messages?.length);
  for (let i = 0; i < (state.values.messages?.length || 0); i++) {
    const m = state.values.messages[i];
    console.log(`Msg ${i}: type=${m.type || m.role}, name=${m.name}, content=${JSON.stringify(m.content).slice(0, 60)}, tool_calls=${m.tool_calls?.length}`);
  }
}

main().catch(console.error);
