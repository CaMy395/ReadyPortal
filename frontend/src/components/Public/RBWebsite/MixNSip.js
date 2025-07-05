import React from "react";
import { Link } from "react-router-dom";
import "../../../RB.css"; // Ensure this imports your global styles

const MixNSip = () => {
  return (
    <div className="crafts-page">
      {/* Hero Section */}
      <div className="hero-content-mix">
  <video
    autoPlay
    muted
    loop
    playsInline
    className="hero-video"
  >
    <source src="/MixHero.mp4" type="video/mp4" />
    Your browser does not support the video tag.
  </video>

  <div className="hero-overlay">
    <p>Mixology</p>
    <h1 className="fancy-heading">Mix N' Sip</h1>
    <p>
      Visit Ready Bar to learn how to create 3 classic or signature Ready Drinks while enjoying an intimate or public setting with loved ones!
      This service includes fun activities to enjoy after creating the cocktail to keep you entertained before moving on to the next!
    </p>
    <p>
      We’ll provide you with bar tools to create your cocktails, while teaching you some basic bar knowledge to take back home with you. </p>
      <p>Cost: $75 per person.</p>
    <Link to="/mix-n-sip" className="book-button">BOOK MIX N' SIP</Link>
  </div>
</div>

      
      <div className="gold-divider"></div>                       
                            {/* Video Section */}
                <section className="video-section">
                    <div className="video-container">
                    {/* Left side: Title & Text */}
                    <div className="video-text">
                        <h2>Mix N' Sip</h2>
                        <p>
                        Book date night, casual get together, or even a special occasion! Learn how to create your favorite cocktail and enjoy some fun entertainment!
                        </p>
                    </div>

                    {/* Right side: Embedded YouTube Video */}
                    <div className="video-frame">
                        <iframe
                        width="560"
                        height="315"
                        src="https://www.youtube.com/embed/td1-Aw3E8Xg"
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        ></iframe>
                    </div>
                    </div>
                </section>
                <div className="gold-divider"></div>
      {/* What's Included Section */}
      <section className="crafts-included">
        <div className="crafts-content">
          <img src="/MixNSip_hero.jpg" alt="Mix N' Sip" className="crafts-image" />
          <div className="crafts-text">
            <h2 className="fancy-heading">What's Included?</h2>
            <p>
              When you book the Mix N' Sip classes, you will be provided with all the tools you need
              to succeed. Just bring your energy and good vibes!
            </p>
            <h3>We will be providing:</h3>
            <ul>
              <li>Bar Tools</li>
              <li>Materials for Cocktails</li>
              <li>Aprons</li>
            </ul>
            <h3>Add-Ons</h3>
            <ul>
              <li>Patron Reusable bottle</li>
              <li>Customized Aprons</li>
              <li>Hookah + refills</li>
            </ul>
          </div>
        </div>
      </section>
      <div className="gold-divider"></div>

      {/* Hours of Operation */}
      <section className="hours-operation">
        <h2 className="fancy-heading">Hours of Operation</h2>
        <ul>
          <li>Monday: 12:30pm–10:30pm</li>
          <li>Tuesday: 12:30pm–10:30pm</li>
          <li>Wednesday: 12:30pm–10:30pm</li>
          <li>Thursday: 12:30pm–10:30pm</li>
          <li>Friday: 12:30pm–12:30pm</li>
          <li>Saturday: 12:30pm–12:30pm</li>
          <li>Sunday: 12:30pm–10:30pm</li>
        </ul>
        <p>
          Our classes are offered at these times. Go through the booking process to see availability.
        </p>
      </section>
    </div>
  );
};

export default MixNSip;
