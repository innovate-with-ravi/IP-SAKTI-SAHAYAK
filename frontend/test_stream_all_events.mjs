import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "http://127.0.0.1:2024" });

async function main() {
  const thread = await client.threads.create();
  console.log("Created thread:", thread.thread_id);

  const stream = client.runs.stream(thread.thread_id, "ip_sakti_sahayak", {
    input: {
      user_query: "Can I patent Chyawanprash?",
      jurisdiction: "IN",
      messages: [{ role: "user", content: "Can I patent Chyawanprash?" }]
    },
    streamMode: ["messages", "values", "updates", "custom"]
  });

  for await (const chunk of stream) {
    if (chunk.event === "messages/partial") {
      const data = chunk.data;
      console.log(`[messages/partial]: len=${data.length}, lastChunk=${JSON.stringify(data[0]?.content || "").slice(0, 50)}`);
    } else if (chunk.event === "messages/complete") {
      console.log(`[messages/complete]: ${JSON.stringify(chunk.data[0]?.content || "").slice(0, 50)}`);
    } else if (chunk.event === "values") {
      console.log(`[values]: hasFinalAnswer=${!!chunk.data?.final_answer}`);
    } else {
      console.log(`[${chunk.event}]: ${JSON.stringify(chunk.data).slice(0, 80)}`);
    }
  }
}

main().catch(console.error);
