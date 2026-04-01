import React from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";

const CraftsAndCocktails = () => {
  return (
    <div className="crafts-page">
      {/* Hero Section */}
      <div className="hero-content-crafts">
        <p>Unleash Your Creativity</p>
        <h1 className="fancy-heading">Crafts & Cocktails</h1>
        <p>
          Visit Ready Bar to learn how to create your favorite cocktails while unleashing your creativity!
          This service includes a fun craft portion that will keep you entertained while you sip on
          personally made cocktails from scratch.
        </p>
        <p>
          We’ll provide you with your own liquor bottle to decorate and customize. Once your art is complete
          and dry, you’ll fill it with your cocktail of choice to take home with you, creating a unique
          and personal keepsake from your experience!
        </p>

        <p><strong>Group pricing:</strong> $85 per person.</p>
        <p>
          <strong>Private experience pricing:</strong> Smaller groups are welcome and are booked as a
          private session at a flat rate of $220.
        </p>
        <p>
          Perfect for birthdays, date nights, and more intimate celebrations with an elevated,
          personalized experience.
        </p>

        <Link to="/craft-cocktails" className="book-button">
          BOOK CRAFTS & COCKTAILS
        </Link>
      </div>

      <div className="gold-divider"></div>

      {/* Video Section */}
      <section className="video-section">
        <div className="video-container">
          <div className="video-text">
            <h2>Crafts & Cocktails</h2>
            <p>
              Book date night, a casual get together, or even a special occasion! Learn how to create
              your favorite cocktail and sip while you decorate your reusable bottles.
            </p>
            <p>
              Hosting a smaller celebration? We also offer a private session option for a more intimate,
              curated experience.
            </p>
          </div>

          <div className="video-frame">
            <iframe
              width="560"
              height="315"
              src="https://www.youtube.com/embed/NzM0Ldz5zBY"
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
            src="/CraftsCocktailsImage.jpg"
            alt="Crafts & Cocktails"
            className="crafts-image"
          />
          <div className="crafts-text">
            <h2 className="fancy-heading">What&apos;s Included?</h2>
            <p>
              When you book the Crafts & Cocktails classes, you will be provided with all the tools you need
              to succeed. Just bring your creativity and good vibes!
            </p>
            <h3>We will be providing:</h3>
            <ul>
              <li>Aprons</li>
              <li>Craft supplies</li>
              <li>Cocktails</li>
              <li>Liquor bottles to decorate</li>
            </ul>
            <h3>Add-Ons</h3>
            <ul>
              <li>Customized Aprons</li>
              <li>Extra Patron Bottle</li>
              <li>Hookah with Refills</li>
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
          <li>Friday: 12:30pm–10:30pm</li>
          <li>Saturday: 12:30pm–10:30pm</li>
          <li>Sunday: 12:30pm–10:30pm</li>
        </ul>
        <p>
          Our classes are offered at these times. Please complete the booking process to see availability.
        </p>
      </section>
    </div>
  );
};

export default CraftsAndCocktails;