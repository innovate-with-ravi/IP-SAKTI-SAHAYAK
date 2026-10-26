import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "./services/api";

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

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email || "";

  const [step, setStep] = useState<"request" | "verify" | "success">("request");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [hashPayload, setHashPayload] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSendOtp = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return setError("Please enter a valid email address.");
    }
    setError("");
    setInfo("");
    setBusy(true);

    try {
      const payloadHash = await forgotPassword(email.trim().toLowerCase());
      setHashPayload(payloadHash);
      setStep("verify");
      setInfo(`A 6-digit reset code has been sent to ${email.trim()}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset code. Please try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      return setError("Please enter the 6-digit code sent to your email.");
    }
    if (newPassword.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }
    if (newPassword !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    setError("");
    setInfo("");
    setBusy(true);

    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        hashPayload,
        newPassword,
      });
      setStep("success");
      setInfo("Your password has been reset successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password. Please try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="portal">
      <Chakra />

      <header className="portal-head">
        <Link className="portal-brand" to="/">
          <span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 4C12 4 5 8 5 15c0 3 2 5 5 5 7 0 10-8 10-16Z" />
              <path d="M4 21c2-6 6-9 12-12" />
            </svg>
          </span>
          IP-SAKTI
        </Link>
        <Link className="portal-back" to="/login">← Back to Log in</Link>
      </header>

      <main className="portal-main">
        <section className="portal-card">
          {step === "request" && (
            <>
              <h1>Reset Password</h1>
              <p className="portal-sub">
                Enter your registered email address and we will send you a 6-digit verification code.
              </p>

              <form onSubmit={handleSendOtp} noValidate>
                <label className="field">
                  <span>Registered Email</span>
                  <div>
                    <Glyph>
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </Glyph>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.in"
                      autoFocus
                      autoComplete="email"
                    />
                  </div>
                </label>

                {info && <p style={{ margin: 0, padding: "8px 12px", fontSize: "13px", color: "#0c5460", background: "#d1ecf1", borderRadius: "4px" }}>{info}</p>}
                {error && <p className="auth-error" role="alert">{error}</p>}

                <button className="portal-submit" type="submit" disabled={busy}>
                  {busy ? "Sending code…" : "Send Verification Code"}
                </button>
              </form>

              <p className="portal-switch">
                Remember your password? <Link to="/login">Log in</Link>
              </p>
            </>
          )}

          {step === "verify" && (
            <>
              <h1>Verify & Reset</h1>
              <p className="portal-sub">
                Enter the 6-digit code sent to <strong>{email}</strong> and your new password.
              </p>

              <form onSubmit={handleResetPassword} noValidate>
                <label className="field">
                  <span>6-Digit Verification Code</span>
                  <div>
                    <Glyph>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </Glyph>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      autoFocus
                      autoComplete="one-time-code"
                      style={{ letterSpacing: "4px", fontWeight: "bold" }}
                    />
                  </div>
                </label>

                <label className="field">
                  <span>New Password</span>
                  <div>
                    <Glyph>
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </Glyph>
                    <input
                      type={showPass ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                    />
                    <button type="button" className="eye" onClick={() => setShowPass(!showPass)}>
                      {showPass ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <label className="field">
                  <span>Confirm New Password</span>
                  <div>
                    <Glyph>
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </Glyph>
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                    />
                    <button type="button" className="eye" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? "Hide" : "Show"}
                    </button>
                  </div>
                </label>

                <div className="portal-row">
                  <button
                    type="button"
                    style={{ background: "none", border: "none", padding: 0, color: "var(--saffron)", cursor: "pointer", fontWeight: 600 }}
                    onClick={() => { setStep("request"); setError(""); setInfo(""); }}
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", padding: 0, color: "var(--neem)", cursor: "pointer", fontWeight: 600 }}
                    onClick={() => handleSendOtp()}
                    disabled={busy}
                  >
                    Resend code
                  </button>
                </div>

                {info && <p style={{ margin: 0, padding: "8px 12px", fontSize: "13px", color: "#0c5460", background: "#d1ecf1", borderRadius: "4px" }}>{info}</p>}
                {error && <p className="auth-error" role="alert">{error}</p>}

                <button className="portal-submit" type="submit" disabled={busy}>
                  {busy ? "Resetting password…" : "Reset Password"}
                </button>
              </form>

              <p className="portal-switch">
                Need to start over? <Link to="/login">Back to Log in</Link>
              </p>
            </>
          )}

          {step === "success" && (
            <>
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#d4edda",
                  color: "#155724",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px"
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h1>Password Reset!</h1>
                <p className="portal-sub" style={{ marginTop: "8px" }}>
                  Your password has been reset successfully. You can now log in with your new credentials.
                </p>
                <button
                  type="button"
                  className="portal-submit"
                  style={{ width: "100%", marginTop: "16px" }}
                  onClick={() => navigate("/login")}
                >
                  Go to Log in
                </button>
              </div>
            </>
          )}
        </section>
        <p className="portal-foot">Information, not legal advice. Consult a qualified IP professional before acting.</p>
      </main>
    </div>
  );
}
