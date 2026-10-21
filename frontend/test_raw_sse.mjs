import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "http://127.0.0.1:2024" });

async function main() {
  const thread = await client.threads.create();
  console.log("Thread:", thread.thread_id);

  // Open SSE stream on /threads/{thread_id}/stream/events
  const streamRes = await fetch(`http://127.0.0.1:2024/threads/${thread.thread_id}/stream/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream"
    },
    body: JSON.stringify({
      channels: ["values", "messages"],
    })
  });

  const reader = streamRes.body.getReader();
  const decoder = new TextDecoder();

  // Start background command
  fetch(`http://127.0.0.1:2024/threads/${thread.thread_id}/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assistant_id: "ip_sakti_sahayak",
      input: {
        user_query: "Can I patent a classical formulation like Chyawanprash?",
        jurisdiction: "IN",
      }
    })
  }).catch(console.error);

  let buffer = "";
  let eventType = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        const dataStr = line.slice(5).trim();
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.method === "messages" || eventType === "messages") {
            console.log(`[SSE MESSAGES]: method=${parsed.method}, event=${parsed.params?.data?.event}, role=${parsed.params?.data?.role}, text=${parsed.params?.data?.text || ""}`);
          }
        } catch {
          // ignore
        }
      }
    }
  }
}

main().catch(console.error);
