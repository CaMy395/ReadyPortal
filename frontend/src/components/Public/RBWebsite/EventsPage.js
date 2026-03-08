import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

function formatEventDate(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);

  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/events`)
      .then((res) => res.json())
      .then((data) => setEvents(data || []))
      .catch((err) => {
        console.error("Failed to load events:", err);
        setEvents([]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="rb-event-loading">Loading events...</div>;
  }

  return (
    <div className="rb-events-page">
      <section className="rb-events-hero">
        <div className="rb-events-hero-inner">
          <p className="rb-events-eyebrow">Ready Bartending Experiences</p>
          <h1 className="rb-events-title">Upcoming Events</h1>
          <p className="rb-events-subtitle">
            Sip • Mix • Create. Explore Ready Bartending experiences, themed classes,
            holiday events, and pop-up cocktail moments.
          </p>
        </div>
      </section>

      <div className="gold-divider"></div>

      <section className="rb-events-section">
        {events.length === 0 ? (
          <div className="rb-event-empty">
            <h3>No upcoming events right now.</h3>
            <p>Please check back soon for the next Ready Bartending experience.</p>
          </div>
        ) : (
          <div className="rb-events-grid">
            {events.map((event) => (
              <article key={event.id} className="rb-event-card">
                {(event.image_url || event.flyer_url) ? (
                  <div className="rb-event-card-image-wrap">
                    <img
                      src={event.image_url || event.flyer_url}
                      alt={event.title}
                      className="rb-event-card-image"
                    />
                  </div>
                ) : (
                  <div className="rb-event-card-image-wrap rb-event-card-image-placeholder">
                    <span>{event.title}</span>
                  </div>
                )}

                <div className="rb-event-card-body">
                  <h3 className="rb-event-card-title">{event.title}</h3>

                  {event.subtitle && (
                    <p className="rb-event-card-subtitle">{event.subtitle}</p>
                  )}

                  <div className="rb-event-meta">
                    <div className="rb-event-meta-row">
                      <span className="rb-event-meta-label">Date</span>
                      <span>{formatEventDate(event.event_date)}</span>
                    </div>

                    <div className="rb-event-meta-row">
                      <span className="rb-event-meta-label">Location</span>
                      <span>{event.location_name}</span>
                    </div>

                    <div className="rb-event-meta-row">
                      <span className="rb-event-meta-label">Starting</span>
                      <span>
                        {event.starting_price ? `$${event.starting_price}` : "Coming soon"}
                      </span>
                    </div>
                  </div>

                  <div className="rb-event-card-footer">
                    <Link to={`/rb/events/${event.slug}`} className="rb-event-btn">
                      View Event
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}