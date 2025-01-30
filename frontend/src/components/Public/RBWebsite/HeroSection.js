import React from "react";
import "../../../RB.css"; // Move the styles here for better organization

const HeroSection = () => {
  return (
    <>
      <header id="navbar">
        <div className="logo">Ready Bartending</div>
        <nav>
          <a href="#home">Home</a>
          <a href="#services">Our Services</a>
          <a href="#events">Events</a>
          <a href="#more">More</a>
          <a href="#contact" className="cta">Book an Event</a>
        </nav>
      </header>

      <div className="hero" id="home">
        <h1>Event Bartenders in Miami</h1>
        <h2>Take Your Event to The Next Level</h2>
        <p>We offer professional, friendly, and fun bartending services in Miami and the surrounding areas.</p>
        <div className="buttons">
          <a href="#contact">Book an Event</a>
          <a href="tel:3059655863">Call Us: (305) 965-5863</a>
        </div>
      </div>
    </>
  );
};

export default HeroSection;
