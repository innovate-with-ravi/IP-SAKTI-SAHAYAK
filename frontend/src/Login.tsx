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
} from "lucide-react";

import "./Login.css";
import { API_BASE_URL } from "./services/api";

export default function Login() {

   
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [otp, setOtp] = useState<string>("");

    const [showOtp, setShowOtp] =
        useState<boolean>(false);

    const [showPassword, setShowPassword] =
        useState<boolean>(false);

    const [loading, setLoading] =
        useState<boolean>(false);

    const navigate = useNavigate();


  

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

                console.error(
                    "Server Error:",
                    data
                );

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

            console.error(
                "Login Error:",
                error
            );

            alert(
                "Unable to connect to server. Please ensure backend is running at " + API_BASE_URL
            );

        } finally {

            setLoading(false);

        }
    }


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

            console.error(
                "OTP Error:",
                error
            );

            alert(
                "Unable to verify OTP."
            );

        } finally {

            setLoading(false);

        }
    }


    

    return (
        <div className="ip-login-page">

            
            <header className="ip-header">

                {/* LOGO */}

                <div className="ip-brand">

                    <h1>
                        IP-SAKTI
                    </h1>

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


        

                {!showOtp ? (

                    <form
                        className="ip-login-card"
                        onSubmit={handleLogin}
                    >

                       

                        <div className="ip-logo-circle">

                            <Leaf
                                size={42}
                                strokeWidth={1.4}
                            />

                        </div>


                     

                        <div className="login-heading">

                            <h2>
                                Welcome back!
                            </h2>


                            <div className="gold-decoration">

                                <span></span>

                                <Leaf
                                    size={25}
                                    strokeWidth={1.4}
                                />

                                <span></span>

                            </div>


                            <p>
                                Login to continue to IP-SAKTI
                            </p>

                        </div>


                     

                        <div className="field">

                            <label htmlFor="email">
                                Email
                            </label>


                            <div className="input-container">

                                <Mail
                                    size={19}
                                    className="field-icon"
                                />

                                <input
                                    type="email"
                                    id="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(
                                            e.target.value
                                        )
                                    }
                                    required
                                />

                            </div>

                        </div>


                       

                        <div className="field">

                            <label htmlFor="password">
                                Password
                            </label>


                            <div className="input-container">

                                <Lock
                                    size={19}
                                    className="field-icon"
                                />

                                <input
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    id="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(
                                            e.target.value
                                        )
                                    }
                                    required
                                />


                                <button
                                    type="button"
                                    className="eye-button"
                                    onClick={() =>
                                        setShowPassword(
                                            !showPassword
                                        )
                                    }
                                >

                                    {showPassword ? (
                                        <EyeOff
                                            size={19}
                                        />
                                    ) : (
                                        <Eye
                                            size={19}
                                        />
                                    )}

                                </button>

                            </div>

                        </div>


                      

                        <div className="forgot-password">

                            <Link to="/Forget_Password">
                                Forgot password?
                            </Link>

                        </div>


                      

                        <button
                            type="submit"
                            className="ip-login-button"
                            disabled={loading}
                        >

                            <span>

                                {loading
                                    ? "Sending OTP..."
                                    : "Login"}

                            </span>


                            {!loading && (
                                <ArrowRight
                                    size={22}
                                    className="button-arrow"
                                />
                            )}

                        </button>


                        

                        <div className="or-section">

                            <div></div>

                            <span>
                                or
                            </span>

                            <div></div>

                        </div>
                        <p className="signup-text">

                            Don't have an account?

                            <Link to="/Register">
                                Sign up
                            </Link>

                        </p>

                    </form>

                ) : (

                   

                    <form
                        className="ip-login-card otp-card"
                        onSubmit={handleVerifyOtp}
                    >

                        

                        <div className="ip-logo-circle">

                            <Leaf
                                size={42}
                                strokeWidth={1.4}
                            />

                        </div>


                    

                        <div className="login-heading">

                            <h2>
                                Verify your email
                            </h2>


                            <div className="gold-decoration">

                                <span></span>

                                <Leaf
                                    size={25}
                                    strokeWidth={1.4}
                                />

                                <span></span>

                            </div>


                            <p>
                                Enter the OTP sent to
                                <br />
                                <strong>
                                    {email}
                                </strong>
                            </p>

                        </div>


                        

                        <div className="field">

                            <label htmlFor="otp">
                                Verification Code
                            </label>


                            <div className="input-container">

                                <Mail
                                    size={19}
                                    className="field-icon"
                                />

                                <input
                                    type="text"
                                    id="otp"
                                    placeholder="Enter OTP"
                                    value={otp}
                                    onChange={(e) =>
                                        setOtp(
                                            e.target.value
                                        )
                                    }
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

                                {loading
                                    ? "Verifying..."
                                    : "Verify OTP"}

                            </span>


                            {!loading && (
                                <ArrowRight
                                    size={22}
                                    className="button-arrow"
                                />
                            )}

                        </button>


                        {/* BACK */}

                        <button
                            type="button"
                            className="back-login"
                            onClick={() => {
                                setShowOtp(false);
                                setOtp("");
                            }}
                        >

                            <ArrowLeft
                                size={17}
                            />

                            Back to Login

                        </button>

                    </form>

                )}

            </main>


           

        </div>
    );
}