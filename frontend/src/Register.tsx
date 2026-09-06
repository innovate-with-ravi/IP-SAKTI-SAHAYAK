import { useState } from "react";
import { Link } from "react-router-dom";
import "./App.css";

export default function Register() {
    const [name, setName] = useState<string>("");
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    async function handlesignup(
        e: React.FormEvent<HTMLFormElement>
    ): Promise<void> {
        e.preventDefault();

        // Check password and confirm password on frontend
        if (password !== confirmPassword) {
            alert("Password and Confirm Password do not match!");
            return;
        }

        try {
            const response = await fetch(
                "http://localhost:3000/signup",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                    },

                    // confirmPassword is NOT sent to backend
                    body: JSON.stringify({
                        name,
                        email,
                        password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || "Registration failed");

                console.error("Server Error:", data);

                return;
            }

            alert("Registration Successful!");

            console.log("Success:", data);

            // Clear form
            setName("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");

        } catch (error: unknown) {
            console.error("Signup Error:", error);

            alert(
                "Unable to connect to server. Please try again."
            );
        }
    }

    return (
        <div className="head">

            

            <header className="image">

                <div className="image-content">

                    <h1>IP-SAKTI</h1>

                </div>

            </header>


           
            <form
                className="text"
                onSubmit={handlesignup}
            >

                

                <div className="form-header">

                    <div className="logo-circle">
                        <span>🌿</span>
                    </div>

                    <h1>
                        Create your account
                    </h1>

                    <div className="gold-line">
                        <span>❈</span>
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

        </div>
    );
}