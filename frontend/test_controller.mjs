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

  let messageUpdates = 0;
  controller.rootStore.subscribe(() => {
    const snap = controller.rootStore.getSnapshot();
    const lastMsg = snap.messages[snap.messages.length - 1];
    messageUpdates++;
    const content = typeof lastMsg?.content === "string" ? lastMsg.content : JSON.stringify(lastMsg?.content || "");
    console.log(`[Store update #${messageUpdates}]: isLoading=${snap.isLoading}, messagesCount=${snap.messages.length}, lastMsgType=${lastMsg?.constructor?.name}, contentPreview=${content.slice(0, 80)}`);
  });

  console.log("Submitting query...");
  await controller.submit({
    user_query: "Can I patent a classical formulation like Chyawanprash?",
    jurisdiction: "IN",
    messages: [{ role: "user", content: "Can I patent a classical formulation like Chyawanprash?" }]
  });

  // Keep running for 40 seconds to watch updates
  await new Promise(r => setTimeout(r, 40000));
  console.log("Finished waiting.");
}

main().catch(console.error);
