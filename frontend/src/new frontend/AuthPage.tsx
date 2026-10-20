import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router";
import { setUser } from "./auth";

export type AuthMode = "login" | "signup";

const roles = ["AYUSH practitioner", "Startup", "Researcher", "Cultivator", "Other"];

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function Chakra() {
  return (
    <svg className="chakra" viewBox="-100 -100 200 200" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1">
      <circle r="92" /><circle r="84" strokeWidth=".5" /><circle r="14" />
      {Array.from({ length: 24 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 15})`}><path d="M0 14V84" /><path d="M-3 86 0 92 3 86" /></g>
      ))}
    </svg>
  );
}

export default function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const signup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setError(""); setBusy(false); window.scrollTo(0, 0); }, [mode]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (signup && name.trim().length < 2) return setError("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (signup && !agree) return setError("Please accept the terms to continue.");
    setError("");
    setBusy(true);
    setTimeout(() => { setUser({ name: signup ? name.trim() : email.split("@")[0], email }); navigate("/chat"); }, 700);
  };

  return (
    <div className="portal">
      <Chakra />

      <header className="portal-head">
        <Link className="portal-brand" to="/"><span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z" /><path d="M4 21c2-6 6-9 12-12" /></svg></span>IP-SAKTI</Link>
        <Link className="portal-back" to="/">← Back to home</Link>
      </header>

      <main className="portal-main">
        <section className="portal-card" key={mode}>
          <div className="portal-tabs" role="tablist">
            <Link role="tab" aria-selected={!signup} className={!signup ? "on" : ""} to="/login">Log in</Link>
            <Link role="tab" aria-selected={signup} className={signup ? "on" : ""} to="/signup">Sign up</Link>
          </div>

          <h1>{signup ? "Register for IP-SAKTI" : "Sign in to IP-SAKTI"}</h1>
          <p className="portal-sub">{signup ? "Create a free account to save queries and checklists." : "Access your saved queries and compliance checklists."}</p>

          <form onSubmit={submit} noValidate>
            {signup && (
              <label className="field"><span>Full name</span>
                <div><Glyph><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4 4-6 8-6s7 2 8 6" /></Glyph>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Anita Sharma" autoComplete="name" /></div>
              </label>
            )}
            <label className="field"><span>Email address</span>
              <div><Glyph><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Glyph>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.in" autoComplete="email" /></div>
            </label>
            {signup && (
              <label className="field"><span>I am a</span>
                <div><Glyph><path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z" /></Glyph>
                  <select value={role} onChange={(e) => setRole(e.target.value)}>{roles.map((r) => <option key={r}>{r}</option>)}</select></div>
              </label>
            )}
            <label className="field"><span>Password</span>
              <div><Glyph><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Glyph>
                <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" autoComplete={signup ? "new-password" : "current-password"} />
                <button type="button" className="eye" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button></div>
            </label>

            {signup ? (
              <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I understand IP-SAKTI gives information, not legal advice, and accept the terms.</span></label>
            ) : (
              <div className="portal-row">
                <label className="check"><input type="checkbox" defaultChecked /><span>Keep me signed in</span></label>
                <a href="#forgot" onClick={(e) => e.preventDefault()}>Forgot password?</a>
              </div>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="portal-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : signup ? "Create account" : "Log in"}</button>
          </form>

          <p className="portal-switch">
            {signup ? "Already registered?" : "New to IP-SAKTI?"} <Link to={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link>
          </p>
        </section>
        <p className="portal-foot">Information, not legal advice. Consult a qualified IP professional before acting.</p>
      </main>
    </div>
  );
}
