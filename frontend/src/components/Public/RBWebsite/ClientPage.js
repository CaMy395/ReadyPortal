import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3001";

function money(n) {
  const x = Number(n || 0);
  return x.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d || "";
  }
}

// ✅ Works with BrowserRouter AND HashRouter
function getTokenFromUrl() {
  // normal: /client/preferences?token=abc
  let t = new URLSearchParams(window.location.search).get("token");
  if (t) return t;

  // hash: /#/client/preferences?token=abc
  const hash = window.location.hash || "";
  const idx = hash.indexOf("?");
  if (idx !== -1) {
    const query = hash.slice(idx + 1);
    t = new URLSearchParams(query).get("token");
  }
  return t;
}

export default function ClientPage() {
  const token = useMemo(() => getTokenFromUrl(), []);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const [client, setClient] = useState(null);
  const [stats, setStats] = useState({ totalSpent: 0, totalBookings: 0, upcomingBookings: 0 });
  const [futureBookings, setFutureBookings] = useState([]);
  const [pastBookings, setPastBookings] = useState([]);
  const [saving, setSaving] = useState(false);

  const loadProfile = async () => {
    if (!token) {
      setStatus("❌ Missing token.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      // ✅ this route exists in your backend
      const res = await axios.get(`${API_BASE}/client/profile`, { params: { token } });
      setClient(res.data.client || null);
      setStats(res.data.stats || { totalSpent: 0, totalBookings: 0, upcomingBookings: 0 });
      setFutureBookings(res.data.futureBookings || []);
      setPastBookings(res.data.pastBookings || []);
    } catch (e) {
      setStatus("❌ This link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSms = async () => {
    if (!token || !client) return;
    setSaving(true);
    setStatus("Saving…");

    try {
      const res = await axios.patch(`${API_BASE}/client/preferences`, {
        token,
        sms_opt_in: !client.sms_opt_in,
      });
      setClient((prev) => ({ ...prev, sms_opt_in: !!res.data.sms_opt_in }));
      setStatus(res.data.sms_opt_in ? "✅ SMS updates enabled." : "✅ SMS updates turned off.");
    } catch {
      setStatus("❌ Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div className="client-pref-page">
      <div className="client-pref-shell">
        <div className="client-pref-card">
          <div className="client-pref-header">
            <div className="client-pref-brand">
              <div className="client-pref-mark" aria-hidden="true">🍸</div>
              <div>
                <div className="client-pref-title">Ready Bartending</div>
                <div className="client-pref-subtitle">Client Profile</div>
              </div>
            </div>

            <button className="client-pref-refresh" onClick={loadProfile}>
              Refresh
            </button>
          </div>

          {status ? (
            <div className={`client-pref-status ${status.startsWith("✅") ? "ok" : "bad"}`}>
              {status}
            </div>
          ) : null}

          {!client ? (
            <div className="client-pref-help">
              This link is missing or expired. Please use the most recent link we sent you.
            </div>
          ) : (
            <>
              <div className="client-profile-stats">
                <div className="stat-card">
                  <div className="stat-label">Total Spent</div>
                  <div className="stat-value">{money(stats.totalSpent)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Total Bookings</div>
                  <div className="stat-value">{stats.totalBookings}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Upcoming</div>
                  <div className="stat-value">{stats.upcomingBookings}</div>
                </div>
              </div>

              <div className="client-pref-section">
                <div className="client-pref-section-title">Your Info</div>

                <div className="client-pref-row">
                  <div className="client-pref-label">Name</div>
                  <div className="client-pref-value">{client.full_name || "—"}</div>
                </div>
                <div className="client-pref-row">
                  <div className="client-pref-label">Email</div>
                  <div className="client-pref-value">{client.email || "—"}</div>
                </div>
                <div className="client-pref-row">
                  <div className="client-pref-label">Phone</div>
                  <div className="client-pref-value">{client.phone || "—"}</div>
                </div>
              </div>

              <div className="client-pref-divider" />

              <div className="client-pref-section">
                <div className="client-pref-section-title">Communication</div>

                <div className="client-pref-toggleRow">
                  <div className="client-pref-toggleText">
                    <div className="client-pref-toggleTitle">Text updates & special offers</div>
                    <div className="client-pref-toggleDesc">
                      Msg & data rates may apply. Reply <b>STOP</b> to opt out anytime.
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`rb-switch ${client.sms_opt_in ? "on" : "off"}`}
                    onClick={toggleSms}
                    disabled={saving}
                    aria-pressed={client.sms_opt_in}
                  >
                    <span className="rb-switch-knob" />
                  </button>
                </div>
              </div>

              <div className="client-pref-divider" />

              <div className="client-pref-section">
                <div className="client-pref-section-title">Upcoming Bookings</div>
                {futureBookings.length === 0 ? (
                  <div className="client-empty">No upcoming bookings yet.</div>
                ) : (
                  <div className="client-table">
                    <div className="client-table-head">
                      <div>Date</div>
                      <div>Service</div>
                      <div>Status</div>
                    </div>
                    {futureBookings.map((b) => (
                      <div className="client-table-row" key={b.id}>
                        <div>{fmtDate(b.date)} {b.time ? `• ${b.time}` : ""}</div>
                        <div>{b.title}</div>
                        <div className="badge">{b.status || (b.paid ? "paid" : "pending")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="client-pref-section">
                <div className="client-pref-section-title">Past Bookings</div>
                {pastBookings.length === 0 ? (
                  <div className="client-empty">No past bookings yet.</div>
                ) : (
                  <div className="client-table">
                    <div className="client-table-head">
                      <div>Date</div>
                      <div>Service</div>
                      <div>Paid</div>
                    </div>
                    {pastBookings.map((b) => (
                      <div className="client-table-row" key={b.id}>
                        <div>{fmtDate(b.date)} {b.time ? `• ${b.time}` : ""}</div>
                        <div>{b.title}</div>
                        <div className="badge">{b.paid ? "yes" : "no"}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="client-pref-footer">
                Need help? <a href="mailto:readybartending@gmail.com">readybartending@gmail.com</a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
