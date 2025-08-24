// src/components/Student/StudentDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const StudentDashboard = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const username = (localStorage.getItem("username") || "").trim();
  const userId = Number(localStorage.getItem("userId") || 0);
  const role = (localStorage.getItem("userRole") || localStorage.getItem("role") || "").trim();
  const isStudent = role === "student";

  const [loading, setLoading] = useState(true);
  const [classLogs, setClassLogs] = useState([]);
  const [openGigs, setOpenGigs] = useState([]);
  const [clocking, setClocking] = useState(false);
  const [message, setMessage] = useState("");

  const totalClassHours = useMemo(
    () => (classLogs || []).reduce((sum, r) => sum + Number(r.session_hours || 0), 0),
    [classLogs]
  );

  const fetchAll = async () => {
    setLoading(true);
    setMessage("");

    try {
      // Class attendance
      try {
        if (userId) {
          const classRes = await axios.get(`${apiUrl}/api/bartending-course/user-attendance`, {
            params: { userId },
          });
          setClassLogs(Array.isArray(classRes.data) ? classRes.data : []);
        } else {
          setClassLogs([]);
        }
      } catch {
        setClassLogs([]);
      }

      // Open gigs (read-only)
      try {
        const gigsRes = await axios.get(`${apiUrl}/api/gigs/open-for-backup`, {
          params: username ? { username } : {},
        });
        setOpenGigs(Array.isArray(gigsRes.data) ? gigsRes.data : []);
      } catch {
        setOpenGigs([]);
      }
    } catch (e) {
      console.error(e);
      setMessage("Error loading your dashboard.");
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
      await axios.post(`${apiUrl}/api/bartending-course/${userId}/sign-in`);
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
      await axios.post(`${apiUrl}/api/bartending-course/${userId}/sign-out`);
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
      {/* Scoped styles to override global card/grid quirks */}
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
            <button onClick={handleClockIn} disabled={clocking || !userId}>Clock In</button>
            <button onClick={handleClockOut} disabled={clocking || !userId}>Clock Out</button>
          </div>
          <small>Use this only for bartending course sessions.</small>
          {!userId && <small style={{ color: "red", display: "block", marginTop: 6 }}>Missing user id.</small>}
        </div>
      </div>

 {/* Row 3: Class Sessions (full width, forced) */}
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
                  <td>{r.sign_out_time ? new Date(r.sign_out_time).toLocaleString() : "—"}</td>
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

      {/* Row 3: Open Gigs (full width, forced) */}
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
