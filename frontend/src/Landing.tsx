import {
    Leaf,
    MessageCircle,
    FileCheck,
    Globe,
    Languages,
    ArrowRight,
    LogIn,
    UserPlus,
} from "lucide-react";

import { Link } from "react-router-dom";
import "./Landing.css";

export default function Landing() {
    return (
        <div className="landing-page">

        

            <header className="landing-header">

               

                <Link
                    to="/"
                    className="landing-logo"
                >
                    <span>IP-SAKTI</span>

                    <Leaf
                        size={28}
                        strokeWidth={1.5}
                    />
                </Link>


               

                <div className="auth-buttons">

                    <Link
                        to="/login"
                        className="header-login"
                    >
                        <LogIn size={18} />

                        Login
                    </Link>


                    <Link
                        to="/register"
                        className="header-signup"
                    >
                        <UserPlus size={18} />

                        Sign Up
                    </Link>

                </div>

            </header>


           

            <div className="landing-decoration">

                <span></span>

                <Leaf
                    size={25}
                    strokeWidth={1.3}
                />

                <span></span>

            </div>


    

            <main className="landing-main">



                <section className="hero-section">

                    <div className="hero-content">

                        <h1>
                            Your AI Assistant for
                            <br />
                            Ayurveda & Intellectual Property
                        </h1>


                        <div className="hero-divider">

                            <span></span>

                            <Leaf
                                size={30}
                                strokeWidth={1.3}
                            />

                            <span></span>

                        </div>


                        <p className="hero-description">
                            Understand patents, GI, TK, ABS,
                            <br />
                            regulations and international IP.
                        </p>



                        <Link
                            to="/login"
                            className="start-button"
                        >

                            <MessageCircle
                                size={22}
                            />

                            <span>
                                Start Asking Questions
                            </span>

                            <ArrowRight
                                size={21}
                            />

                        </Link>

                    </div>


                   

                    <div className="feature-section">


    

                        <div className="feature-item">

                            <div className="feature-icon">

                                <FileCheck
                                    size={48}
                                    strokeWidth={1.4}
                                />

                            </div>

                            <h3>
                                Source cited
                            </h3>

                        </div>


                      

                        <div className="feature-item">

                            <div className="feature-icon">

                                <Globe
                                    size={48}
                                    strokeWidth={1.4}
                                />

                            </div>

                            <h3>
                                Jurisdiction aware
                            </h3>

                        </div>


                        

                        <div className="feature-item">

                            <div className="feature-icon">

                                <Languages
                                    size={48}
                                    strokeWidth={1.4}
                                />

                            </div>

                            <h3>
                                Multilingual
                            </h3>

                            <span>
                                (future)
                            </span>

                        </div>

                    </div>

                </section>



                <div className="botanical-left">

                    <div className="leaf leaf-one">
                        🌿
                    </div>

                    <div className="leaf leaf-two">
                        🌿
                    </div>

                    <div className="leaf leaf-three">
                        🌿
                    </div>

                </div>


                <div className="botanical-right">

                    <div className="mandala">
                        ❀
                    </div>

                </div>




                <div className="ayurveda-decoration">

                    <div className="bowl">

                        <div className="bowl-stick"></div>

                    </div>

                    <div className="herbs">

                        <span>🌿</span>
                        <span>🌿</span>
                        <span>🍃</span>

                    </div>

                </div>

            </main>



            <div className="landing-bottom">

                <p>
                    Intelligent • Evidence-based •
                    Jurisdiction-aware
                </p>

            </div>

        </div>
    );
}