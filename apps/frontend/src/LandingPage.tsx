import React from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function LandingPage() {
    const navigate = useNavigate();

    return(
        <div className="landing-container">
            <div className="landing-content">
                <h1 className="landing-title">AI Narration Studio</h1>
                <p className="landing-subtitle">
                    Transform your text into natural sounding audio <br />
                    with AI-powered narration.
                </p>
                <button className="primary-btn" onClick={() => navigate("/home")}>
                    <i className="fas fa-arrow-right"></i> Get Started
                </button>
            </div>
        </div>
    );
}

export default LandingPage;
