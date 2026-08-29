import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";
import useSitePageContent from "../../../hooks/useSitePageContent";
import PageSEO from "../../../components/PageSEO";

const HomePage = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const { loading, sectionsByKey, seo } = useSitePageContent("home");
  const [googleReviewData, setGoogleReviewData] = useState(null);

  const hero = sectionsByKey.hero || {};
  const why = sectionsByKey.why_choose_us || {};
  const servicesIntro = sectionsByKey.services_intro || {};
  const serviceCards = sectionsByKey.service_cards?.content_json || [];
  const video = sectionsByKey.mobile_bar_video || {};
  const testimonials = sectionsByKey.testimonials?.content_json || [];

  useEffect(() => {
    let active = true;
    fetch(`${apiUrl}/api/public/google-reviews`)
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active && data?.reviews?.length) setGoogleReviewData(data); })
      .catch(() => {});
    return () => { active = false; };
  }, [apiUrl]);

  const displayedReviews = useMemo(() => {
    if (googleReviewData?.reviews?.length) {
      return googleReviewData.reviews.slice(0, 5).map((review) => ({
        title: `${review.rating.toFixed(0)}-star Google review`,
        body: review.text,
        name: review.author,
        rating: review.rating,
        source: 'Google',
        relativeTime: review.relativeTime,
      }));
    }
    return testimonials;
  }, [googleReviewData, testimonials]);

  if (loading) return <div className="rb-home">Loading...</div>;

  return (
    <div className="rb-home">

<PageSEO
  seo={seo}
  fallbackTitle="Bartending Services in Miami | Ready Bartending"
  fallbackDescription="Hire professional bartenders in Miami for weddings, private parties, and events. Mobile bartending services and cocktail classes across South Florida."
  fallbackUrl="https://readybartending.com/rb/home"
  fallbackImage="https://res.cloudinary.com/dtuqponwy/image/upload/photo_qsegmu.jpg"
/>

      {/* HERO */}
      <div className="hero">
        <p>{hero.subtitle}</p>

        <h1 className="fancy-heading">{hero.title}</h1>

        {hero.image_url && (
          <img
            src={hero.image_url}
            alt={hero.image_alt}
            className="private-bartending-image"
          />
        )}

        <p>{hero.body}</p>

        {hero.button_text && (
          <div className="buttons">
            <a href={hero.button_link} className="btn-primary">
              {hero.button_text}
            </a>
          </div>
        )}
      </div>

      <div className="gold-divider"></div>

      {/* WHY US */}
      <section className="certification-section">
        <div className="fancy-heading">
          <h3>{why.title}</h3>
        </div>

        <div className="certification-container">
          <div className="certification-logos">
            {why.content_json?.logos?.map((logo, i) => (
              <img key={i} src={logo.image_url} alt={logo.alt} className="cert-logo" />
            ))}
          </div>

          <div className="certification-text">
            <p>{why.body}</p>
          </div>
        </div>

        {why.content_json?.bottom_image_url && (
          <img
            src={why.content_json.bottom_image_url}
            alt={why.content_json.bottom_image_alt}
            className="stars-icon"
          />
        )}
      </section>

      <div className="gold-divider"></div>

      {/* SERVICES INTRO */}
      <section className="event-services">
        <div className="event-services-container">
          {servicesIntro.image_url && (
            <img src={servicesIntro.image_url} alt={servicesIntro.image_alt} className="services-icon" />
          )}
          <h2 className="fancy-heading">{servicesIntro.title}</h2>
          <p className="event-services-description">{servicesIntro.body}</p>
        </div>
      </section>

      {/* SERVICE CARDS */}
      <section className="services">
        <div className="service-cards">
          {serviceCards.map((card, i) => (
            <Link key={i} to={card.link} className="card-link">
              <div className="card">
                <img src={card.image_url} alt={card.image_alt} className="service-image" />
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="gold-divider"></div>

      {/* VIDEO */}
      <section className="video-section">
        <div className="video-container">
          <div className="video-text">
            <h2>{video.title}</h2>
            <p>{video.body}</p>
          </div>

          <div className="video-frame">
            {video.content_json?.youtube_url && (
              <iframe
                width="560"
                height="315"
                src={video.content_json.youtube_url}
                title="YouTube video"
                frameBorder="0"
                allowFullScreen
              ></iframe>
            )}
          </div>
        </div>
      </section>

      <div className="gold-divider"></div>

      {/* TESTIMONIALS */}
      <section>
        <h2 className="fancy-heading">What Our Clients Are Saying</h2>

        {googleReviewData && (
          <div className="google-review-summary">
            <strong>{googleReviewData.rating.toFixed(1)} <span aria-label={`${googleReviewData.rating} out of 5 stars`}>★★★★★</span></strong>
            <span>Based on {googleReviewData.reviewCount} Google reviews</span>
          </div>
        )}

        <div className="testimonial-cards">
          {displayedReviews.map((t, i) => (
            <div key={i} className="testimonial">
              <h3 className="testimonial-header">{t.title}</h3>
              {t.rating && <div className="testimonial-stars" aria-label={`${t.rating} out of 5 stars`}>{'★'.repeat(Math.round(t.rating))}</div>}
              <p>{t.body}</p>
              <p className="testimonial-name">
                ~ <em>{t.name}</em>
              </p>
              {t.source && <small className="testimonial-source">{t.source}{t.relativeTime ? ` · ${t.relativeTime}` : ''}</small>}
            </div>
          ))}
        </div>

        <div className="google-review-actions">
          <a href="https://www.google.com/maps/search/?api=1&query=Ready%20Bartending&query_place_id=ChIJdRhZttKgFQwRZRzUXtpzUIU" target="_blank" rel="noreferrer">Read reviews on Google</a>
          <a href="https://search.google.com/local/writereview?placeid=ChIJdRhZttKgFQwRZRzUXtpzUIU" target="_blank" rel="noreferrer">Leave a Google review</a>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
