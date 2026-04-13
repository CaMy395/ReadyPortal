import React from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";
import { Helmet } from "react-helmet-async";
import useSitePageContent from "../../../hooks/useSitePageContent";

const CraftsAndCocktails = () => {
  const { loading, sectionsByKey, seo } = useSitePageContent("crafts_cocktails");

  const hero = sectionsByKey.hero || {};
  const videoSection = sectionsByKey.video_section || {};
  const includedSection = sectionsByKey.included_section || {};
  const hoursSection = sectionsByKey.hours_operation || {};

  const heroPricing = hero.content_json?.pricing || {};
  const heroExtraParagraphs = Array.isArray(hero.content_json?.extra_paragraphs)
    ? hero.content_json.extra_paragraphs
    : [];

  const youtubeUrl =
    videoSection.content_json?.youtube_url ||
    "https://www.youtube.com/embed/NzM0Ldz5zBY";

  const videoSecondaryBody =
    videoSection.content_json?.secondary_body ||
    "Hosting a smaller celebration? We also offer a private session option for a more intimate, curated experience.";

  const includedItems = Array.isArray(includedSection.content_json?.included_items)
    ? includedSection.content_json.included_items
    : [
        "Aprons",
        "Craft supplies",
        "Cocktails",
        "Liquor bottles to decorate",
      ];

  const addOnItems = Array.isArray(includedSection.content_json?.add_on_items)
    ? includedSection.content_json.add_on_items
    : [
        "Customized Aprons",
        "Extra Patron Bottle",
        "Hookah with Refills",
      ];

  const hoursList = Array.isArray(hoursSection.content_json?.hours)
    ? hoursSection.content_json.hours
    : [
        { day: "Monday", hours: "12:30pm–10:30pm" },
        { day: "Tuesday", hours: "12:30pm–10:30pm" },
        { day: "Wednesday", hours: "12:30pm–10:30pm" },
        { day: "Thursday", hours: "12:30pm–10:30pm" },
        { day: "Friday", hours: "12:30pm–10:30pm" },
        { day: "Saturday", hours: "12:30pm–10:30pm" },
        { day: "Sunday", hours: "12:30pm–10:30pm" },
      ];

  if (loading) return <div className="crafts-page">Loading...</div>;

  return (
    <div className="crafts-page">
      <Helmet>
        <title>{seo?.seo_title || "Crafts & Cocktails | Ready Bartending"}</title>
        <meta name="description" content={seo?.seo_description || ""} />
        <meta name="keywords" content={seo?.seo_keywords || ""} />

        <meta property="og:title" content={seo?.og_title || ""} />
        <meta property="og:description" content={seo?.og_description || ""} />
        <meta property="og:image" content={seo?.og_image_url || ""} />

        <link rel="canonical" href={seo?.canonical_url || ""} />
        {seo?.noindex && <meta name="robots" content="noindex,nofollow" />}
      </Helmet>

      {/* Hero Section */}
      <div className="hero-content-crafts">
        <p>{hero.subtitle || "Unleash Your Creativity"}</p>
        <h1 className="fancy-heading">{hero.title || "Crafts & Cocktails"}</h1>

        <p>
          {hero.body ||
            "Visit Ready Bar to learn how to create your favorite cocktails while unleashing your creativity! This service includes a fun craft portion that will keep you entertained while you sip on personally made cocktails from scratch."}
        </p>

        {heroExtraParagraphs.length > 0 ? (
          heroExtraParagraphs.map((paragraph, idx) => <p key={idx}>{paragraph}</p>)
        ) : (
          <>
            <p>
              We’ll provide you with your own liquor bottle to decorate and customize. Once your art is complete
              and dry, you’ll fill it with your cocktail of choice to take home with you, creating a unique
              and personal keepsake from your experience!
            </p>
          </>
        )}

        <p>
          <strong>Group pricing:</strong>{" "}
          {heroPricing.group || "$85 per person."}
        </p>
        <p>
          <strong>Private experience pricing:</strong>{" "}
          {heroPricing.private ||
            "Smaller groups are welcome and are booked as a private session at a flat rate of $220."}
        </p>
        <p>
          {heroPricing.note ||
            "Perfect for birthdays, date nights, and more intimate celebrations with an elevated, personalized experience."}
        </p>

        <Link
          to={hero.button_link || "/craft-cocktails"}
          className="book-button"
        >
          {hero.button_text || "BOOK CRAFTS & COCKTAILS"}
        </Link>
      </div>

      <div className="gold-divider"></div>

      {/* Video Section */}
      <section className="video-section">
        <div className="video-container">
          <div className="video-text">
            <h2>{videoSection.title || "Crafts & Cocktails"}</h2>
            <p>
              {videoSection.body ||
                "Book date night, a casual get together, or even a special occasion! Learn how to create your favorite cocktail and sip while you decorate your reusable bottles."}
            </p>
            <p>{videoSecondaryBody}</p>
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
            src={includedSection.image_url || "/CraftsCocktailsImage.jpg"}
            alt={includedSection.image_alt || "Crafts & Cocktails"}
            className="crafts-image"
          />
          <div className="crafts-text">
            <h2 className="fancy-heading">
              {includedSection.title || "What's Included?"}
            </h2>
            <p>
              {includedSection.body ||
                "When you book the Crafts & Cocktails classes, you will be provided with all the tools you need to succeed. Just bring your creativity and good vibes!"}
            </p>

            <h3>
              {includedSection.content_json?.included_heading || "We will be providing:"}
            </h3>
            <ul>
              {includedItems.map((item, idx) => (
                <li key={`included-${idx}`}>{item}</li>
              ))}
            </ul>

            <h3>
              {includedSection.content_json?.addons_heading || "Add-Ons"}
            </h3>
            <ul>
              {addOnItems.map((item, idx) => (
                <li key={`addon-${idx}`}>{item}</li>
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
            "Our classes are offered at these times. Please complete the booking process to see availability."}
        </p>
      </section>
    </div>
  );
};

export default CraftsAndCocktails;