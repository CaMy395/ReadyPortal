import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";
import useSitePageContent from "../../../hooks/useSitePageContent";
import PageSEO from "../../../components/PageSEO";

const HomePage = () => {
  const { loading, sectionsByKey, seo } = useSitePageContent("home");

  const hero = sectionsByKey.hero || {};
  const why = sectionsByKey.why_choose_us || {};
  const servicesIntro = sectionsByKey.services_intro || {};
  const serviceCards = sectionsByKey.service_cards?.content_json || [];
  const video = sectionsByKey.mobile_bar_video || {};
  const testimonials = sectionsByKey.testimonials?.content_json || [];

  const [showModal, setShowModal] = useState(false);
  const [birthdate, setBirthdate] = useState("");

  useEffect(() => {
    const isVerified = localStorage.getItem("age_verified");
    if (!isVerified) setShowModal(true);
  }, []);

  const handleVerify = () => {
    const birthDateObj = new Date(birthdate);
    const today = new Date();
    const age = today.getFullYear() - birthDateObj.getFullYear();
    const m = today.getMonth() - birthDateObj.getMonth();
    const d = today.getDate() - birthDateObj.getDate();

    const is21OrOlder = age > 21 || (age === 21 && (m > 0 || (m === 0 && d >= 0)));

    if (is21OrOlder) {
      localStorage.setItem("age_verified", "true");
      setShowModal(false);
    } else {
      alert("🚫 You must be at least 21 years old to enter this site.");
    }
  };

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

        <div className="testimonial-cards">
          {testimonials.map((t, i) => (
            <div key={i} className="testimonial">
              <h3 className="testimonial-header">{t.title}</h3>
              <p>{t.body}</p>
              <p className="testimonial-name">
                ~ <em>{t.name}</em>
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default HomePage;