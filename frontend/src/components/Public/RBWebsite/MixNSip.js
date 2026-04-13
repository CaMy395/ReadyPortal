import React from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";
import { Helmet } from "react-helmet-async";
import useSitePageContent from "../../../hooks/useSitePageContent";

const MixNSip = () => {
  const { loading, sectionsByKey, seo } = useSitePageContent("mix_n_sip");

  const hero = sectionsByKey.hero || {};
  const videoSection = sectionsByKey.video_section || {};
  const includedSection = sectionsByKey.included_section || {};
  const hoursSection = sectionsByKey.hours_operation || {};

  const heroPricing = hero.content_json?.pricing || {};
  const heroVideoUrl = hero.content_json?.hero_video_url || "/MixHero.mp4";

  const youtubeUrl =
    videoSection.content_json?.youtube_url ||
    "https://www.youtube.com/embed/td1-Aw3E8Xg";

  const inPersonIncludes = Array.isArray(includedSection.content_json?.in_person_includes)
    ? includedSection.content_json.in_person_includes
    : [
        "Bar tools",
        "Cocktail materials",
        "Aprons provided for use during the experience",
      ];

  const virtualOptions = Array.isArray(includedSection.content_json?.virtual_options)
    ? includedSection.content_json.virtual_options
    : [
        "Live guided mixology instruction",
        "Optional bar tools add-on",
        "Optional materials add-on",
      ];

  const enhancements = Array.isArray(includedSection.content_json?.enhancements)
    ? includedSection.content_json.enhancements
    : [
        "Light Bites Experience",
        "Take-Home Custom Vinyl Apron",
        "Patron Reusable Cup",
        "Hookah with refills",
      ];

  const hoursList = Array.isArray(hoursSection.content_json?.hours)
    ? hoursSection.content_json.hours
    : [
        { day: "Monday", hours: "12:30pm–10:30pm" },
        { day: "Tuesday", hours: "12:30pm–10:30pm" },
        { day: "Wednesday", hours: "12:30pm–10:30pm" },
        { day: "Thursday", hours: "12:30pm–10:30pm" },
        { day: "Friday", hours: "12:30pm–12:30am" },
        { day: "Saturday", hours: "12:30pm–12:30am" },
        { day: "Sunday", hours: "12:30pm–10:30pm" },
      ];

  if (loading) return <div className="crafts-page">Loading...</div>;

  return (
    <div className="crafts-page">
      <Helmet>
        <title>{seo?.seo_title || "Mix N Sip | Ready Bartending"}</title>
        <meta name="description" content={seo?.seo_description || ""} />
        <meta name="keywords" content={seo?.seo_keywords || ""} />

        <meta property="og:title" content={seo?.og_title || ""} />
        <meta property="og:description" content={seo?.og_description || ""} />
        <meta property="og:image" content={seo?.og_image_url || ""} />

        <link rel="canonical" href={seo?.canonical_url || ""} />
        {seo?.noindex && <meta name="robots" content="noindex,nofollow" />}
      </Helmet>

      {/* Hero Section */}
      <div className="hero-content-mix">
        <video autoPlay muted loop playsInline className="hero-video">
          <source src={heroVideoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        <div className="hero-overlay">
          <p>{hero.subtitle || "Mixology"}</p>
          <h1 className="fancy-heading">{hero.title || "Mix N' Sip"}</h1>

          <p>
            {hero.body ||
              "Visit Ready Bar to learn how to create 3 classic or signature Ready drinks while enjoying an intimate or group experience with loved ones. This service includes both virtual and in-person options, with fun activities to keep the energy going between cocktails."}
          </p>

          <p>
            <strong>In-Person Group Pricing:</strong>{" "}
            {heroPricing.in_person_group || "$75 per person."}
          </p>
          <p>
            <strong>Private In-Person Experience:</strong>{" "}
            {heroPricing.private_in_person ||
              "Smaller groups are welcome and are booked as a private session at a flat rate of $200."}
          </p>
          <p>
            <strong>Virtual:</strong> {heroPricing.virtual || "$50 per person."}
          </p>

          <p>
            {hero.content_json?.extra_body ||
              "In person, we provide the bar tools and cocktail materials while teaching basic bar knowledge you can take home with you. Virtually, you can choose whether you’d like to provide your own tools and materials or add them to your experience."}
          </p>

          <Link
            to={hero.button_link || "/mix-n-sip"}
            className="book-button"
          >
            {hero.button_text || "BOOK MIX N' SIP"}
          </Link>
        </div>
      </div>

      <div className="gold-divider"></div>

      {/* Video Section */}
      <section className="video-section">
        <div className="video-container">
          <div className="video-text">
            <h2>{videoSection.title || "Mix N' Sip"}</h2>
            <p>
              {videoSection.body ||
                "Book date night, a casual get together, or even a special occasion. Learn how to create your favorite cocktails and enjoy a fun, elevated experience along the way."}
            </p>
            <p>
              {videoSection.content_json?.secondary_body ||
                "Hosting a smaller in-person celebration? We also offer a private session option for a more intimate, curated experience."}
            </p>
          </div>

          <div className="video-frame">
            <iframe
              width="560"
              height="315"
              src={youtubeUrl}
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
            src={includedSection.image_url || "/MixNSip_hero.jpg"}
            alt={includedSection.image_alt || "Mix N' Sip"}
            className="crafts-image"
          />
          <div className="crafts-text">
            <h2 className="fancy-heading">
              {includedSection.title || "What's Included?"}
            </h2>
            <p>
              {includedSection.body ||
                "When you book Mix N' Sip, you’ll be provided with the tools and guidance you need for a fun, memorable class. Just bring your energy and good vibes."}
            </p>

            <h3>
              {includedSection.content_json?.in_person_heading ||
                "In-Person Includes:"}
            </h3>
            <ul>
              {inPersonIncludes.map((item, idx) => (
                <li key={`in-person-${idx}`}>{item}</li>
              ))}
            </ul>

            <h3>
              {includedSection.content_json?.virtual_heading || "Virtual Options:"}
            </h3>
            <ul>
              {virtualOptions.map((item, idx) => (
                <li key={`virtual-${idx}`}>{item}</li>
              ))}
            </ul>

            <h3>
              {includedSection.content_json?.enhancements_heading ||
                "Enhance Your Experience"}
            </h3>
            <ul>
              {enhancements.map((item, idx) => (
                <li key={`enhance-${idx}`}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="gold-divider"></div>

      {/* Hours of Operation */}
      <section className="hours-operation">
        <h2 className="fancy-heading">
          {hoursSection.title || "Hours of Operation"}
        </h2>
        <ul>
          {hoursList.map((item, idx) => (
            <li key={idx}>
              {item.day}: {item.hours}
            </li>
          ))}
        </ul>
        <p>
          {hoursSection.body ||
            "Our classes are offered during these times. Complete the booking process to see availability."}
        </p>
      </section>
    </div>
  );
};

export default MixNSip;