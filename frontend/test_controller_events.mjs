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

  // Watch raw messages channel on controller
  const origHandleMessage = controller["rootMessages"]?.handleMessage || controller["#rootMessages"]?.handleMessage;
  console.log("RootMessages exists:", !!controller["rootMessages"]);

  controller.rootStore.subscribe(() => {
    const snap = controller.rootStore.getSnapshot();
    console.log(`[Store snapshot]: isLoading=${snap.isLoading}, msgsCount=${snap.messages.length}`);
    for (let i = 0; i < snap.messages.length; i++) {
      const m = snap.messages[i];
      const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
      console.log(`   [Msg ${i}]: type=${m.constructor?.name}, textLen=${text.length}, preview=${text.slice(0, 40)}`);
    }
  });

  await controller.submit({
    user_query: "Can I patent a classical formulation like Chyawanprash?",
    jurisdiction: "IN",
    messages: [{ role: "user", content: "Can I patent a classical formulation like Chyawanprash?" }]
  });

  await new Promise(r => setTimeout(r, 20000));
}

main().catch(console.error);
