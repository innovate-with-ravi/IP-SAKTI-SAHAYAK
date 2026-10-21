import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "http://127.0.0.1:2024" });

async function main() {
  const thread = await client.threads.create();
  console.log("Created Thread:", thread.thread_id);

  console.log("Submitting run...");
  const stream = client.runs.stream(thread.thread_id, "ip_sakti_sahayak", {
    input: {
      user_query: "Can I patent a classical formulation like Chyawanprash?",
      jurisdiction: "IN",
      language: "en",
    },
    streamMode: ["messages", "values", "updates"],
  });

  for await (const chunk of stream) {
    if (chunk.event === "messages") {
      console.log(`[messages event]:`, JSON.stringify(chunk.data).slice(0, 150));
    }
  }
}

main().catch(console.error);
