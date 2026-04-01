import React from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";

const MixNSip = () => {
  return (
    <div className="crafts-page">
      {/* Hero Section */}
      <div className="hero-content-mix">
        <video autoPlay muted loop playsInline className="hero-video">
          <source src="/MixHero.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="hero-overlay">
          <p>Mixology</p>
          <h1 className="fancy-heading">Mix N&apos; Sip</h1>
          <p>
            Visit Ready Bar to learn how to create 3 classic or signature Ready
            drinks while enjoying an intimate or group experience with loved
            ones. This service includes both virtual and in-person options, with
            fun activities to keep the energy going between cocktails.
          </p>

          <p>
            <strong>In-Person Group Pricing:</strong> $75 per person.
          </p>
          <p>
            <strong>Private In-Person Experience:</strong> Smaller groups are
            welcome and are booked as a private session at a flat rate of $200.
          </p>
          <p>
            <strong>Virtual:</strong> $50 per person.
          </p>

          <p>
            In person, we provide the bar tools and cocktail materials while
            teaching basic bar knowledge you can take home with you. Virtually,
            you can choose whether you’d like to provide your own tools and
            materials or add them to your experience.
          </p>

          <Link to="/mix-n-sip" className="book-button">
            BOOK MIX N&apos; SIP
          </Link>
        </div>
      </div>

      <div className="gold-divider"></div>

      {/* Video Section */}
      <section className="video-section">
        <div className="video-container">
          <div className="video-text">
            <h2>Mix N&apos; Sip</h2>
            <p>
              Book date night, a casual get together, or even a special
              occasion. Learn how to create your favorite cocktails and enjoy a
              fun, elevated experience along the way.
            </p>
            <p>
              Hosting a smaller in-person celebration? We also offer a private
              session option for a more intimate, curated experience.
            </p>
          </div>

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
          <img
            src="/MixNSip_hero.jpg"
            alt="Mix N' Sip"
            className="crafts-image"
          />
          <div className="crafts-text">
            <h2 className="fancy-heading">What&apos;s Included?</h2>
            <p>
              When you book Mix N&apos; Sip, you’ll be provided with the tools
              and guidance you need for a fun, memorable class. Just bring your
              energy and good vibes.
            </p>

            <h3>In-Person Includes:</h3>
            <ul>
              <li>Bar tools</li>
              <li>Cocktail materials</li>
              <li>Aprons provided for use during the experience</li>
            </ul>

            <h3>Virtual Options:</h3>
            <ul>
              <li>Live guided mixology instruction</li>
              <li>Optional bar tools add-on</li>
              <li>Optional materials add-on</li>
            </ul>

            <h3>Enhance Your Experience</h3>
            <ul>
              <li>Light Bites Experience</li>
              <li>Take-Home Custom Vinyl Apron</li>
              <li>Patron Reusable Cup</li>
              <li>Hookah with refills</li>
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
          <li>Friday: 12:30pm–12:30am</li>
          <li>Saturday: 12:30pm–12:30am</li>
          <li>Sunday: 12:30pm–10:30pm</li>
        </ul>
        <p>
          Our classes are offered during these times. Complete the booking
          process to see availability.
        </p>
      </section>
    </div>
  );
};

export default MixNSip;