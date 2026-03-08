import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
const TZ = "America/New_York";

function formatMoney(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return value || "0.00";
  return num.toFixed(2);
}

function formatDisplayDate(value) {
  if (!value) return "";

  const raw = String(value).trim();

  // Full ISO datetime or parseable date string
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(parsed);
  }

  // Plain YYYY-MM-DD fallback
  const parts = raw.split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts.map(Number);
    if (yyyy && mm && dd) {
      const noonUTC = new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
      return new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(noonUTC);
    }
  }

  return raw;
}

function formatDisplayTime(value) {
  if (!value) return "";

  const raw = String(value).trim();

  // Case 1: full datetime
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && raw.includes("T")) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(parsed);
  }

  // Case 2: HH:mm or HH:mm:ss
  const parts = raw.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || 0);

  if (Number.isFinite(hour) && Number.isFinite(minute)) {
    const period = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
  }

  return raw;
}

function formatWhen(dateValue, timeValue) {
  const prettyDate = formatDisplayDate(dateValue);

  // If timeValue exists, use it.
  if (timeValue) {
    const prettyTime = formatDisplayTime(timeValue);
    return prettyTime ? `${prettyDate} at ${prettyTime}` : prettyDate;
  }

  // If dateValue itself is a full datetime, also show time from it.
  if (dateValue && String(dateValue).includes("T")) {
    const prettyTime = formatDisplayTime(dateValue);
    return prettyTime ? `${prettyDate} at ${prettyTime}` : prettyDate;
  }

  return prettyDate;
}

export default function EventSuccessPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const eventOrderId = searchParams.get("event_order_id");
  const title = searchParams.get("title");
  const date = searchParams.get("date");
  const time = searchParams.get("time");
  const session = searchParams.get("session");
  const ticket = searchParams.get("ticket");
  const email = searchParams.get("email");
  const amount = searchParams.get("amount");

  useEffect(() => {
    const finalize = async () => {
      if (!eventOrderId) {
        setError("Missing event order ID.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${apiUrl}/api/events/finalize-order`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            event_order_id: eventOrderId,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || "Failed to finalize order.");
        }

        setResult(json);
      } catch (err) {
        console.error(err);
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };

    finalize();
  }, [eventOrderId]);

  const displayTitle = useMemo(
    () => title || result?.order?.event_title || "Your Event",
    [title, result]
  );

  const displayTicket = useMemo(
    () => ticket || result?.order?.ticket_type_name || "Reserved Admission",
    [ticket, result]
  );

  const displayEmail = useMemo(
    () => email || result?.order?.buyer_email || result?.order?.email || "",
    [email, result]
  );

  const displayAmount = useMemo(
    () => formatMoney(amount || result?.order?.amount_paid),
    [amount, result]
  );

  const displayWhen = useMemo(() => {
    if (date || time) return formatWhen(date, time);
    return session || "See confirmation email";
  }, [date, time, session]);

  if (loading) {
    return (
      <div className="rb-event-success-wrap">
        <div className="rb-event-success-card">
          <p className="rb-event-success-eyebrow">Ready Bartending Events</p>
          <h1 className="rb-event-success-title">Finalizing Your Reservation...</h1>
          <p className="rb-event-success-copy">
            Please wait while we confirm your payment and lock in your spot.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rb-event-success-wrap">
        <div className="rb-event-success-card">
          <p className="rb-event-success-eyebrow">Reservation Update</p>
          <h1 className="rb-event-success-title">We Couldn't Confirm Your Reservation</h1>
          <p className="rb-event-success-copy">{error}</p>

          <div className="rb-event-success-details">
            <p>
              If your payment went through, please contact Ready Bartending and include
              your email receipt so we can verify your order quickly.
            </p>
          </div>

          <div className="rb-event-cta-row rb-event-success-actions">
            <Link to="/rb/events" className="rb-event-btn">
              View Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rb-event-success-wrap">
      <div className="rb-event-success-card">
        <p className="rb-event-success-eyebrow">Reservation Confirmed</p>
        <h1 className="rb-event-success-title">You're In !</h1>
        <p className="rb-event-success-copy">
          Your event reservation has been confirmed. We can’t wait to sip, mix,
          and create with you.
        </p>

        <div className="rb-event-success-highlight">
          <div className="rb-event-success-highlight-inner">
            <span className="rb-event-success-highlight-label">Booked Event</span>
            <h2 className="rb-event-success-highlight-title">{displayTitle}</h2>
            <p className="rb-event-success-highlight-when">
              {displayWhen || "See confirmation email"}
            </p>
          </div>
        </div>

        <div className="rb-event-success-details">
          <div className="rb-event-summary-row">
            <span className="rb-event-summary-label">Event</span>
            <span className="rb-event-summary-value">{displayTitle}</span>
          </div>

          <div className="rb-event-summary-row">
            <span className="rb-event-summary-label">When</span>
            <span className="rb-event-summary-value">
              {displayWhen || "See confirmation email"}
            </span>
          </div>

          <div className="rb-event-summary-row">
            <span className="rb-event-summary-label">Ticket</span>
            <span className="rb-event-summary-value">{displayTicket}</span>
          </div>

          <div className="rb-event-summary-row">
            <span className="rb-event-summary-label">Email</span>
            <span className="rb-event-summary-value">
              {displayEmail || "See confirmation email"}
            </span>
          </div>

          <div className="rb-event-summary-row">
            <span className="rb-event-summary-label">Amount Paid</span>
            <span className="rb-event-summary-value">${displayAmount}</span>
          </div>
        </div>

        <p className="rb-event-success-note">
          A confirmation email should arrive shortly. Be sure to save it for your records.
        </p>

        <div className="rb-event-cta-row rb-event-success-actions">
          <Link to="/rb/events" className="rb-event-btn">
            View More Events
          </Link>
        </div>
      </div>
    </div>
  );
}