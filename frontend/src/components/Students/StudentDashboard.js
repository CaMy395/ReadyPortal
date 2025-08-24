// src/components/Student/StudentDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const StudentDashboard = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  // Prefer loggedInUser JSON; fall back to legacy keys if present
  const loggedInUser = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("loggedInUser")) || null; } catch { return null; }
  }, []);
  const userId =
    Number(localStorage.getItem("userId") || 0) ||
    Number(loggedInUser?.id || 0);

  const username = (localStorage.getItem("username") || loggedInUser?.username || "").trim();
  const role =
    (localStorage.getItem("userRole") || localStorage.getItem("role") || loggedInUser?.role || "").trim();
  const isStudent = role === "student";

  const [loading, setLoading] = useState(true);
  const [classLogs, setClassLogs] = useState([]);
  const [openGigs, setOpenGigs] = useState([]);
  const [clocking, setClocking] = useState(false);
  const [message, setMessage] = useState("");

  // Is there an open session? (last row without sign_out_time)
  const isOpen = useMemo(() => {
    if (!classLogs?.length) return false;
    const last = classLogs[classLogs.length - 1];
    return !last?.sign_out_time; // backend returns null/undefined when still open
  }, [classLogs]);

  const totalClassHours = useMemo(
    () => (classLogs || []).reduce((sum, r) => sum + Number(r.session_hours || 0), 0),
    [classLogs]
  );

  const fetchAll = async () => {
    setLoading(true);
    setMessage("");

    try {
      // Class attendance
      if (userId) {
        const classRes = await axios.get(
          `${apiUrl}/api/bartending-course/user-attendance`,
          { params: { userId }, withCredentials: true }
        );
        // Expect an array of rows: [{id, sign_in_time, sign_out_time, session_hours}, ...]
        setClassLogs(Array.isArray(classRes.data) ? classRes.data : (classRes.data?.attendance || []));
      } else {
        setClassLogs([]);
      }

      // Open gigs (read-only)
      const gigsRes = await axios.get(`${apiUrl}/api/gigs/open-for-backup`, {
        params: username ? { username } : {},
        withCredentials: true,
      });
      setOpenGigs(Array.isArray(gigsRes.data) ? gigsRes.data : []);
    } catch (e) {
      console.error(e);
      setMessage(e?.response?.data?.error || "Error loading your dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStudent && (username || userId)) {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent, username, userId]);

  const handleClockIn = async () => {
    setClocking(true);
    setMessage("");
    try {
      if (!userId) throw new Error("Missing user id for sign-in.");
      await axios.post(`${apiUrl}/api/bartending-course/${userId}/sign-in`, null, {
        withCredentials: true,
      });
      setMessage("Signed in.");
      await fetchAll();
    } catch (e) {
      console.error(e);
      setMessage(e?.response?.data?.error || e?.message || "Error signing in.");
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    setClocking(true);
    setMessage("");
    try {
      if (!userId) throw new Error("Missing user id for sign-out.");
      await axios.post(`${apiUrl}/api/bartending-course/${userId}/sign-out`, null, {
        withCredentials: true,
      });
      setMessage("Signed out.");
      await fetchAll();
    } catch (e) {
      console.error(e);
      setMessage(e?.response?.data?.error || e?.message || "Error signing out.");
    } finally {
      setClocking(false);
    }
  };

  if (!isStudent) {
    return (
      <div className="container">
        <h2>Student Dashboard</h2>
        <p>Please log in as a student to continue.</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Scoped styles */}
      <style>{`
        .sd-row { display: flex; gap: 16px; flex-wrap: wrap; }
        .sd-card { display: flex; flex-direction: column; justify-content: center; }
        .sd-col { flex: 1 1 320px; min-width: 280px; }
        .sd-full { width: 100%; display: block; }
        .sd-table { width: 100%; border-collapse: collapse; }
        .sd-table th, .sd-table td { padding: 8px 10px; vertical-align: top; }
        .sd-table thead th { white-space: nowrap; }
      `}</style>

      <h2>👩‍🎓 Student Dashboard</h2>
      {(username || role) && (
        <p>
          Welcome, <strong>{username || "Student"}</strong>
        </p>
      )}

      {message && <p style={{ color: "#007bff" }}>{message}</p>}
      {loading && <p>Loading your data…</p>}

      {/* Row 1: two equal tiles */}
      <div className="sd-row">
        <div className="card sd-card sd-col" style={{ width: "auto" }}>
          <h3>Total Hours</h3>
          <p style={{ fontSize: 28, margin: 0 }}>{totalClassHours.toFixed(2)} hrs</p>
          <small>Class sessions only</small>
        </div>

        <div className="card sd-card sd-col" style={{ width: "auto" }}>
          <h3>Class Clock</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handleClockIn} disabled={clocking || !userId || isOpen}>Clock In</button>
            <button onClick={handleClockOut} disabled={clocking || !userId || !isOpen}>Clock Out</button>
          </div>
          <small>Use this only for bartending course sessions.</small>
          {!userId && <small style={{ color: "red", display: "block", marginTop: 6 }}>Missing user id.</small>}
          <div style={{ marginTop: 6, color: isOpen ? "#0a7" : "#666" }}>
            {isOpen ? "Currently signed in (session open)" : "Not currently signed in"}
          </div>
        </div>
      </div>

      {/* Class Sessions */}
      <div className="card sd-full" style={{ marginTop: 16 }}>
        <h3>📚 Class Sessions</h3>
        <div className="table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Sign In</th>
                <th>Sign Out</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {(classLogs || []).map((r) => (
                <tr key={r.id}>
                  <td>{r.sign_in_time ? new Date(r.sign_in_time).toLocaleString() : "—"}</td>
                  <td>{r.sign_out_time ? new Date(r.sign_out_time).toLocaleString() : (r.sign_out_time === null ? "— (open)" : "—")}</td>
                  <td>{Number(r.session_hours || 0).toFixed(2)}</td>
                </tr>
              ))}
              {(!classLogs || classLogs.length === 0) && (
                <tr>
                  <td colSpan={3}>No sessions yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Gigs */}
      <div className="card sd-full" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>📣 Open Gigs (Shadowing)</h3>
          <Link
            to="/student/gigs"
            className="btn"
            style={{
              textDecoration: "none",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Go to Claim Backup →
          </Link>
        </div>
        <p style={{ marginTop: 8, marginBottom: 8 }}>
          View open gigs here. To claim a backup spot, use the <strong>Claim Backup</strong> page.
        </p>
        <div className="table-wrap">
          <table className="sd-table">
            <thead>
              <tr>
                <th>Gig</th>
                <th>Date</th>
                <th>Location</th>
                <th>Backups Needed</th>
                <th>Pending</th>
                <th>Claimed</th>
              </tr>
            </thead>
            <tbody>
              {(openGigs || []).map((g) => (
                <tr key={g.id}>
                  <td>{g.title}</td>
                  <td>{g.date ? new Date(g.date).toLocaleString() : "—"}</td>
                  <td>{g.location || "—"}</td>
                  <td>
                    {Array.isArray(g.backup_claimed_by) && typeof g.backup_needed === "number"
                      ? `${g.backup_claimed_by.length}/${g.backup_needed}`
                      : g.backup_needed ?? "—"}
                  </td>
                  <td>{Array.isArray(g.backup_pending_by) ? g.backup_pending_by.join(", ") : "—"}</td>
                  <td>{Array.isArray(g.backup_claimed_by) ? g.backup_claimed_by.join(", ") : "—"}</td>
                </tr>
              ))}
              {(!openGigs || openGigs.length === 0) && (
                <tr>
                  <td colSpan={6}>No open gigs right now.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
