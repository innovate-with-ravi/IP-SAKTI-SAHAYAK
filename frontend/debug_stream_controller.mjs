import { StreamController } from "@langchain/langgraph-sdk/stream";
import { Client } from "@langchain/langgraph-sdk";

const client = new Client({ apiUrl: "http://127.0.0.1:2024" });

const controller = new StreamController({
  assistantId: "ip_sakti_sahayak",
  client,
  apiUrl: "http://127.0.0.1:2024",
});

async function main() {
  controller.activate();

  let updateNum = 0;
  controller.rootStore.subscribe(() => {
    updateNum++;
    const snap = controller.rootStore.getSnapshot();
    const msgs = snap.messages;
    console.log(`[Store #${updateNum}]: isLoading=${snap.isLoading}, msgsLen=${msgs.length}`);
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      const preview = typeof m.content === "string" ? m.content.slice(0, 40) : JSON.stringify(m.content).slice(0, 40);
      console.log(`    m[${i}] (${m.constructor?.name || m.type || m.role}): ${preview}`);
    }
  });

  console.log("Submitting query...");
  await controller.submit({
    user_query: "Can I patent Chyawanprash?",
    jurisdiction: "IN",
    messages: [{ role: "user", content: "Can I patent Chyawanprash?" }]
  });

  // Wait 30 seconds
  await new Promise(r => setTimeout(r, 30000));
}

main().catch(console.error);
