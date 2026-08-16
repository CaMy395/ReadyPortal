import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";

const Weddings = () => {
  const weddingImages = [
    "/wedding1.png",
    "/wedding2.png",
    "/wedding3.png",
    "/wedding4.png",
    "/wedding5.png",
    "/wedding6.png",
    "/wedding7.png",
    "/wedding8.png",
    "/wedding9.png",
  ];

  const [galleryStart, setGalleryStart] = useState(0);

  const visibleWeddingImages = [
    weddingImages[galleryStart % weddingImages.length],
    weddingImages[(galleryStart + 1) % weddingImages.length],
    weddingImages[(galleryStart + 2) % weddingImages.length],
  ];

  const nextGallery = () => {
    setGalleryStart(
      (prev) => (prev + 1) % weddingImages.length
    );
  };

  const previousGallery = () => {
    setGalleryStart(
      (prev) =>
        (prev - 1 + weddingImages.length) %
        weddingImages.length
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
            "linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.65)), url('/wedding8.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="rb-events-hero-inner">

          <p className="rb-events-eyebrow">
            READY BARTENDING WEDDINGS
          </p>

          <h1 className="rb-events-title">
            Your Day. Your Bar. Your Experience.
          </h1>

          <p className="rb-events-subtitle">
            From intimate ceremonies to full wedding receptions,
            Ready Bartending brings professional bar service,
            beautiful presentation, and a customized experience
            to your celebration.
          </p>

        </div>
      </section>


      {/* =========================
          PAST WEDDINGS
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
            Weddings We've Been Ready For
          </h2>

          <p>
            Take a look at some of the weddings and celebrations
            we've had the pleasure of serving throughout South Florida.
          </p>

        </div>


        {/* =========================
            WEDDING GALLERY
        ========================== */}
        <div className="rb-gallery-shell">

          <button
            type="button"
            onClick={previousGallery}
            aria-label="Previous wedding photos"
            className="rb-gallery-arrow"
          >
            ❮
          </button>


          <div className="rb-gallery-slider-grid">

            {visibleWeddingImages.map((image, index) => (
              <div
                className="rb-event-card rb-gallery-slide-card"
                key={`${image}-${galleryStart}-${index}`}
              >
                <img
                  src={image}
                  alt={`Ready Bartending wedding experience ${
                    ((galleryStart + index) % weddingImages.length) + 1
                  }`}
                />
              </div>
            ))}

          </div>


          <button
            type="button"
            onClick={nextGallery}
            aria-label="Next wedding photos"
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
          Browse our Ready Bartending wedding gallery
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
              More Than Just Bartending
            </h2>

            <p className="rb-event-detail-description">
              Your wedding bar should fit your celebration.
              We can help create an experience that works with
              your venue, guest count, vision, and service needs.
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
                  Signature cocktails, classic cocktails,
                  beer, wine and champagne service
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
                  Bar experiences tailored to your wedding style
                  and guest count
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
            A Bar Experience That Fits Your Wedding
          </h2>

        </div>


        <div className="rb-events-grid rb-service-options-grid">

          <div className="rb-event-card">

            <div className="rb-event-card-body">

              <h3 className="rb-event-card-title">
                Full Bar Experience
              </h3>

              <p className="rb-event-card-subtitle">
                Looking for more than staffing? Build a complete
                Ready Bartending experience with bar service,
                supplies and the details needed for your celebration.
              </p>

            </div>

          </div>


          <div className="rb-event-card">

            <div className="rb-event-card-body">

              <h3 className="rb-event-card-title">
                Event Staffing
              </h3>

              <p className="rb-event-card-subtitle">
                Already have your alcohol, venue and setup?
                Add professional bartenders, servers or support
                staff to keep your wedding running smoothly.
              </p>

            </div>

          </div>


          <div className="rb-event-card">

            <div className="rb-event-card-body">

              <h3 className="rb-event-card-title">
                Customized Service
              </h3>

              <p className="rb-event-card-subtitle">
                Signature drinks, mobile bars and personalized
                service options can help make your wedding bar
                feel like part of the celebration.
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
            YOU'VE GOT THE DATE. WE'LL STAY READY.
          </p>

          <h2 className="rb-event-success-title">
            Ready to Build Your Wedding Bar?
          </h2>

          <p className="rb-event-success-copy">
            Explore our event services and packages, select the
            experience that works best for your wedding, and
            tell us the details of your celebration.
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

export default Weddings;