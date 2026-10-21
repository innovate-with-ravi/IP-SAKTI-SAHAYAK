import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { setUser, useUser } from "./auth";
import { API_BASE_URL } from "./services/api";

import { useStream } from "@langchain/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ClarificationCard } from "./components/ClarificationCard";
import { ThinkingPipeline, type PipelineState } from "./components/ThinkingPipeline";
import { AlertTriangle } from "lucide-react";

type Juris = "India" | "International";
type Conf = "High" | "Medium" | "Low";

type Reply = {
  intro: string;
  items?: [string, string][];
  outro?: string;
  cite?: string;
  conf: Conf;
  warnings?: string[];
  category?: string;
  namespaces?: string[];
};
type Msg = {
  id: string;
  role: "user" | "bot";
  time: string;
  text?: string;
  reply?: Reply;
  juris?: Juris;
  pipelineState?: PipelineState;
  // contains the latest values of pipelineState acc. to the latest msg. arrived
};
type Chat = { id: string; title: string; msgs: Msg[] };

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecCtor = new () => SpeechRec;

const STORE = "ipsakti-chats";
const LANGS = [
  { name: "English", code: "EN", bcp: "en-IN" },
  { name: "हिन्दी", code: "HI", bcp: "hi-IN" },
  { name: "मराठी", code: "MR", bcp: "mr-IN" },
  { name: "தமிழ்", code: "TA", bcp: "ta-IN" },
  { name: "ਪੰਜਾਬੀ", code: "PA", bcp: "pa-IN" },
];
const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const paths = {
  plus: <path d="M12 5v14M5 12h14" />,
  newchat: <path d="M5.9 4v5.6M3 6.8h5.8M11 6.8h9.6V17H17v2.7L15 17H5.9v-5" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  chev: <path d="m6 9 6 6 6-6" />,
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12Z" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></>,
  send: <path d="M21 3 10 14M21 3l-7 18-4-7-7-4 18-7Z" />,
  spark: <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" fill="currentColor" />,
  menu: <path d="M4 8h16M4 16h16" />,
  file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></>,
  out: <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" />,
};
function Ic({ n, s = 18 }: { n: keyof typeof paths; s?: number }): ReactNode {
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[n]}</svg>;
}

function reply(q: string, j: Juris): Reply {
  const t = q.toLowerCase();
  const intl = j === "International";
  if (/patent|formulation|novel|prior art|tkdl/.test(t))
    return intl
      ? { conf: "High", intro: "Internationally, novelty is judged against global prior art, and TKDL records are shared with major patent offices (EPO, USPTO, JPO, IP Australia).", items: [["Search first", "Check TKDL and regional databases before filing under the PCT."], ["Disclose origin", "Several jurisdictions require disclosure of the source of genetic resources."]], outro: "A formulation already documented in a classical text will usually fail the novelty test.", cite: "PCT Rule 34 · TKDL Access Agreements" }
      : { conf: "High", intro: "Under Indian law, a formulation already disclosed in an authoritative Ayurvedic text is treated as traditional knowledge and typically faces the Section 3(p) bar.", items: [["Check TKDL", "Search the Traditional Knowledge Digital Library for prior art."], ["Show an inventive step", "A new ratio, process or delivery method may be patentable if it is non-obvious."]], outro: "Document what you changed from the classical reference.", cite: "Patents Act, 1970 · Section 3(p)" };
  if (/biodiversity|abs|nagoya|access|benefit|nba|cultivat|collect/.test(t))
    return { conf: "High", intro: intl ? "Under the Nagoya Protocol, using genetic resources needs prior informed consent and mutually agreed terms." : "In India, commercial use of biological resources needs approval from the National Biodiversity Authority, with benefit-sharing.", items: [["Who must apply", intl ? "Users of genetic resources from a Party country." : "Non-Indian entities and Indian companies using resources commercially."], ["Typical proof", "Access permit, benefit-sharing agreement, and records of origin."]], cite: intl ? "Nagoya Protocol · Art. 5, 6" : "Biological Diversity Act, 2002 · Sections 3, 6, 7" };
  if (/trademark|brand|logo|name/.test(t))
    return { conf: "Medium", intro: "Brand names and logos can be protected as trademarks, but descriptive Ayurvedic terms are often refused.", items: [["Avoid generic names", "Terms like Ashwagandha alone are not distinctive."], ["Search first", "Check existing marks before filing."]], cite: intl ? "Madrid Protocol" : "Trade Marks Act, 1999 · Section 9" };
  if (/gi\b|geographical|region|origin/.test(t))
    return { conf: "Medium", intro: "A Geographical Indication protects goods whose quality is linked to a place, which suits region-specific herbs and products.", items: [["Applicant", "An association of producers, not an individual."], ["Evidence", "Proof of origin, method of production and reputation."]], cite: "Geographical Indications Act, 1999" };
  if (/licen|regulat|drug|schedule|category|nutraceutical|cosmetic|ayush/.test(t))
    return { conf: "High", intro: intl ? "Regulation depends on the target market and how the product is classified there." : "Under Indian law, the route depends on how the product is classified.", items: [["Classical medicine", "First Schedule texts follow Drugs and Cosmetics Rules, Part XVI."], ["Proprietary or new", "Needs additional safety and efficacy data."], ["Food or cosmetic", "Falls under FSSAI or BIS rules instead."]], outro: "Tell me the intended use and I can narrow this down.", cite: "Drugs & Cosmetics Act, 1940 · Rules 151–160" };
  return { conf: "Medium", intro: `Sure! Under ${intl ? "international frameworks" : "Indian law"}, the protection you can get depends on how your product is regulated and how it was formulated.`, items: [["Regulatory category / intended use", "Is it a classical Ayurvedic medicine, a proprietary combination, a phytopharmaceutical, a nutraceutical or a cosmetic?"], ["Formulation origin", "Is the recipe taken straight from a First Schedule text, or did you change ingredients, ratios or delivery?"]], outro: "Your answers will help me give the most accurate guidance." };
}

const suggestions = [
  "Can I patent a classical formulation like Chyawanprash with a novel nano-delivery system?",
  "What regulatory permissions are required under DCA Rule 158B for a proprietary medicine?",
  "Do I need National Biodiversity Authority (NBA) approval to commercially source Ashwagandha from farmers?",
  "Can I register a unique botanical extract as an Ayurveda Aahar food supplement under FSSAI 2022?",
];

const LANGGRAPH_API_URL = "http://127.0.0.1:2024";

export default function ChatPage() {
  const user = useUser();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORE) || "") as Chat[]; } catch { return []; }
  });
  const [activeId, setActiveId] = useState<string | null>(chats[0]?.id ?? null);
  const [juris, setJuris] = useState<Juris>("India");
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [agentOffline, setAgentOffline] = useState(false);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(true);
  const [menu, setMenu] = useState(false);
  const [prof, setProf] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [micErr, setMicErr] = useState("");
  const recRef = useRef<SpeechRec | null>(null);
  const SR = typeof window !== "undefined" ? (window as unknown as { SpeechRecognition?: SpeechRecCtor; webkitSpeechRecognition?: SpeechRecCtor }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: SpeechRecCtor }).webkitSpeechRecognition : undefined;

  //use useStream<typeof myAgent> for type-safe stream state. 
  const stream = useStream<any>({
    apiUrl: LANGGRAPH_API_URL,
    assistantId: "ip_sakti_sahayak",
  });

  const toggleMic = () => {
    if (listening) { recRef.current?.stop(); return; }
    if (!SR) { setMicErr("Voice input isn't supported in this browser. Try Chrome or Edge."); return; }
    setMicErr("");
    const rec = new SR();
    rec.lang = LANGS.find((l) => l.name === lang)?.bcp ?? "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    const base = input ? input.replace(/\s*$/, " ") : "";
    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInput(base + text);
    };
    rec.onerror = (e) => setMicErr(e.error === "not-allowed" || e.error === "service-not-allowed" ? "Microphone access was blocked. Allow it in your browser settings." : e.error === "no-speech" ? "Didn't catch that. Try again." : "Voice input stopped unexpectedly.");
    rec.onend = () => { setListening(false); recRef.current = null; };
    recRef.current = rec;
    rec.start();
    setListening(true);
  };
  useEffect(() => () => recRef.current?.abort(), []);
  const [lang, setLang] = useState(() => localStorage.getItem("ipsakti-lang") || "English");
  useEffect(() => { localStorage.setItem("ipsakti-lang", lang); }, [lang]);
  const endRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(0);

  const active = chats.find((c) => c.id === activeId);
  const msgs = active?.msgs ?? [];

  useEffect(() => { localStorage.setItem(STORE, JSON.stringify(chats)); }, [chats]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length, thinking, stream.isLoading, stream.interrupt, activeId]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const patch = (id: string, fn: (c: Chat) => Chat) => setChats((cs) => cs.map((c) => (c.id === id ? fn(c) : c)));

  // Track completed LangGraph responses and synchronize to chat state
  const lastHandledAnswerRef = useRef<string | null>(null);

  // Extract live streaming token content from root messages
  const latestAiMessage = stream.messages
    .filter((m) => {
      const type = (typeof m.getType === "function" ? m.getType() : "") || (m as any).type || (m as any).role || "";
      return type === "ai" || type === "assistant";
    })
    .slice(-1)[0];

  const streamingText = latestAiMessage
    ? typeof latestAiMessage.content === "string"
      ? latestAiMessage.content
      : Array.isArray(latestAiMessage.content)
        ? latestAiMessage.content.map((c: any) => (typeof c === "string" ? c : c?.text || "")).join("")
        : String(latestAiMessage.content || "")
    : "";

  useEffect(() => {
    // When stream is finished, no interrupt pending, and final answer is present in state or streamed
    if (!stream.isLoading && !stream.interrupt && (stream.values?.final_answer || streamingText)) {
      const finalAnswer = String(stream.values?.final_answer || streamingText).trim();

      if (finalAnswer && finalAnswer !== lastHandledAnswerRef.current) {
        lastHandledAnswerRef.current = finalAnswer;

        const citations = stream.values?.citations;
        let citeStr: string | undefined = undefined;
        if (Array.isArray(citations) && citations.length > 0) {
          citeStr = citations
            .map((c: any) => typeof c === "string" ? c : [c.statute, c.section].filter(Boolean).join(" · "))
            .filter(Boolean)
            .join(" | ");
        }

        let confLevel: Conf = "High";
        const score = stream.values?.confidence_score;
        if (typeof score === "number") {
          if (score < 0.6) confLevel = "Low";
          else if (score < 0.85) confLevel = "Medium";
        }

        const botReply: Reply = {
          intro: finalAnswer,
          cite: citeStr,
          conf: confLevel,
          warnings: stream.values?.helper_warnings,
          category: stream.values?.formulation_category,
          namespaces: stream.values?.selected_namespaces,
        };

        if (activeId) {
          patch(activeId, (c) => {
            const lastMsg = c.msgs[c.msgs.length - 1];
            if (lastMsg && lastMsg.role === "bot" && lastMsg.reply?.intro === finalAnswer) {
              return c;
            }
            return {
              ...c,
              msgs: [
                ...c.msgs,
                {
                  id: uid(),
                  role: "bot",
                  time: now(),
                  reply: botReply,
                  juris,
                  pipelineState: { ...stream.values },
                },
              ],
            };
          });
        }
        setThinking(false);
      }
    }
  }, [stream.isLoading, stream.interrupt, stream.values, streamingText, activeId, juris]);

  const newChat = () => {
    window.clearTimeout(timer.current);
    setThinking(false);
    lastHandledAnswerRef.current = null;
    setActiveId(null);
    setOpen(false);
  };

  const handleClarificationRespond = async (response: string) => {
    try {
      // Resume execution via LangGraph SDK respond method
      await stream.respond(response);
    } catch (err) {
      console.error("stream.respond failed:", err);
    }
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || thinking || stream.isLoading) return;
    let id = activeId;
    const um: Msg = { id: uid(), role: "user", time: now(), text: q };
    if (!id) {
      id = uid();
      setChats((cs) => [{ id: id!, title: q.length > 28 ? q.slice(0, 28) + "…" : q, msgs: [um] }, ...cs]);
      setActiveId(id);
    } else {
      patch(id, (c) => ({ ...c, msgs: [...c.msgs, um] }));
    }
    setInput("");
    setThinking(true);
    lastHandledAnswerRef.current = null;
    const cid = id;

    // 1. Submit to LangGraph Agent Server (live stream + HITL interrupts)
    try {
      setAgentOffline(false);
      await stream.submit({
        user_query: q,
        jurisdiction: juris === "India" ? "IN" : "INT",
        messages: [{ role: "user", content: q }],
      });
      // Stream is now running! Life-cycle is managed by useStream hooks.
      return;
    } catch (langGraphErr) {
      console.warn("Could not dispatch to LangGraph agent server (is langgraph dev running?):", langGraphErr);
      setAgentOffline(true);
    }

    // 2. Fallback to Express backend or local assistant if LangGraph dev server is offline
    const token = localStorage.getItem("accessToken");
    let backendSuccess = false;

    if (token) {
      try {
        let backendChatId = cid;
        if (cid.length <= 10) {
          const createChatRes = await fetch(`${API_BASE_URL}/api/chats`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title: q.slice(0, 30) }),
          });
          if (createChatRes.ok) {
            const chatData = await createChatRes.json();
            if (chatData?.id) {
              backendChatId = chatData.id;
              setChats((cs) => cs.map((c) => (c.id === cid ? { ...c, id: backendChatId } : c)));
              setActiveId(backendChatId);
            }
          }
        }

        const msgRes = await fetch(`${API_BASE_URL}/api/chats/${backendChatId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            text: q,
            jurisdiction: juris.toLowerCase(),
          }),
        });

        if (msgRes.ok) {
          const data = await msgRes.json();
          const answerText: string = data.answer || data.assistantMessage?.content || "";

          let citeStr: string | undefined = undefined;
          if (Array.isArray(data.citations) && data.citations.length > 0) {
            citeStr = data.citations
              .map((c: any) => typeof c === "string" ? c : [c.source, c.header_path?.join(" > ")].filter(Boolean).join(" · "))
              .filter(Boolean)
              .join(" | ");
          } else if (typeof data.citations === "string" && data.citations.trim()) {
            citeStr = data.citations;
          }

          let confLevel: Conf = "High";
          const rawConf = String(data.confidence || "").toLowerCase();
          if (rawConf.includes("med")) confLevel = "Medium";
          else if (rawConf.includes("low")) confLevel = "Low";

          const botReply: Reply = {
            intro: answerText,
            cite: citeStr,
            conf: confLevel,
          };

          patch(backendChatId, (c) => ({
            ...c,
            msgs: [...c.msgs, { id: data.assistantMessage?.id || uid(), role: "bot", time: now(), reply: botReply, juris }],
          }));
          backendSuccess = true;
        }
      } catch (err) {
        console.warn("Backend chat failed, falling back to local assistant:", err);
      }
    }

    if (!backendSuccess) {
      timer.current = window.setTimeout(() => {
        const r = reply(q, juris);
        patch(cid, (c) => ({ ...c, msgs: [...c.msgs, { id: uid(), role: "bot", time: now(), reply: r, juris }] }));
        setThinking(false);
      }, 700);
      return;
    }

    setThinking(false);
  };

  const onSubmit = (e: FormEvent) => { e.preventDefault(); recRef.current?.stop(); send(input); };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } };

  const delChat = (id: string) => { setChats((cs) => cs.filter((c) => c.id !== id)); if (id === activeId) setActiveId(null); };
  const delMsg = (id: string) => active && patch(active.id, (c) => ({ ...c, msgs: c.msgs.filter((m) => m.id !== id) }));
  const rename = (c: Chat) => { const t = window.prompt("Rename chat", c.title); if (t?.trim()) patch(c.id, (x) => ({ ...x, title: t.trim() })); };

  return (
    <div className="cp">
      {open && <div className="cp-scrim" onClick={() => setOpen(false)} />}

      <aside className={open ? "cp-side open" : "cp-side"}>
        <Link className="cp-brand" to="/">IP-SAKTI</Link>
        <button className="cp-new" onClick={newChat}><Ic n="newchat" s={22} /> New Chat</button>

        <button className="cp-recent" onClick={() => setRecent(!recent)} aria-expanded={recent}>
          <Ic n="clock" s={20} /> Recent <span className={recent ? "flip" : ""}><Ic n="chev" /></span>
        </button>
        {recent && (
          <ul className="cp-list">
            {chats.length === 0 && <li className="cp-none">No conversations yet</li>}
            {chats.map((c) => (
              <li key={c.id}>
                <div
                  className={c.id === activeId ? "cp-item active" : "cp-item"}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setActiveId(c.id); setOpen(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setActiveId(c.id); setOpen(false); } }}
                >
                  <Ic n="chat" s={18} />
                  <span>{c.title}</span>
                  <div className="cp-acts">
                    <button aria-label="Rename chat" onClick={(e) => { e.stopPropagation(); rename(c); }}><Ic n="edit" s={14} /></button>
                    <button aria-label="Delete chat" onClick={(e) => { e.stopPropagation(); delChat(c.id); }}><Ic n="trash" s={14} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="cp-side-foot">
          <button className="cp-gear" onClick={() => { setMenu(!menu); setProf(false); }} aria-expanded={menu}>
            <Ic n="gear" s={18} /> Settings
          </button>
          {menu && (
            <div className="cp-menu" role="menu">
              <button role="menuitem" onClick={() => { setChats([]); setActiveId(null); setMenu(false); }}>Clear all conversations</button>
              <button role="menuitem" onClick={() => setMenu(false)}>Keyboard shortcuts</button>
              <button role="menuitem" onClick={() => setMenu(false)}>Data & privacy</button>
            </div>
          )}
          {prof && (
            <div className="cp-prof-card" role="dialog" aria-label="Profile">
              <div className="head">
                <span className="cp-ava">{user ? user.name[0]?.toUpperCase() : <Ic n="user" s={18} />}</span>
                <div>
                  <strong>{user ? user.name : "Guest User"}</strong>
                  <small>{user ? user.email : "Not signed in"}</small>
                </div>
              </div>
              {user ? (
                <>
                  <div className="row"><small>Role</small><span>Ayurvedic Researcher</span></div>
                  <div className="row"><small>Organization</small><span>Ayush Innovation Lab</span></div>
                  <div className="row"><small>Jurisdiction</small><span>{juris}</span></div>
                  <button className="out-btn" onClick={() => { setUser(null); setProf(false); }}>
                    <Ic n="out" s={16} /> Sign out
                  </button>
                </>
              ) : (
                <>
                  <p className="guest-note">Sign in to save chats across devices and access team collaboration.</p>
                  <button className="sign-in-btn" onClick={() => navigate("/login")}>Sign In / Register</button>
                </>
              )}
            </div>
          )}
          <button className="cp-profile" onClick={() => { setProf(!prof); setMenu(false); }} aria-expanded={prof}>
            <span>{user ? user.name[0]?.toUpperCase() : <Ic n="user" s={18} />}</span>
            <div><b>{user ? user.name : "Profile"}</b><small>{user ? user.email : "Guest"}</small></div>
            <Ic n="chev" s={16} />
          </button>
        </div>
      </aside>

      <section className="cp-main">
        <header className="cp-top">
          <button className="cp-burger" onClick={() => setOpen(true)} aria-label="Open menu"><Ic n="menu" s={20} /></button>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="cp-toggle" role="tablist" aria-label="Jurisdiction">
              {(["India", "International"] as Juris[]).map((j) => (
                <button key={j} role="tab" aria-selected={juris === j} className={juris === j ? "on" : ""} onClick={() => setJuris(j)}>
                  {j === "India" && <small>IN</small>}{j}
                </button>
              ))}
            </div>

            {/* Live Agent Status Indicator */}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.03em",
                padding: "4px 10px",
                borderRadius: "999px",
                background: agentOffline || stream.error ? "#fef2f2" : "#f0fdf4",
                color: agentOffline || stream.error ? "#b91c1c" : "#15803d",
                border: `1px solid ${agentOffline || stream.error ? "#fecaca" : "#bbf7d0"}`,
              }}
              title={agentOffline || stream.error ? "LangGraph dev server unreachable. Start 'langgraph dev' on port 2024." : "LangGraph server connected on port 2024."}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: agentOffline || stream.error ? "#ef4444" : "#22c55e",
                }}
              />
              {agentOffline || stream.error ? "AGENT OFFLINE" : "AGENT READY"}
            </span>
          </div>
        </header>

        <div className="cp-scroll">
          <div className="cp-thread">
            {msgs.length === 0 && (
              <div className="cp-empty">
                <span className="cp-bot big"><Ic n="spark" s={26} /></span>
                <h1>How can I help protect your Ayurvedic innovation?</h1>
                <p>Ask about patents, biodiversity access (ABS), trademarks, TKDL prior art, or regulatory routes (D&C Act / FSSAI). Answers are cited directly to official statutes.</p>
                <div className="cp-sugg">{suggestions.map((s) => <button key={s} onClick={() => send(s)}>{s}</button>)}</div>
              </div>
            )}

            {msgs.map((m) =>
              m.role === "user" ? (
                <div className="cp-row" key={m.id}>
                  <span className="cp-ava"><Ic n="user" s={22} /></span>
                  <div className="cp-user">
                    <div className="cp-meta"><b>You</b><time>{m.time}</time><button aria-label="Delete message" onClick={() => delMsg(m.id)}><Ic n="trash" s={14} /></button></div>
                    <p>{m.text}</p>
                  </div>
                </div>
              ) : (
                <div className="cp-row" key={m.id}>
                  <span className="cp-bot"><Ic n="spark" s={20} /></span>
                  <article className="cp-card">
                    <div className="cp-meta">
                      <b>IP-SAKTI</b><time>{m.time}</time>
                      <span className="cp-chips">
                        <em className="chip-j"><small>{m.juris === "India" ? "IN" : "INTL"}</small> {m.juris}</em>
                        {m.reply?.category && (
                          <em style={{ textTransform: "uppercase", background: "#e0f2fe", color: "#0369a1", fontSize: "11px", fontWeight: 700 }}>
                            {m.reply.category}
                          </em>
                        )}
                        <em className={`chip-c ${m.reply!.conf.toLowerCase()}`}><i /> {m.reply!.conf}</em>
                        <button aria-label="Delete message" onClick={() => delMsg(m.id)}><Ic n="trash" s={15} /></button>
                      </span>
                    </div>

                    {/* Rich Markdown Output */}
                    <div className="cp-markdown-body" style={{ marginTop: "12px" }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.reply!.intro}
                      </ReactMarkdown>
                    </div>

                    {/* Fallback Bullet Points if present */}
                    {m.reply!.items && (
                      <ul className="cp-legacy-items">{m.reply!.items.map(([h, b], i) => <li key={h}><span className="n">{i + 1}</span><div><strong>{h}</strong> – {b}</div></li>)}</ul>
                    )}

                    {/* Mandatory Statutory Compliance Warnings (TKDL / ABS Rules) */}
                    {m.reply?.warnings && m.reply.warnings.length > 0 && (
                      <div
                        style={{
                          marginTop: "16px",
                          padding: "12px 16px",
                          background: "#fffbeb",
                          borderLeft: "4px solid #d97706",
                          borderRadius: "8px",
                          fontSize: "13.5px",
                          color: "#92400e",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                        }}
                      >
                        <div style={{ fontWeight: 700, marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                          <AlertTriangle size={16} /> Mandatory Statutory Compliance Rules:
                        </div>
                        <ul style={{ margin: 0, paddingLeft: "18px" }}>
                          {m.reply.warnings.map((w, idx) => (
                            <li key={idx} style={{ marginBottom: "4px", lineHeight: 1.5 }}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {m.reply!.outro && <p style={{ whiteSpace: "pre-line", marginTop: "12px" }}>{m.reply!.outro}</p>}
                    {m.reply!.cite && <div className="cp-cite"><Ic n="file" s={13} /> {m.reply!.cite}</div>}

                    {/* Saved Thinking Pipeline */}
                    {m.pipelineState && (
                      <div style={{ marginTop: "14px" }}>
                        <ThinkingPipeline isLoading={false} values={m.pipelineState} />
                      </div>
                    )}
                  </article>
                </div>
              ),
            )}

            {/* Active Live Thinking Pipeline and Streaming Card during agent execution */}
            {stream.isLoading && (
              <div className="cp-row">
                <span className="cp-bot"><Ic n="spark" s={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ThinkingPipeline isLoading={true} values={stream.values} />

                  {streamingText ? (
                    <article className="cp-card" style={{ marginTop: "12px", animation: "fade 0.2s ease" }}>
                      <div className="cp-meta">
                        <b>IP-SAKTI</b>
                        <span style={{ fontSize: "12px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <span className="animate-pulse" style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--green)" }} />
                          Streaming statutory guidance...
                        </span>
                        <span className="cp-chips">
                          <em className="chip-j"><small>{juris === "India" ? "IN" : "INTL"}</small> {juris}</em>
                          {stream.values?.formulation_category && (
                            <em style={{ textTransform: "uppercase", background: "#e0f2fe", color: "#0369a1", fontSize: "11px", fontWeight: 700 }}>
                              {stream.values.formulation_category}
                            </em>
                          )}
                        </span>
                      </div>

                      <div className="cp-markdown-body" style={{ marginTop: "12px" }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingText}
                        </ReactMarkdown>
                      </div>
                    </article>
                  ) : null}
                </div>
              </div>
            )}

            {/* Active Human-in-the-Loop Clarification Card */}
            {stream.interrupt && (
              <div className="cp-row">
                <span className="cp-bot" style={{ background: "#d97706" }}><Ic n="spark" s={20} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ClarificationCard
                    interrupt={stream.interrupt}
                    onRespond={handleClarificationRespond}
                    isLoading={stream.isLoading}
                  />
                </div>
              </div>
            )}

            {/* Typing Indicator for local mock/fallback */}
            {thinking && !stream.isLoading && !stream.interrupt && (
              <div className="cp-row">
                <span className="cp-bot"><Ic n="spark" s={20} /></span>
                <div className="cp-typing" aria-label="IP-SAKTI is typing"><i /><i /><i /></div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <form className="cp-input" onSubmit={onSubmit}>
          <div>
            <div className="cp-lang">
              <button type="button" className="cp-lang-btn" onClick={() => setLangOpen(!langOpen)} aria-haspopup="listbox" aria-expanded={langOpen} aria-label={`Language: ${lang}`}>
                <Ic n="globe" s={15} /><span>{LANGS.find((l) => l.name === lang)?.code ?? "EN"}</span><Ic n="chev" s={13} />
              </button>
              {langOpen && (
                <>
                  <div className="cp-lang-scrim" onClick={() => setLangOpen(false)} />
                  <ul className="cp-lang-menu" role="listbox" aria-label="Language">
                    {LANGS.map((l) => (
                      <li key={l.name}>
                        <button type="button" role="option" aria-selected={lang === l.name} className={lang === l.name ? "on" : ""} onClick={() => { setLang(l.name); setLangOpen(false); }}>
                          <span className="cp-lang-code">{l.code}</span><span>{l.name}</span>{lang === l.name && <Ic n="check" s={15} />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask IP-SAKTI anything about patents, ABS, D&C Act, TKDL..."
              aria-label="Message"
            />
            <button type="button" className={listening ? "cp-mic on" : "cp-mic"} onClick={toggleMic} aria-pressed={listening} aria-label={listening ? "Stop voice input" : "Start voice input"} title={listening ? "Stop" : "Speak"}><Ic n="mic" s={19} /></button>
            <button type="submit" disabled={!input.trim() || thinking || stream.isLoading} aria-label="Send"><Ic n="send" s={20} /></button>
          </div>
          {(listening || micErr) && <p className={micErr ? "cp-mic-note err" : "cp-mic-note"} role="status">{micErr || <><i /> Listening in {lang}…</>}</p>}
          <small>Information, not legal advice. Consult a qualified IP professional before acting.</small>
        </form>
      </section>
    </div>
  );
}
