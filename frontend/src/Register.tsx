import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./App.css";
import { API_BASE_URL } from "./services/api";

export default function Register() {
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    
    const [showOtp, setShowOtp] = useState<boolean>(false);
    const [otp, setOtp] = useState<string>("");
    const [hashPayload, setHashPayload] = useState<string>("");

    const navigate = useNavigate();


    async function handlesignup(
        e: React.FormEvent<HTMLFormElement>
    ): Promise<void> {

        e.preventDefault();

        // Check password and confirm password
        if (password !== confirmPassword) {
            alert("Password and Confirm Password do not match!");
            return;
        }

        if (password.length < 8) {
            alert("Password must be at least 8 characters long.");
            return;
        }

        try {

            const response = await fetch(
                `${API_BASE_URL}/api/auth/signup`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    body: JSON.stringify({
                        name,
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
                    "Registration failed"
                );

                console.error(
                    "Server Error:",
                    data
                );

                return;
            }

            if (data.verification?.hashPayload) {
                setHashPayload(data.verification.hashPayload);
                localStorage.setItem("hashPayload", data.verification.hashPayload);
            }

            alert(
                data.message ||
                "OTP has been sent to your email."
            );

            setShowOtp(true);

        } catch (error: unknown) {

            console.error(
                "Signup Error:",
                error
            );

            alert(
                "Unable to connect to server. Please try again."
            );
        }
    }




    async function handleVerifyOtp(
        e: React.FormEvent<HTMLFormElement>
    ): Promise<void> {

        e.preventDefault();


        if (!otp) {

            alert("Please enter OTP.");

            return;
        }


        try {

          

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
                        hashPayload: hashPayload || localStorage.getItem("hashPayload") || "",
                    }),
                }
            );

            const data =
                await response.json();

            // OTP incorrect
            if (!response.ok) {

                alert(
                    data.error ||
                    data.message ||
                    "Invalid OTP"
                );

                return;
            }

            if (data.accessToken) {
                localStorage.setItem("accessToken", data.accessToken);
            }
            if (data.refreshToken) {
                localStorage.setItem("refreshToken", data.refreshToken);
            }
            if (data.user?.id) {
                localStorage.setItem("userId", data.user.id);
            }

            alert(
                "Registration verified successfully!"
            );


            // Clear form
            setName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setOtp("");


      

            navigate("/login");

        } catch (error: unknown) {

            console.error(
                "OTP Verification Error:",
                error
            );

            alert(
                "Unable to connect to server. Please try again."
            );
        }
    }


    return (
        <div className="head">


            <header className="image">

                <div className="image-content">

                    <h1>
                        IP-SAKTI
                    </h1>

                </div>

            </header>


            {!showOtp ? (

                <form
                    className="text"
                    onSubmit={handlesignup}
                >


                    <div className="form-header">

                        <div className="logo-circle">

                            <span>
                                🌿
                            </span>

                        </div>


                        <h1>
                            Create your account
                        </h1>


                        <div className="gold-line">

                            <span>
                                ❈
                            </span>

                        </div>


                        <p>
                            Join IP-SAKTI and start your IP journey
                        </p>

                    </div>


                    <div className="form-grid">

                        <div className="input-group">

                            <label htmlFor="name">
                                Full Name
                            </label>


                            <div className="input-wrapper">

                                <span className="input-icon">
                                    ♙
                                </span>


                                <input
                                    type="text"
                                    id="name"
                                    placeholder="Enter your full name"
                                    value={name}
                                    onChange={(e) =>
                                        setName(e.target.value)
                                    }
                                    required
                                />

                            </div>

                        </div>


                       

                        <div className="input-group">

                            <label htmlFor="email">
                                Email
                            </label>


                            <div className="input-wrapper">

                                <span className="input-icon">
                                    ✉
                                </span>


                                <input
                                    type="email"
                                    id="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) =>
                                        setEmail(e.target.value)
                                    }
                                    required
                                />

                            </div>

                        </div>


                      

                        <div className="input-group">

                            <label htmlFor="password">
                                Password
                            </label>


                            <div className="input-wrapper">

                                <span className="input-icon">
                                    🔒
                                </span>


                                <input
                                    type="password"
                                    id="password"
                                    placeholder="Create a password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                />


                                <span className="eye-icon">
                                    ◉
                                </span>

                            </div>

                        </div>


                       

                        <div className="input-group">

                            <label htmlFor="confirmPassword">
                                Confirm Password
                            </label>


                            <div className="input-wrapper">

                                <span className="input-icon">
                                    🔒
                                </span>


                                <input
                                    type="password"
                                    id="confirmPassword"
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(
                                            e.target.value
                                        )
                                    }
                                    required
                                />


                                <span className="eye-icon">
                                    ◉
                                </span>

                            </div>

                        </div>

                    </div>


                    

                    <button
                        className="register-btn"
                        type="submit"
                    >

                        <span>
                            Sign Up
                        </span>


                        <span>
                            →
                        </span>

                    </button>


                    <div className="or-divider">

                        <span></span>

                        <p>
                            or
                        </p>

                        <span></span>

                    </div>


                    <p className="login-text">

                        Already have an account?


                        <Link to="/login">
                            Login
                        </Link>

                    </p>


                </form>

            ) : (



                <form
                    className="text"
                    onSubmit={handleVerifyOtp}
                >


                    <div className="form-header">

                        <div className="logo-circle">

                            <span>
                                ✉️
                            </span>

                        </div>


                        <h1>
                            Verify Your Email
                        </h1>


                        <div className="gold-line">

                            <span>
                                ❈
                            </span>

                        </div>


                        <p>
                            Enter the OTP sent to your email
                        </p>

                    </div>


                    <div className="form-grid">


                        <div className="input-group">

                            <label htmlFor="otp">
                                Enter OTP
                            </label>


                            <div className="input-wrapper">

                                <span className="input-icon">
                                    🔐
                                </span>


                                <input
                                    type="text"
                                    id="otp"
                                    placeholder="Enter 6 digit OTP"
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

                    </div>


                    <button
                        className="register-btn"
                        type="submit"
                    >

                        <span>
                            Verify OTP
                        </span>


                        <span>
                            →
                        </span>

                    </button>


                    <p className="login-text">

                        Already have an account?


                        <Link to="/login">
                            Login
                        </Link>

                    </p>


                </form>

            )}

        </div>
    );
}