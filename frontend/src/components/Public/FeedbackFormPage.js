import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const FeedbackFormPage = () => {
  const { token } = useParams();
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const [serviceType, setServiceType] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [gig, setGig] = useState(null);
  const [staff, setStaff] = useState([]);

  const [overallRating, setOverallRating] = useState(5);
  const [overallComment, setOverallComment] = useState("");
  const [wantsPublicReview, setWantsPublicReview] = useState(true);

  const [staffRatings, setStaffRatings] = useState({});

  const niceDate = (raw) => {
    if (!raw) return "";
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const serviceTitle = useMemo(() => {
    if (serviceType === "gig") return gig?.title || gig?.event_type || "Your Event";
    if (serviceType === "appointment") return appointment?.title || "Your Appointment";
    return "Your Service";
  }, [serviceType, gig, appointment]);

  const serviceDate = useMemo(() => {
    if (serviceType === "gig") return niceDate(gig?.date);
    if (serviceType === "appointment") return niceDate(appointment?.date);
    return "";
  }, [serviceType, gig, appointment]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`${apiUrl}/api/feedback/${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(data?.error || "Invalid link.");

        if (data?.alreadySubmitted) {
          setAlreadySubmitted(true);
          return;
        }

        setServiceType(data?.serviceType || null);
        setAppointment(data?.appointment || null);
        setGig(data?.gig || null);

        const staffArr = Array.isArray(data?.staff) ? data.staff : [];
        setStaff(staffArr);

        // defaults
        const defaults = {};
        staffArr.forEach((s) => {
          if (s?.id) defaults[String(s.id)] = 5;
        });
        setStaffRatings(defaults);
      } catch (e) {
        setError(e.message || "Failed to load feedback form.");
      } finally {
        setLoading(false);
      }
    };

    if (token) load();
  }, [token, apiUrl]);

  const StarRow = ({ value, onChange }) => {
    return (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            style={{
              border: "1px solid #ddd",
              background: value === n ? "#111" : "#fff",
              color: value === n ? "#fff" : "#111",
              borderRadius: 12,
              padding: "10px 12px",
              fontWeight: 800,
              cursor: "pointer",
              minWidth: 70,
            }}
            aria-label={`${n} stars`}
          >
            {"⭐".repeat(n)}
          </button>
        ))}
      </div>
    );
  };

  const submit = async (e) => {
    e.preventDefault();

    const staffPayload = Object.entries(staffRatings).map(([id, rating]) => ({
      staffUserId: Number(id),
      rating: Number(rating),
    }));

    try {
      const res = await fetch(`${apiUrl}/api/feedback/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overall_rating: Number(overallRating),
          overall_comment: overallComment || "",
          staffRatings: staffPayload,
          wants_public_review: Boolean(wantsPublicReview),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Submission failed.");

      if (data?.googleReviewUrl) {
        window.location.href = data.googleReviewUrl;
        return;
      }

      setAlreadySubmitted(true);
    } catch (e2) {
      alert(e2.message || "Submission failed.");
    }
  };

  if (loading) return <div style={{ padding: 40, color: "#111" }}>Loading...</div>;
  if (error) return <div style={{ padding: 40, color: "#900" }}>{error}</div>;
  if (alreadySubmitted)
    return (
      <div style={{ padding: 40, color: "#fff" }}>
        Thank you for your feedback 🥂
      </div>
    );

  const sectionBox = {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 18,
    padding: 18,
  };

  const sectionTitle = {
    margin: 0,
    marginBottom: 10,
    color: "#111",
    fontSize: 16,
    fontWeight: 900,
  };

  const sectionHint = {
    marginTop: 0,
    marginBottom: 12,
    color: "#555",
    fontSize: 13,
    lineHeight: 1.35,
  };

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "60px auto",
        padding: 20,
        fontFamily: "Arial, sans-serif",
        color: "#111",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 22,
          padding: 26,
          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, color: "#111" }}>Tell us how we did.</h2>
            <div style={{ marginTop: 6, color: "#444", fontSize: 13 }}>
              Your feedback helps us keep the experience premium.
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900, color: "#111" }}>{serviceTitle}</div>
            {serviceDate ? <div style={{ color: "#555", fontSize: 13 }}>{serviceDate}</div> : null}
          </div>
        </div>

        <form onSubmit={submit} style={{ marginTop: 18, display: "grid", gap: 14 }}>
          {/* 1) Overall */}
          <div style={sectionBox}>
            <h3 style={sectionTitle}>1) Overall experience</h3>
            <p style={sectionHint}>How would you rate your overall service?</p>
            <StarRow value={overallRating} onChange={setOverallRating} />
          </div>

          {/* 2) Staff */}
          <div style={sectionBox}>
            <h3 style={sectionTitle}>2) Rate the team</h3>
            {staff.length === 0 ? (
              <p style={sectionHint}>
                No staff were listed for this service. If this is incorrect, you can still submit overall feedback.
              </p>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {staff.map((s) => (
                  <div key={s.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 14, background: "#fafafa" }}>
                    <div style={{ fontWeight: 900, color: "#111", marginBottom: 8 }}>
                      {s.name || "Staff Member"}
                    </div>
                    <StarRow
                      value={staffRatings[String(s.id)] || 5}
                      onChange={(n) =>
                        setStaffRatings((prev) => ({ ...prev, [String(s.id)]: n }))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3) Comments */}
          <div style={sectionBox}>
            <h3 style={sectionTitle}>3) Comments</h3>
            <p style={sectionHint}>Tell us what you loved, or what you’d like improved.</p>
            <textarea
              value={overallComment}
              onChange={(e) => setOverallComment(e.target.value)}
              placeholder="Type your feedback here..."
              rows={4}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 12,
                border: "1px solid #ddd",
                fontSize: 14,
                color: "#111",
                outline: "none",
              }}
            />
          </div>
{/* 4) Public review */}
<div
  style={{
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 18,
    padding: 18,
  }}
>
  <h3
    style={{
      margin: 0,
      marginBottom: 10,
      color: "#111",
      fontSize: 16,
      fontWeight: 900,
    }}
  >
    4) Public review
  </h3>

  <p
    style={{
      marginTop: 0,
      marginBottom: 16,
      color: "#555",
      fontSize: 13,
      textAlign: "center",
    }}
  >
    If you had a great experience, would you be open to sharing it publicly on Google?
  </p>

  <div
    style={{
      display: "flex",
      justifyContent: "center",
      gap: 16,
      flexWrap: "wrap",
    }}
  >
    {/* YES */}
    <button
      type="button"
      onClick={() => setWantsPublicReview(true)}
      style={{
        border: "1px solid #ddd",
        background: wantsPublicReview === true ? "#111" : "#fff",
        color: wantsPublicReview === true ? "#fff" : "#111",
        borderRadius: 999,
        padding: "10px 26px",
        fontWeight: 800,
        cursor: "pointer",
        minWidth: 110,
        transition: "all 0.2s ease",
      }}
    >
      Yes
    </button>

    {/* NO */}
    <button
      type="button"
      onClick={() => setWantsPublicReview(false)}
      style={{
        border: "1px solid #ddd",
        background: wantsPublicReview === false ? "#111" : "#fff",
        color: wantsPublicReview === false ? "#fff" : "#111",
        borderRadius: 999,
        padding: "10px 26px",
        fontWeight: 800,
        cursor: "pointer",
        minWidth: 110,
        transition: "all 0.2s ease",
      }}
    >
      No
    </button>
  </div>

  <div
    style={{
      fontSize: 12,
      marginTop: 16,
      color: "#555",
      textAlign: "center",
    }}
  >
  </div>
</div>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 16,
              border: "none",
              background: "#111",
              color: "#fff",
              fontWeight: 900,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Submit Feedback
          </button>
        </form>
      </div>

      <div style={{ marginTop: 16, textAlign: "center", color: "#555", fontSize: 12 }}>
        Ready Bartending LLC • Miami Gardens, FL 33169
      </div>
    </div>
  );
};

export default FeedbackFormPage;
