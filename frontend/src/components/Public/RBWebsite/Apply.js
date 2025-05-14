import React from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";

const ApplyPage = () => {
    return (
        <div className="apply-page">
            {/* Hero Section */}
            <div className="hero">
                <h1 className="fancy-heading">Join the Ready Bartending Team!</h1>
                <p>We are looking for professional and energetic bartenders to join our team. If you're passionate about creating unforgettable experiences at events, we want to hear from you!</p>
            </div>
            <div className="gold-divider"></div>

            {/* Why Apply Section */}
            <section className="why-apply-section">
                <h2 className="fancy-heading">Why Apply to Ready Bartending?</h2>
                <p>
                    At Ready Bartending, we pride ourselves on providing top-notch service, friendly bartenders, and a fun atmosphere for all types of events. Here’s why you should apply:
                </p>
                <ul>
                    <li><strong>Flexible Hours:</strong> Work events that fit your schedule.</li>
                    <li><strong>Competitive Pay:</strong> Earn great rates while doing what you love.</li>
                    <li><strong>Supportive Team:</strong> Be part of a fun, professional team.</li>
                    <li><strong>Variety of Events:</strong> Work at corporate parties, weddings, and private events.</li>
                </ul>
            </section>
            <div className="gold-divider"></div>

            {/* How to Apply Section */}
            <section className="how-to-apply-section">
                <h2 className="fancy-heading">How to Apply</h2>
                <p>
                    If you’re interested in joining our team, please follow the steps below:
                </p>
                <ol>
                    <li>Click the button below to start the application process.</li>
                    <li>Fill out the scheduling form with your details to set up an interview/audition.</li>
                    <li>We’ll email you with the next steps.</li>
                </ol>
                <br></br>
            {/* Apply Button */}
                <Link to="/rb/client-scheduling?startApplication=true">
                    <button className="apply-btn">Start Your Application</button>
                </Link>
            </section>

            <div className="gold-divider"></div>
        </div>
    );
};

export default ApplyPage;
