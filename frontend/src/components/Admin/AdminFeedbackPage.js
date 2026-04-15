import React, { useEffect, useMemo, useState } from "react";

const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

function renderStars(value) {
  const v = Number(value) || 0;
  const full = Math.round(v);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

function formatDate(dateValue) {
  if (!dateValue) return "—";
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        const res = await fetch(`${apiUrl}/api/admin/feedback`, {
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }

        const data = await res.json();
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Failed to load feedback.");
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
    return items.filter((item) => {
      const q = query.trim().toLowerCase();

      const matchesQuery =
        !q ||
        String(item.client_name || "").toLowerCase().includes(q) ||
        String(item.client_email || "").toLowerCase().includes(q) ||
        String(item.overall_comment || "").toLowerCase().includes(q) ||
        (Array.isArray(item.staff_ratings) &&
          item.staff_ratings.some((sr) =>
            String(sr.staff_name || "").toLowerCase().includes(q)
          ));

      const matchesService =
        serviceFilter === "all" || item.service_type === serviceFilter;

      const matchesRating =
        ratingFilter === "all" ||
        Number(item.overall_rating) === Number(ratingFilter);

      return matchesQuery && matchesService && matchesRating;
    });
  }, [items, query, serviceFilter, ratingFilter]);

  return (
    <div style={styles.page}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Client Feedback</h1>
          <p style={styles.subtitle}>
            View overall feedback and staff-specific ratings in one place.
          </p>
        </div>
      </div>

      <div style={styles.filters}>
        <input
          style={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by client, email, comment, or staff name"
        />

        <select
          style={styles.select}
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
        >
          <option value="all">All services</option>
          <option value="gig">Gig</option>
          <option value="appointment">Appointment</option>
        </select>

        <select
          style={styles.select}
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
        >
          <option value="all">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
      </div>

      {loading && <div style={styles.helper}>Loading feedback…</div>}
      {!!err && <div style={{ ...styles.helper, ...styles.error }}>{err}</div>}

      {!loading && !err && filtered.length === 0 && (
        <div style={styles.helper}>No feedback found.</div>
      )}

      <div style={styles.grid}>
        {filtered.map((item) => (
          <div key={item.id} style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <div style={styles.clientName}>{item.client_name || "Unknown Client"}</div>
                <div style={styles.metaLine}>
                  {item.client_email || "No email"} •{" "}
                  {item.service_type === "gig" ? "Gig" : "Appointment"}
                </div>
              </div>

              <div style={styles.ratingBox}>
                <div style={styles.ratingStars}>{renderStars(item.overall_rating)}</div>
                <div style={styles.ratingNum}>{Number(item.overall_rating).toFixed(1)}</div>
              </div>
            </div>

            <div style={styles.dateLine}>{formatDate(item.created_at)}</div>

            <div style={styles.commentBox}>
              {item.overall_comment ? item.overall_comment : "No written comment."}
            </div>

            <div style={styles.sectionLabel}>Staff ratings</div>

            {Array.isArray(item.staff_ratings) && item.staff_ratings.length > 0 ? (
              <div style={styles.staffList}>
                {item.staff_ratings.map((sr, idx) => (
                  <div key={`${item.id}-${idx}`} style={styles.staffRow}>
                    <span>{sr.staff_name || `Staff #${sr.staff_user_id}`}</span>
                    <span>
                      {renderStars(sr.rating)} ({sr.rating})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.noStaff}>No staff ratings on this response.</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  page: {
    padding: "24px",
    background: "#111",
    minHeight: "100vh",
    color: "#fff",
  },
  headerRow: {
    marginBottom: "20px",
  },
  title: {
    margin: 0,
    fontSize: "32px",
  },
  subtitle: {
    marginTop: "8px",
    color: "#ccc",
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr 1fr",
    gap: "12px",
    marginBottom: "20px",
  },
  input: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #444",
    background: "#1b1b1b",
    color: "#fff",
  },
  select: {
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #444",
    background: "#1b1b1b",
    color: "#fff",
  },
  helper: {
    padding: "16px",
    borderRadius: "12px",
    background: "#1a1a1a",
    border: "1px solid #333",
    marginBottom: "16px",
  },
  error: {
    border: "1px solid #7d2323",
    background: "#341414",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "16px",
    padding: "16px",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
  },
  clientName: {
    fontSize: "18px",
    fontWeight: 700,
  },
  metaLine: {
    fontSize: "13px",
    color: "#bbb",
    marginTop: "6px",
  },
  dateLine: {
    marginTop: "10px",
    fontSize: "12px",
    color: "#aaa",
  },
  ratingBox: {
    textAlign: "right",
    minWidth: "90px",
  },
  ratingStars: {
    color: "#f5c542",
    fontSize: "16px",
  },
  ratingNum: {
    marginTop: "4px",
    fontWeight: 700,
  },
  commentBox: {
    marginTop: "14px",
    padding: "12px",
    background: "#111",
    border: "1px solid #2f2f2f",
    borderRadius: "12px",
    lineHeight: 1.45,
  },
  sectionLabel: {
    marginTop: "16px",
    marginBottom: "8px",
    fontWeight: 700,
    color: "#f0d27a",
  },
  staffList: {
    display: "grid",
    gap: "8px",
  },
  staffRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "10px 12px",
    borderRadius: "10px",
    background: "#141414",
    border: "1px solid #2d2d2d",
  },
  noStaff: {
    color: "#aaa",
    fontSize: "14px",
  },
};