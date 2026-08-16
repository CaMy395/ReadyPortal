import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";

const BabyShowers = () => {
  const showerImages = [
    "/shower1.png",
    "/shower2.png",
    "/shower3.png",
    "/shower4.png",
    "/shower5.png",
    "/shower6.png",
    "/shower7.png",
    "/shower8.png",
    "/shower9.png",
  ];

  const [galleryStart, setGalleryStart] = useState(0);

  const visibleShowerImages = [
    showerImages[galleryStart % showerImages.length],
    showerImages[(galleryStart + 1) % showerImages.length],
    showerImages[(galleryStart + 2) % showerImages.length],
  ];

  const nextGallery = () => {
    setGalleryStart(
      (prev) => (prev + 1) % showerImages.length
    );
  };

  const previousGallery = () => {
    setGalleryStart(
      (prev) =>
        (prev - 1 + showerImages.length) %
        showerImages.length
    );
  };

  return (
    <div className="rb-events-page">

      {/* =========================
          HERO
      ========================== */}
      <section
        className="rb-events-hero"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url('/shower5.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="rb-events-hero-inner">

          <p className="rb-events-eyebrow">
            READY BARTENDING BABY SHOWERS & GENDER REVEALS
          </p>

          <h1 className="rb-events-title">
            A Little One Is Coming. We'll Stay Ready.
          </h1>

          <p className="rb-events-subtitle">
            Celebrate the newest addition with a bar experience
            designed for your special day. From baby showers to
            gender reveals, Ready Bartending brings professional
            service, beautiful presentation, and customized drink
            options for you and your guests.
          </p>

        </div>
      </section>


      {/* =========================
          PAST EVENTS
      ========================== */}
      <section className="rb-events-section">

        <div
          className="rb-events-section-heading"
          style={{ textAlign: "center" }}
        >

          <p className="rb-events-eyebrow">
            REAL EVENTS • REAL READY EXPERIENCES
          </p>

          <h2>
            Celebrations We've Been Ready For
          </h2>

          <p>
            Take a look at some of the baby showers, gender reveals,
            and family celebrations we've had the pleasure of serving
            throughout South Florida.
          </p>

        </div>


        {/* =========================
            GALLERY
        ========================== */}
        <div className="rb-gallery-shell">

          <button
            type="button"
            onClick={previousGallery}
            aria-label="Previous celebration photos"
            className="rb-gallery-arrow"
          >
            ❮
          </button>


          <div className="rb-gallery-slider-grid">

            {visibleShowerImages.map((image, index) => (
              <div
                className="rb-event-card rb-gallery-slide-card"
                key={`${image}-${galleryStart}-${index}`}
              >
                <img
                  src={image}
                  alt={`Ready Bartending baby shower or gender reveal experience ${
                    ((galleryStart + index) % showerImages.length) + 1
                  }`}
                />
              </div>
            ))}

          </div>


          <button
            type="button"
            onClick={nextGallery}
            aria-label="Next celebration photos"
            className="rb-gallery-arrow"
          >
            ❯
          </button>

        </div>


        <p
          style={{
            textAlign: "center",
            marginTop: "15px",
            color: "rgba(255,255,255,0.7)",
            fontSize: "14px",
          }}
        >
          Browse our Ready Bartending celebration gallery
        </p>

      </section>


      {/* =========================
          WHAT WE OFFER
      ========================== */}
      <section className="rb-events-section">

        <div className="rb-event-detail-card">

          <div className="rb-event-detail-main">

            <p className="rb-events-eyebrow">
              MAKE IT YOURS
            </p>

            <h2 className="rb-event-detail-title">
              Drinks for Everyone
            </h2>

            <p className="rb-event-detail-description">
              Baby showers and gender reveals bring together
              all kinds of guests. We can create a bar experience
              with cocktails, mocktails, and non-alcoholic options
              so everyone has something special to enjoy.
            </p>


            <div className="rb-event-meta">

              <div className="rb-event-meta-row">
                <span className="rb-event-meta-label">
                  BAR
                </span>

                <span>
                  Professional bartenders, barbacks and mobile bar setups
                </span>
              </div>


              <div className="rb-event-meta-row">
                <span className="rb-event-meta-label">
                  DRINKS
                </span>

                <span>
                  Signature cocktails, mocktails, classic cocktails
                  and non-alcoholic beverage options
                </span>
              </div>


              <div className="rb-event-meta-row">
                <span className="rb-event-meta-label">
                  STAFF
                </span>

                <span>
                  Bartenders, servers and event support staff
                </span>
              </div>


              <div className="rb-event-meta-row">
                <span className="rb-event-meta-label">
                  DETAILS
                </span>

                <span>
                  Garnishes, coolers, bar equipment,
                  setup and cleanup options
                </span>
              </div>


              <div className="rb-event-meta-row">
                <span className="rb-event-meta-label">
                  CUSTOM
                </span>

                <span>
                  Personalized drink menus and bar experiences
                  designed around your celebration
                </span>
              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =========================
          SERVICE OPTIONS
      ========================== */}
      <section className="rb-events-section">

        <div
          className="rb-events-section-heading"
          style={{ textAlign: "center" }}
        >

          <p className="rb-events-eyebrow">
            HOWEVER YOU CELEBRATE
          </p>

          <h2>
            A Bar Experience That Fits Your Celebration
          </h2>

        </div>


        <div className="rb-events-grid rb-service-options-grid">

          <div className="rb-event-card">

            <div className="rb-event-card-body">

              <h3 className="rb-event-card-title">
                Full Bar Experience
              </h3>

              <p className="rb-event-card-subtitle">
                Let Ready take care of the bar experience with
                professional service, supplies, mixers, garnishes,
                and the details needed for your celebration.
              </p>

            </div>

          </div>


          <div className="rb-event-card">

            <div className="rb-event-card-body">

              <h3 className="rb-event-card-title">
                Event Staffing
              </h3>

              <p className="rb-event-card-subtitle">
                Already have your beverages and event setup?
                Add professional bartenders, servers, or support
                staff to keep your celebration running smoothly.
              </p>

            </div>

          </div>


          <div className="rb-event-card">

            <div className="rb-event-card-body">

              <h3 className="rb-event-card-title">
                Customized Service
              </h3>

              <p className="rb-event-card-subtitle">
                From themed signature drinks to mocktails and
                personalized bar service, we can help make the
                beverage experience part of your celebration.
              </p>

            </div>

          </div>

        </div>

      </section>


      {/* =========================
          FINAL CTA
      ========================== */}
      <section className="rb-events-section">

        <div className="rb-event-success-card">

          <p className="rb-events-eyebrow">
            YOU'VE GOT SOMETHING TO CELEBRATE. WE'LL STAY READY.
          </p>

          <h2 className="rb-event-success-title">
            Ready to Plan Your Celebration?
          </h2>

          <p className="rb-event-success-copy">
            Explore our event services and packages, select the
            experience that works best for your baby shower,
            gender reveal, or celebration, and tell us the details.
          </p>


          <div className="rb-event-cta-row">

            <Link
              to="/rb/event-staffing-packages"
              className="rb-event-btn"
            >
              View Event Services & Packages
            </Link>

          </div>

        </div>

      </section>

    </div>
  );
};

export default BabyShowers;