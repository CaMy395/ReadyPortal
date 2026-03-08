import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import "../../../RB.css";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function EventDetailsPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedTicketType, setSelectedTicketType] = useState("");
  const [form, setForm] = useState({
    client_name: "",
    client_email: "",
    client_phone: "",
    quantity: 1,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/api/events/${slug}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        if (json?.sessions?.[0]) setSelectedSession(json.sessions[0].id);
        if (json?.ticketTypes?.[0]) setSelectedTicketType(json.ticketTypes[0].id);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [slug]);


  const { event, sessions = [], ticketTypes = [] } = data || {};

  const chosenSession = useMemo(
    () => sessions.find((s) => String(s.id) === String(selectedSession)),
    [sessions, selectedSession]
  );

  const chosenTicket = useMemo(
    () => ticketTypes.find((t) => String(t.id) === String(selectedTicketType)),
    [ticketTypes, selectedTicketType]
  );

  const quantity = Number(form.quantity || 1);
  const attendeeCount =
    quantity * Number(chosenTicket?.quantity_per_purchase || 1);

  const totalPrice = chosenTicket
    ? Number(chosenTicket.price || 0) * quantity
    : 0;

  const handleCheckout = async () => {
    if (!data?.event?.id) return;
    if (!selectedSession || !selectedTicketType) {
      alert("Please choose a session and ticket type.");
      return;
    }
    if (!form.client_name || !form.client_email) {
      alert("Please enter your name and email.");
      return;
    }

    try {
      setSubmitting(true);

      const chosenSession = sessions.find(
        (s) => String(s.id) === String(selectedSession)
      );
      const chosenTicket = ticketTypes.find(
        (t) => String(t.id) === String(selectedTicketType)
      );

      if (!chosenSession || !chosenTicket) {
        alert("Invalid session or ticket selection.");
        return;
      }

      const quantity = Number(form.quantity || 1);
      const attendeeCount =
        quantity * Number(chosenTicket.quantity_per_purchase || 1);

      const startText = new Date(chosenSession.start_time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });
      const endText = new Date(chosenSession.end_time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      });

      const res = await fetch(`${apiUrl}/api/create-payment-link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.client_email,
          amount: Number(chosenTicket.price) * quantity,
          itemName: `${data.event.title} - ${chosenTicket.name}`,
          flow: "event",
          eventData: {
            event_id: data.event.id,
            session_id: chosenSession.id,
            ticket_type_id: chosenTicket.id,
            client_name: form.client_name,
            client_email: form.client_email,
            client_phone: form.client_phone,
            quantity,
            attendee_count: attendeeCount,
            ticket_type_name: chosenTicket.name,
            title: data.event.title,
            session_label: chosenSession.session_label,
            date: data.event.event_date,
            time: `${startText} - ${endText}`,
            source: "eventpage",
          },
        }),
      });

      const text = await res.text();
      let json = {};

      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error("Non-JSON response:", text);
        throw new Error("Server returned an invalid response.");
      }

      if (!res.ok) {
        alert(json.error || "Failed to create checkout.");
        return;
      }

      window.location.href = json.url;
    } catch (err) {
      console.error(err);
      alert(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="rb-event-loading">Loading event...</div>;
  if (!data?.event) return <div className="rb-event-error">Event not found.</div>;

  const formattedDate = new Date(event.event_date).toLocaleDateString(
  "en-US",
  {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }
);

  return (
    <div className="rb-events-page">
      <div className="rb-event-detail-wrap">
        <div className="rb-event-detail-card">
          {(event.image_url || event.flyer_url) && (
            <div className="rb-event-detail-hero-image-wrap">
              <img
                src={event.image_url || event.flyer_url}
                alt={event.title}
                className="rb-event-detail-hero-image"
              />
            </div>
          )}

          <div className="rb-event-detail-top">
            <div className="rb-event-detail-main">
              <p className="rb-events-eyebrow">Ready Bartending Event</p>
              <h1 className="rb-event-detail-title">{event.title}</h1>

              {event.subtitle && (
                <p className="rb-event-detail-subtitle">{event.subtitle}</p>
              )}

              {event.description && (
                <p className="rb-event-detail-description">{event.description}</p>
              )}

              <div className="rb-event-summary-box">
                <div className="rb-event-summary-row">
                  <span className="rb-event-summary-label">Location</span>
                  <span className="rb-event-summary-value">{event.location_name}</span>
                </div>
                <div className="rb-event-summary-row">
                  <span className="rb-event-summary-label">Address</span>
                  <span className="rb-event-summary-value">
                    {event.address_line1}, {event.city}, {event.state} {event.zip}
                  </span>
                </div>
                <div className="rb-event-summary-row">
                  <span className="rb-event-summary-label">Date</span>
                  <span className="rb-event-summary-value">{formattedDate}</span>                </div>
              </div>
            </div>

            <div className="rb-event-detail-side">
              <h3 className="rb-event-detail-section-title">Choose Session</h3>
              <div className="rb-event-session-list">
                {sessions.map((session) => (
                  <label key={session.id} className="rb-event-option">
                    <input
                      type="radio"
                      name="session"
                      value={session.id}
                      checked={String(selectedSession) === String(session.id)}
                      onChange={() => setSelectedSession(session.id)}
                    />
                    {session.session_label} —{" "}
                    {new Date(session.start_time).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    to{" "}
                    {new Date(session.end_time).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </label>
                ))}
              </div>

              <h3 className="rb-event-detail-section-title">Choose Ticket Type</h3>
              <div className="rb-event-ticket-list">
                {ticketTypes.map((ticket) => (
                  <label key={ticket.id} className="rb-event-option">
                    <input
                      type="radio"
                      name="ticketType"
                      value={ticket.id}
                      checked={String(selectedTicketType) === String(ticket.id)}
                      onChange={() => setSelectedTicketType(ticket.id)}
                    />
                    {ticket.name} — ${ticket.price}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="gold-divider"></div>

          <div className="rb-event-detail-main">
            <h3 className="rb-event-detail-section-title">Your Info</h3>

            <div className="rb-event-form-grid">
              <div className="rb-event-full">
                <input
                  className="rb-event-input"
                  type="text"
                  placeholder="Full Name"
                  value={form.client_name}
                  onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                />
              </div>

              <input
                className="rb-event-input"
                type="email"
                placeholder="Email"
                value={form.client_email}
                onChange={(e) => setForm({ ...form, client_email: e.target.value })}
              />

              <input
                className="rb-event-input"
                type="text"
                placeholder="Phone"
                value={form.client_phone}
                onChange={(e) => setForm({ ...form, client_phone: e.target.value })}
              />

              <div className="rb-event-full">
                <input
                  className="rb-event-input"
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
            </div>

            <div className="rb-event-summary-box">
              <div className="rb-event-summary-row">
                <span className="rb-event-summary-label">Ticket</span>
                <span className="rb-event-summary-value">
                  {chosenTicket?.name || "-"}
                </span>
              </div>
              <div className="rb-event-summary-row">
                <span className="rb-event-summary-label">Attendees</span>
                <span className="rb-event-summary-value">{attendeeCount || 0}</span>
              </div>
              <div className="rb-event-summary-row">
                <span className="rb-event-summary-label">Total</span>
                <span className="rb-event-summary-value">
                  ${Number(totalPrice || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="rb-event-cta-row">
              <button
                className="rb-event-btn"
                onClick={handleCheckout}
                disabled={submitting}
                type="button"
              >
                {submitting ? "Redirecting..." : "Reserve Your Spot"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}