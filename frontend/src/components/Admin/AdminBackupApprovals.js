import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const AdminBackupApprovals = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const [loading, setLoading] = useState(true);
  const [gigs, setGigs] = useState([]);
  const [q, setQ] = useState("");
  const [onlyFuture, setOnlyFuture] = useState(true);
  const [message, setMessage] = useState("");

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      // You can reuse /api/gigs/open-for-backup,
      // but here we want *all* gigs that have any pending requests, so fetch gigs and filter client-side.
      const res = await axios.get(`${apiUrl}/api/gigs`); // if you have a general gigs list
      const all = res.data || [];

      // keep only gigs with pending list
      const pending = all.filter(
        (g) => Array.isArray(g.backup_pending_by) && g.backup_pending_by.length > 0
      );
      setGigs(pending);
    } catch (e) {
      console.error(e);
      setMessage("Error loading gigs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approve = async (gigId, username) => {
    setMessage("");
    try {
      await axios.patch(`${apiUrl}/admin/gigs/${gigId}/approve-backup`, {
        username,
        approve: true,
      });
      setMessage(`Approved ${username} for gig #${gigId}.`);
      await load();
    } catch (e) {
      console.error(e);
      setMessage(e?.response?.data?.error || "Approve failed.");
    }
  };

  const reject = async (gigId, username) => {
    setMessage("");
    try {
      await axios.patch(`${apiUrl}/admin/gigs/${gigId}/approve-backup`, {
        username,
        approve: false,
      });
      setMessage(`Rejected ${username} for gig #${gigId}.`);
      await load();
    } catch (e) {
      console.error(e);
      setMessage(e?.response?.data?.error || "Reject failed.");
    }
  };

  const filtered = useMemo(() => {
    const now = new Date();
    return (gigs || []).filter((g) => {
      const dateOk = !onlyFuture || (g.date && new Date(g.date) >= new Date(now.getTime() - 24*3600*1000));
      const query = q.trim().toLowerCase();
      const qOk =
        !query ||
        (g.client && g.client.toLowerCase().includes(query)) ||
        (g.event_type && g.event_type.toLowerCase().includes(query)) ||
        (g.location && g.location.toLowerCase().includes(query)) ||
        String(g.id).includes(query);
      return dateOk && qOk;
    });
  }, [gigs, q, onlyFuture]);

  return (
    <div className="container">
      <h2>📝 Backup Requests – Admin Approval</h2>
      {message && <p style={{ color: "#007bff" }}>{message}</p>}

      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr auto auto" }}>
        <input
          placeholder="Search by client, type, location, or gig id…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={onlyFuture}
            onChange={(e) => setOnlyFuture(e.target.checked)}
          />
          Only future gigs
        </label>
        <button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ marginBottom: 8, fontSize: 14, opacity: 0.8 }}>
          Showing {filtered.length} gigs with pending requests
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Gig #</th>
                <th>Client</th>
                <th>Event</th>
                <th>Date/Time</th>
                <th>Location</th>
                <th>Backups (claimed / needed)</th>
                <th>Pending Users</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g) => {
                const pending = Array.isArray(g.backup_pending_by) ? g.backup_pending_by : [];
                const claimed = Array.isArray(g.backup_claimed_by) ? g.backup_claimed_by : [];
                const needed = g.backup_needed ?? 0;

                return (
                  <tr key={g.id}>
                    <td>#{g.id}</td>
                    <td>{g.client}</td>
                    <td>{g.event_type}</td>
                    <td>
                      {g.date ? new Date(g.date).toLocaleString() : "—"}
                      {g.time ? ` • ${g.time}` : ""}
                    </td>
                    <td>{g.location}</td>
                    <td>{`${claimed.length}/${needed}`}</td>
                    <td style={{ maxWidth: 260 }}>
                      {pending.length ? pending.join(", ") : "—"}
                    </td>
                    <td>
                      {pending.length ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {pending.map((u) => (
                            <div
                              key={u}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                border: "1px solid #ddd",
                                padding: "4px 6px",
                                borderRadius: 6,
                              }}
                            >
                              <span>{u}</span>
                              <button
                                style={{ background: "#4caf50", color: "#fff" }}
                                onClick={() => approve(g.id, u)}
                                title={`Approve ${u}`}
                              >
                                Approve
                              </button>
                              <button
                                style={{ background: "#d32f2f", color: "#fff" }}
                                onClick={() => reject(g.id, u)}
                                title={`Reject ${u}`}
                              >
                                Reject
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                    No pending backup requests match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminBackupApprovals;
