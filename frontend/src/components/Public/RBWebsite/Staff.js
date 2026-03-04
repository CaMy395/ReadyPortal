// src/pages/StaffPage.js
import React, { useEffect, useMemo, useState } from "react";
import "../../../RB.css"; // ✅ adjust path if RB.css is elsewhere (ex: "../../RB.css")

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

/**
 * This page expects: GET ${apiUrl}/api/public/staff
 * Returns an array like:
 * [
 *   { id, display_name, avg_rating, review_count }
 * ]
 *
 * Photo is loaded from: GET ${apiUrl}/api/users/:id/photo
 */

function Stars({ value = 0 }) {
  const v = Number(value) || 0;
  const rounded = Math.round(v * 10) / 10; // 4.94 -> 4.9
  const full = Math.floor(rounded);
  const hasHalf = rounded - full >= 0.5;

  // We’ll keep it simple: filled stars + empty stars, and show numeric.
  const filled = Math.min(5, full + (hasHalf ? 1 : 0));
  const empty = Math.max(0, 5 - filled);

  return (
    <div className="rb-staff-rating">
      <span className="rb-staff-stars" title={`${rounded.toFixed(1)} / 5`}>
        {"★".repeat(filled)}
        {"☆".repeat(empty)}
      </span>
      <span className="rb-staff-rating-num">{rounded.toFixed(1)}</span>
    </div>
  );
}

function InitialsBubble({ name = "Staff" }) {
  const initials = (name || "S")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return <div className="rb-staff-bubble rb-staff-bubble-fallback">{initials}</div>;
}

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch(`${apiUrl}/api/public/staff`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        const items = Array.isArray(data) ? data : data?.items || [];

        if (!cancelled) setStaff(items);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load staff.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return staff;

    return staff.filter((s) => {
      const name = String(s.display_name || s.name || "").toLowerCase();
      return name.includes(query);
    });
  }, [staff, q]);

  return (
    <div className="rb-staff-page">
      {/* if you already use gold-divider on the site, this will match nicely */}
      <div className="gold-divider" />

      <div className="rb-staff-container">
        <h2 className="fancy-heading rb-staff-title">Meet the Ready Team</h2>
        <p className="rb-staff-subtitle">Verified ratings from completed events.</p>

        <input
          className="rb-staff-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search staff…"
          aria-label="Search staff"
        />

        {loading && <div className="rb-staff-helper">Loading staff…</div>}
        {!!err && <div className="rb-staff-helper rb-staff-error">{err}</div>}

        {!loading && !err && filtered.length === 0 && (
          <div className="rb-staff-helper">No staff found.</div>
        )}

        <div className="rb-staff-grid">
          {filtered.map((s) => {
            const name = s.display_name || s.name || "Staff";
            const rating = s.avg_rating ?? s.rating ?? 0;
            const count = s.review_count ?? s.staff_rating_count ?? null;

            // Photo endpoint you already use in admin:
            const photoSrc = s.id ? `${apiUrl}/api/users/${s.id}/photo` : "";

            return (
              <div key={s.id || name} className="rb-staff-item">
                {photoSrc ? (
                  <img
                    className="rb-staff-bubble"
                    src={photoSrc}
                    alt={name}
                    loading="lazy"
                    onError={(e) => {
                      // If photo fails, swap to initials bubble
                      e.currentTarget.style.display = "none";
                      const fallback = e.currentTarget.nextSibling;
                      if (fallback) fallback.style.display = "grid";
                    }}
                  />
                ) : null}

                {/* initials fallback (hidden if image loads) */}
                <div style={{ display: photoSrc ? "none" : "grid" }}>
                  <InitialsBubble name={name} />
                </div>

                <div className="rb-staff-name">{name}</div>

                <Stars value={rating} />

                {typeof count === "number" && (
                  <div className="rb-staff-reviews">{count} reviews</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="gold-divider" />
    </div>
  );
}