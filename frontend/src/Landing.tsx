import { Link } from "react-router-dom";
import { setUser, useUser } from "./auth";
import { useEffect, useRef, useState, type ReactNode } from "react";

type IconName = "arrow" | "check" | "file" | "globe" | "leaf" | "menu" | "scale" | "shield" | "sparkles" | "x" | "database";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    database: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.4 2.5 3.5 5.5 3.5 9S14.4 18.5 12 21c-2.4-2.5-3.5-5.5-3.5-9S9.6 5.5 12 3Z" /></>,
    leaf: <><path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z" /><path d="M4 21c2-6 6-9 12-12" /></>,
    menu: <path d="M4 8h16M4 16h16" />,
    scale: <path d="M12 3v18M5 7h14M7 7l-4 7h8L7 7ZM17 7l-4 7h8l-4-7ZM8 21h8" />,
    shield: <path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z" />,
    sparkles: <path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" />,
    x: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

const names = [
  { text: "IP-SAKTI", lang: "English", cls: "" },
  { text: "आईपी-शक्ति", lang: "हिन्दी", cls: "dev" },
  { text: "ஐபி-சக்தி", lang: "தமிழ்", cls: "tam" },
  { text: "ਆਈਪੀ-ਸ਼ਕਤੀ", lang: "ਪੰਜਾਬੀ", cls: "pan" },
];

function NameCycler() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % names.length), 2800);
    return () => clearInterval(id);
  }, []);
  const n = names[i];
  return (
    <div className="name-banner" aria-live="polite">
      <div className="name-stage">
        <span key={n.text} className={`name-text ${n.cls}`}>{n.text}</span>
      </div>
    </div>
  );
}

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const p = Math.min((t - start) / 1400, 1);
        setVal(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{val}{suffix}</span>;
}

const answers = {
  India: {
    q: "Can I patent a herbal formulation from a classical Ayurvedic text?",
    a: "A formulation already disclosed in an authoritative text is treated as traditional knowledge and typically faces the Section 3(p) bar. Check TKDL for prior art first.",
    cite: "Patents Act, 1970 · Section 3(p)",
  },
  International: {
    q: "Can I file the same formulation abroad under the PCT?",
    a: "Novelty is judged against global prior art, including TKDL records shared with major patent offices. Nagoya Protocol access and benefit-sharing proof may also be required.",
    cite: "PCT Rule 34 · Nagoya Protocol Art. 5",
  },
};

function ChatDemo() {
  const [juris, setJuris] = useState<keyof typeof answers>("India");
  const [typed, setTyped] = useState(0);
  const data = answers[juris];

  useEffect(() => {
    setTyped(0);
    const id = setInterval(() => setTyped((n) => (n >= data.a.length ? n : n + 2)), 22);
    return () => clearInterval(id);
  }, [juris, data.a.length]);

  const done = typed >= data.a.length;
  return (
    <div className="chat">
      <div className="chat-top">
        <div className="chat-id"><span><Icon name="leaf" size={16} /></span><div><strong>IP-SAKTI</strong><small><i /> Source-grounded</small></div></div>
        <div className="toggle" role="tablist" aria-label="Jurisdiction">
          {(Object.keys(answers) as (keyof typeof answers)[]).map((j) => (
            <button key={j} role="tab" aria-selected={juris === j} className={juris === j ? "on" : ""} onClick={() => setJuris(j)}>{j === "India" ? "India" : "Intl."}</button>
          ))}
        </div>
      </div>
      <div className="bubble user" key={juris + "q"}>{data.q}</div>
      <div className="bubble bot">
        <p>{data.a.slice(0, typed)}{!done && <b className="caret" />}</p>
        <div className={done ? "cite show" : "cite"}><Icon name="file" size={12} /> {data.cite}</div>
      </div>
      <div className="chat-foot"><span><Icon name="check" size={12} /> High confidence</span><span>Not legal advice</span></div>
    </div>
  );
}

const marquee = ["Patents Act 1970", "Biological Diversity Act 2002", "TKDL", "Nagoya Protocol", "Geographical Indications Act", "Drugs & Cosmetics Rules", "Ayurvedic Pharmacopoeia", "PPV&FR Act", "Trade Marks Act 1999", "WIPO PCT"];

const features = [
  { icon: "scale" as IconName, title: "IP pathways", copy: "Patents, GI, trademarks, designs and traditional knowledge, in one map.", cls: "wide" },
  { icon: "leaf" as IconName, title: "Formulation classifier", copy: "Classical, proprietary, phyto-pharmaceutical or Aahar, sorted in minutes.", cls: "" },
  { icon: "shield" as IconName, title: "ABS compliance", copy: "Biodiversity permissions and benefit-sharing duties, made plain.", cls: "" },
  { icon: "globe" as IconName, title: "Two jurisdictions, never mixed", copy: "India and international rules stay separate, in English, हिन्दी, मराठी and தமிழ்.", cls: "wide" },
];

const steps = [
  ["01", "Describe", "Tell us your product and ingredients."],
  ["02", "Choose", "Pick India or international."],
  ["03", "Act", "Get cited, step-by-step guidance."],
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [language, setLanguage] = useState("English");
  const user = useUser();
  useReveal();

  return (
    <div className="site" id="top">
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>

      <header className="header">
        <a className="logo" href="#top"><span className="logo-mark"><Icon name="leaf" size={18} /></span>IP-SAKTI</a>
        <nav className={menuOpen ? "nav open" : "nav"}>
          {[["#features", "Capabilities"], ["#process", "How it works"], ["#start", "Start"]].map(([h, l]) => (
            <a key={h} href={h} onClick={() => setMenuOpen(false)}>{l}</a>
          ))}
        </nav>
        <div className="head-right">
          <select value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Choose language">
            <option>English</option><option>हिन्दी</option><option>मराठी</option><option>தமிழ்</option>
          </select>
          {user ? (
            <>
              <Link to="/chat" className="user-chip" title={user.email}><i>{user.name[0]?.toUpperCase()}</i>{user.name.split(" ")[0]}</Link>
              <Link className="btn small" to="/chat">Open Chat</Link>
              <button className="auth-link" onClick={() => setUser(null)}>Log out</button>
            </>
          ) : (
            <>
              <Link className="auth-link" to="/login">Log in</Link>
              <Link className="btn small" to="/signup">Sign up</Link>
            </>
          )}
          <button className="burger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Icon name={menuOpen ? "x" : "menu"} size={20} /></button>
        </div>
      </header>

      <NameCycler />

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow rise" style={{ animationDelay: ".05s" }}><i /> For AYUSH practitioners, startups &amp; researchers</span>
            <h1>
              {["Protect", "what", "tradition"].map((w, i) => <span className="word" key={w}><span style={{ animationDelay: `${0.15 + i * 0.1}s` }}>{w}&nbsp;</span></span>)}
              <span className="word"><span style={{ animationDelay: ".5s" }}><em>gave you.</em></span></span>
            </h1>
            <p className="rise" style={{ animationDelay: ".65s" }}>A citation-grounded assistant for Ayurveda IP, biodiversity compliance and product regulation.</p>
            <div className="hero-actions rise" style={{ animationDelay: ".8s" }}>
              <Link className="btn" to={user ? "/chat" : "/login"}>Start with your product <Icon name="arrow" size={16} /></Link>
              <a className="link" href="#process">See how it works</a>
            </div>
          </div>
          <div className="hero-visual rise" style={{ animationDelay: ".4s" }}>
            <div className="ring r1" /><div className="ring r2" />
            <ChatDemo />
            <div className="chip c1"><Icon name="database" size={14} /> Every claim, cited</div>
            <div className="chip c2"><Icon name="sparkles" size={14} /> TKDL prior-art pointers</div>
          </div>
        </section>

        <div className="marquee" aria-label="Knowledge sources">
          <div className="track">
            {[...marquee, ...marquee].map((m, i) => <span key={i}><Icon name="leaf" size={12} />{m}</span>)}
          </div>
        </div>

        <section className="stats" data-reveal>
          <div><b><Counter to={12} suffix="+" /></b><span>regimes covered</span></div>
          <div><b><Counter to={2} /></b><span>jurisdictions, kept distinct</span></div>
          <div><b><Counter to={100} suffix="%" /></b><span>traceable citations</span></div>
          <div><b><Counter to={4} /></b><span>languages and growing</span></div>
        </section>

        <section className="features" id="features">
          <h2 data-reveal>One assistant. <em>The whole pathway.</em></h2>
          <div className="bento">
            {features.map((f, i) => (
              <article key={f.title} className={`card ${f.cls}`} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                <span className="card-icon"><Icon name={f.icon} size={20} /></span>
                <h3>{f.title}</h3>
                <p>{f.copy}</p>
                <Icon name="arrow" size={16} />
              </article>
            ))}
          </div>
        </section>

        <section className="process" id="process">
          <h2 data-reveal>Three questions to <em>clarity.</em></h2>
          <div className="steps">
            <div className="steps-line" data-reveal />
            {steps.map(([n, t, c], i) => (
              <div className="step" key={n} data-reveal style={{ transitionDelay: `${i * 140}ms` }}>
                <span className="num">{n}</span>
                <h3>{t}</h3>
                <p>{c}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cta" id="start" data-reveal>
          <h2>Start with your product.<br /><em>We&apos;ll map the path.</em></h2>
          <Link className="btn big" to={user ? "/chat" : "/login"}>Ask IP-SAKTI <Icon name="arrow" size={18} /></Link>
        </section>
      </main>

      <footer>
        <span className="logo"><span className="logo-mark"><Icon name="leaf" size={14} /></span>IP-SAKTI</span>
        <p>Information, not legal advice. Consult a qualified IP professional before acting.</p>
      </footer>
    </div>
  );
}
