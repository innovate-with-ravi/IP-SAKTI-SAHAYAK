import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Leaf,
    ArrowLeft,
    KeyRound,
} from "lucide-react";

import "./Login.css";
import {
    API_BASE_URL,
    forgotPassword,
    resetPassword,
} from "./services/api";

export default function Login() {
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [otp, setOtp] = useState<string>("");

    const [showOtp, setShowOtp] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);

    // Forgot Password states
    const [showForgot, setShowForgot] = useState<boolean>(false);
    const [forgotEmail, setForgotEmail] = useState<string>("");
    const [forgotOtp, setForgotOtp] = useState<string>("");
    const [forgotHashPayload, setForgotHashPayload] = useState<string>("");
    const [forgotNewPassword, setForgotNewPassword] = useState<string>("");
    const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>("");
    const [forgotStep, setForgotStep] = useState<"email" | "reset">("email");
    const [forgotLoading, setForgotLoading] = useState<boolean>(false);

    const navigate = useNavigate();

    /* =====================================================
       LOGIN HANDLER
    ===================================================== */
    async function handleLogin(
        e: React.FormEvent<HTMLFormElement>
    ): Promise<void> {
        e.preventDefault();

        if (!email || !password) {
            alert("Please enter email and password.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API_BASE_URL}/api/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(
                    data.error ||
                    data.message ||
                    "Login failed"
                );

                console.error("Server Error:", data);

                if (response.status === 403) {
                    setShowOtp(true);
                }

                return;
            }

            const token = data.accessToken || data.token;
            if (token) {
                localStorage.setItem("accessToken", token);
            }

            if (data.refreshToken) {
                localStorage.setItem("refreshToken", data.refreshToken);
            }

            const uid = data.user?.id || data.userId || data.user?._id;
            if (uid) {
                localStorage.setItem("userId", uid);
            }

            navigate("/main");
        } catch (error: unknown) {
            console.error("Login Error:", error);
            alert(
                "Unable to connect to server. Please ensure backend is running at " + API_BASE_URL
            );
        } finally {
            setLoading(false);
        }
    }

    /* =====================================================
       OTP VERIFICATION (FOR UNVERIFIED ACCOUNTS)
    ===================================================== */
    async function handleVerifyOtp(
        e: React.FormEvent<HTMLFormElement>
    ): Promise<void> {
        e.preventDefault();

        if (!otp) {
            alert("Please enter the OTP.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API_BASE_URL}/api/auth/verify-email`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email,
                        otp,
                        hashPayload: localStorage.getItem("hashPayload") || "",
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(
                    data.error ||
                    data.message ||
                    "Invalid OTP"
                );
                return;
            }

            const token = data.accessToken || data.token;
            if (token) {
                localStorage.setItem("accessToken", token);
            }

            if (data.refreshToken) {
                localStorage.setItem("refreshToken", data.refreshToken);
            }

            const uid = data.userId || data.user?._id || data.user?.id || data.id;
            if (uid) {
                localStorage.setItem("userId", uid);
            }

            setOtp("");
            navigate("/main");
        } catch (error: unknown) {
            console.error("OTP Error:", error);
            alert("Unable to verify OTP.");
        } finally {
            setLoading(false);
        }
    }

    /* =====================================================
       FORGOT PASSWORD: STEP 1 (SEND OTP)
    ===================================================== */
    async function handleSendForgotOtp(e: React.FormEvent): Promise<void> {
        e.preventDefault();
        const trimmedEmail = forgotEmail.trim();
        if (!trimmedEmail) {
            alert("Please enter your registered email address.");
            return;
        }

        setForgotLoading(true);
        try {
            const hash = await forgotPassword(trimmedEmail);
            setForgotHashPayload(hash);
            setForgotStep("reset");
            alert("Recovery code sent! Please check your email inbox.");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to send reset code.");
        } finally {
            setForgotLoading(false);
        }
    }

    /* =====================================================
       FORGOT PASSWORD: STEP 2 (VERIFY OTP & SET PASSWORD)
    ===================================================== */
    async function handleResetPassword(e: React.FormEvent): Promise<void> {
        e.preventDefault();
        if (!forgotOtp.trim()) {
            alert("Please enter the 6-digit verification code.");
            return;
        }
        if (forgotNewPassword.length < 8) {
            alert("New password must be at least 8 characters long.");
            return;
        }
        if (forgotNewPassword !== forgotConfirmPassword) {
            alert("Passwords do not match.");
            return;
        }

        setForgotLoading(true);
        try {
            await resetPassword({
                email: forgotEmail.trim(),
                otp: forgotOtp.trim(),
                hashPayload: forgotHashPayload,
                newPassword: forgotNewPassword,
            });

            alert("Password has been reset successfully! You can now log in.");
            setEmail(forgotEmail.trim());
            setPassword("");
            setShowForgot(false);
            setForgotStep("email");
            setForgotOtp("");
            setForgotNewPassword("");
            setForgotConfirmPassword("");
        } catch (err) {
            alert(err instanceof Error ? err.message : "Password reset failed.");
        } finally {
            setForgotLoading(false);
        }
    }

    return (
        <div className="ip-login-page">
            <header className="ip-header">
                <div className="ip-brand">
                    <h1>IP-SAKTI</h1>
                    <Leaf
                        size={27}
                        strokeWidth={1.5}
                        className="brand-leaf"
                    />
                </div>
            </header>

            <main className="ip-login-main">
                <div className="left-leaves">
                    <div>🌿</div>
                    <div>🌿</div>
                </div>

                <div className="right-pattern">
                    ❀
                </div>

                {/* FORGOT PASSWORD VIEW */}
                {showForgot ? (
                    <div className="ip-login-card">
                        <div className="ip-logo-circle">
                            <KeyRound size={38} strokeWidth={1.4} />
                        </div>

                        <div className="login-heading">
                            <h2>
                                {forgotStep === "email"
                                    ? "Reset Password"
                                    : "Set New Password"}
                            </h2>
                            <div className="gold-decoration">
                                <span></span>
                                <Leaf size={25} strokeWidth={1.4} />
                                <span></span>
                            </div>
                            <p>
                                {forgotStep === "email"
                                    ? "Enter your registered email address to receive a recovery code."
                                    : `Enter the code sent to ${forgotEmail} and create your new password.`}
                            </p>
                        </div>

                        {forgotStep === "email" ? (
                            <form onSubmit={handleSendForgotOtp}>
                                <div className="field">
                                    <label htmlFor="forgot-email">Email</label>
                                    <div className="input-container">
                                        <Mail size={19} className="field-icon" />
                                        <input
                                            type="email"
                                            id="forgot-email"
                                            placeholder="Enter your registered email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="ip-login-button"
                                    disabled={forgotLoading}
                                >
                                    <span>
                                        {forgotLoading
                                            ? "Sending Code..."
                                            : "Send Recovery Code"}
                                    </span>
                                    {!forgotLoading && (
                                        <ArrowRight size={22} className="button-arrow" />
                                    )}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword}>
                                <div className="field">
                                    <label htmlFor="forgot-otp">6-Digit Code</label>
                                    <div className="input-container">
                                        <Mail size={19} className="field-icon" />
                                        <input
                                            type="text"
                                            id="forgot-otp"
                                            placeholder="Enter 6-digit OTP"
                                            value={forgotOtp}
                                            onChange={(e) => setForgotOtp(e.target.value)}
                                            maxLength={6}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="field">
                                    <label htmlFor="new-password">New Password</label>
                                    <div className="input-container">
                                        <Lock size={19} className="field-icon" />
                                        <input
                                            type="password"
                                            id="new-password"
                                            placeholder="At least 8 characters"
                                            value={forgotNewPassword}
                                            onChange={(e) => setForgotNewPassword(e.target.value)}
                                            minLength={8}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="field">
                                    <label htmlFor="confirm-new-password">
                                        Confirm New Password
                                    </label>
                                    <div className="input-container">
                                        <Lock size={19} className="field-icon" />
                                        <input
                                            type="password"
                                            id="confirm-new-password"
                                            placeholder="Confirm password"
                                            value={forgotConfirmPassword}
                                            onChange={(e) =>
                                                setForgotConfirmPassword(e.target.value)
                                            }
                                            minLength={8}
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="ip-login-button"
                                    disabled={forgotLoading}
                                >
                                    <span>
                                        {forgotLoading
                                            ? "Resetting..."
                                            : "Reset Password"}
                                    </span>
                                    {!forgotLoading && (
                                        <ArrowRight size={22} className="button-arrow" />
                                    )}
                                </button>
                            </form>
                        )}

                        <button
                            type="button"
                            className="back-login"
                            onClick={() => {
                                setShowForgot(false);
                                setForgotStep("email");
                            }}
                        >
                            <ArrowLeft size={17} />
                            Back to Login
                        </button>
                    </div>
                ) : !showOtp ? (
                    /* NORMAL LOGIN FORM */
                    <form className="ip-login-card" onSubmit={handleLogin}>
                        <div className="ip-logo-circle">
                            <Leaf size={42} strokeWidth={1.4} />
                        </div>

                        <div className="login-heading">
                            <h2>Welcome back!</h2>
                            <div className="gold-decoration">
                                <span></span>
                                <Leaf size={25} strokeWidth={1.4} />
                                <span></span>
                            </div>
                            <p>Login to continue to IP-SAKTI</p>
                        </div>

                        <div className="field">
                            <label htmlFor="email">Email</label>
                            <div className="input-container">
                                <Mail size={19} className="field-icon" />
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="field">
                            <label htmlFor="password">Password</label>
                            <div className="input-container">
                                <Lock size={19} className="field-icon" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className="eye-button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? (
                                        <EyeOff size={19} />
                                    ) : (
                                        <Eye size={19} />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="forgot-password">
                            <button
                                type="button"
                                className="forgot-password-btn"
                                onClick={() => {
                                    setForgotEmail(email);
                                    setShowForgot(true);
                                    setForgotStep("email");
                                }}
                            >
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            className="ip-login-button"
                            disabled={loading}
                        >
                            <span>
                                {loading ? "Logging in..." : "Login"}
                            </span>
                            {!loading && (
                                <ArrowRight size={22} className="button-arrow" />
                            )}
                        </button>

                        <div className="or-section">
                            <div></div>
                            <span>or</span>
                            <div></div>
                        </div>

                        <p className="signup-text">
                            Don't have an account?{" "}
                            <Link to="/register">Register here</Link>
                        </p>
                    </form>
                ) : (
                    /* UNVERIFIED EMAIL OTP FORM */
                    <form className="ip-login-card otp-card" onSubmit={handleVerifyOtp}>
                        <div className="ip-logo-circle">
                            <Leaf size={42} strokeWidth={1.4} />
                        </div>

                        <div className="login-heading">
                            <h2>Verify your email</h2>
                            <div className="gold-decoration">
                                <span></span>
                                <Leaf size={25} strokeWidth={1.4} />
                                <span></span>
                            </div>
                            <p>
                                Enter the OTP sent to
                                <br />
                                <strong>{email}</strong>
                            </p>
                        </div>

                        <div className="field">
                            <label htmlFor="otp">Verification Code</label>
                            <div className="input-container">
                                <Mail size={19} className="field-icon" />
                                <input
                                    type="text"
                                    id="otp"
                                    placeholder="Enter OTP"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    maxLength={6}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="ip-login-button"
                            disabled={loading}
                        >
                            <span>
                                {loading ? "Verifying..." : "Verify OTP"}
                            </span>
                            {!loading && (
                                <ArrowRight size={22} className="button-arrow" />
                            )}
                        </button>

                        <button
                            type="button"
                            className="back-login"
                            onClick={() => {
                                setShowOtp(false);
                                setOtp("");
                            }}
                        >
                            <ArrowLeft size={17} />
                            Back to Login
                        </button>
                    </form>
                )}
            </main>
        </div>
    );
}