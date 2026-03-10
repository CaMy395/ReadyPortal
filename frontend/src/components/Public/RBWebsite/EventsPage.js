import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../../RB.css";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

function formatEventDate(dateString) {
  if (!dateString) return "";

  const raw = String(dateString).trim();

  // ✅ Safely handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    const safeDate = new Date(y, m - 1, d);

    return safeDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  // ✅ Safely handle ISO strings like 2026-03-17T00:00:00.000Z
  // by extracting just the date portion first
  const isoDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  if (isoDateMatch) {
    const [, y, m, d] = isoDateMatch;
    const safeDate = new Date(Number(y), Number(m) - 1, Number(d));

    return safeDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleDateString("en-US", {
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
            Sip • Mix • Create. Explore Ready Bartending experiences, themed
            classes, holiday events, and pop-up cocktail moments.
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
                <div className="rb-event-card-image-wrap">
                  <img
                    src={`${apiUrl}/api/events/${event.id}/image`}
                    loading="lazy"
                    alt={event.title}
                    className="rb-event-card-image"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.parentElement.querySelector(
                        ".rb-event-card-image-placeholder"
                      );
                      if (fallback) fallback.style.display = "flex";
                    }}
                  />

                  <div
                    className="rb-event-card-image-placeholder"
                    style={{ display: "none" }}
                  >
                    <span>{event.title}</span>
                  </div>
                </div>

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
                      <span>{event.location_name || "TBA"}</span>
                    </div>

                    <div className="rb-event-meta-row">
                      <span className="rb-event-meta-label">Starting</span>
                      <span>
                        {event.starting_price
                          ? `$${Number(event.starting_price).toFixed(2)}`
                          : "Coming soon"}
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