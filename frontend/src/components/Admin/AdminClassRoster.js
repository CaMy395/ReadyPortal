import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";

const AdminClassRoster = () => {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [showDropped, setShowDropped] = useState(false);
  const [showGraduatedOnly, setShowGraduatedOnly] = useState(false);
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const fetchRoster = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/bartending-course`);
      setStudents(res.data || []);
    } catch (error) {
      console.error("Error fetching roster:", error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/bartending-course/attendance`);
      setAttendance(res.data || []);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    }
  };

  useEffect(() => {
    fetchRoster();
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateHours = (studentId) => {
    const logs = attendance.filter((a) => a.student_id === studentId);
    const total = logs.reduce((sum, a) => sum + Number(a.session_hours || 0), 0);
    return total.toFixed(2);
  };

  const toggleDropped = async (id, dropped) => {
    try {
      await axios.patch(`${apiUrl}/api/bartending-course/${id}`, { dropped });
      fetchRoster();
    } catch (error) {
      console.error("Error updating dropped status:", error);
    }
  };

  const graduateStudent = async (id, name) => {
    try {
      await axios.patch(`${apiUrl}/admin/students/${id}/graduate`, { newRole: "user" });
      alert(`${name} graduated and was promoted to staff.`);
      fetchRoster();
    } catch (err) {
      console.error("Error graduating student:", err);
      const msg = err?.response?.data?.error || "Error graduating student.";
      alert(msg);
    }
  };

  const filteredStudents = useMemo(() => {
    return (students || []).filter((s) => {
      const dropPass = showDropped || !s.dropped;
      const gradPass = showGraduatedOnly ? !!s.graduated_at : true;
      return dropPass && gradPass;
    });
  }, [students, showDropped, showGraduatedOnly]);

  const counts = useMemo(() => {
    const total = students.length;
    const dropped = students.filter((s) => s.dropped).length;
    const graduated = students.filter((s) => !!s.graduated_at).length;
    const active = students.filter((s) => !s.dropped).length;
    return { total, dropped, graduated, active };
  }, [students]);

  return (
    <div className="roster-container">
      <h2 className="roster-title">📋 Bartending Course Roster</h2>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "10px 0" }}>
        <button onClick={() => setShowDropped((p) => !p)} style={{ padding: "6px 10px" }}>
          {showDropped ? "Hide Dropped" : "Show Dropped"} ({counts.dropped})
        </button>

        <button
          onClick={() => setShowGraduatedOnly((p) => !p)}
          style={{ padding: "6px 10px" }}
          title="Toggle to show only graduated students"
        >
          {showGraduatedOnly ? "Show All (Graduated Off)" : "Show Graduated Only"} ({counts.graduated})
        </button>

        <span style={{ marginLeft: "auto", fontSize: 14, opacity: 0.8 }}>
          Total: {counts.total} • Active: {counts.active} • Dropped: {counts.dropped} • Graduated: {counts.graduated}
        </span>
      </div>

      <div className="roster-table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th style={{ minWidth: 180 }}>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Schedule</th>
              <th>Days</th>
              <th>Hours</th>
              <th>Status</th>
              <th style={{ minWidth: 260 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => {
              const hours = calculateHours(s.id);
              const isComplete = Number(hours) >= 24;
              return (
                <tr
                  key={s.id}
                  style={{ backgroundColor: s.dropped ? "#f8d7da" : "#d4edda" }}
                  title={
                    s.graduated_at
                      ? `Graduated on ${new Date(s.graduated_at).toLocaleString()}`
                      : undefined
                  }
                >
                  <td>
                    {s.full_name}{" "}
                    {s.graduated_at && (
                      <span
                        style={{
                          marginLeft: 8,
                          padding: "2px 6px",
                          borderRadius: 6,
                          fontSize: 12,
                          background: "#e8f5e9",
                          border: "1px solid #a5d6a7",
                          color: "#1b5e20",
                        }}
                      >
                        Graduated
                      </span>
                    )}
                  </td>
                  <td>{s.email}</td>
                  <td>{s.phone}</td>
                  <td>{s.set_schedule}</td>
                  <td>{s.preferred_time}</td>
                  <td style={{ color: isComplete ? "red" : "inherit" }}>{hours} / 24</td>
                  <td>
                    <button
                      className="roster-button"
                      onClick={() => toggleDropped(s.id, !s.dropped)}
                    >
                      {s.dropped ? "Dropped" : "Enrolled"}
                    </button>
                  </td>
                  <td>
                    <button
                      className="roster-button"
                      style={{ marginRight: 8, background: "#4caf50", color: "#fff" }}
                      onClick={() => graduateStudent(s.id, s.full_name)}
                      title="Promote this student to staff (user role)"
                      disabled={!!s.graduated_at}
                    >
                      Graduate → Staff
                    </button>

                    <button
                      className="roster-button"
                      style={{ marginRight: 8, background: "#1976d2", color: "#fff" }}
                      onClick={() => window.open(`mailto:${s.email}`, "_blank")}
                      title="Email student"
                    >
                      Email
                    </button>

                    <button
                      className="roster-button"
                      style={{ background: "#555", color: "#fff" }}
                      onClick={() => alert(JSON.stringify(s, null, 2))}
                      title="Quick view (debug)"
                    >
                      View
                    </button>
{!s.user_id ? (
  <button
    className="roster-button"
    onClick={async () => {
      const res = await fetch(`${apiUrl}/admin/inquiries/${s.id}/create-login`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) return alert(data.error || 'Failed to create login');
      if (data.tempPassword) {
        alert(`Login created.\nUsername: ${data.user.username}\nTemp Password: ${data.tempPassword}`);
      } else {
        alert(`Linked to existing user: ${data.user.username}`);
      }
      fetchRoster(); // refresh table
    }}
  >
    Create Login
  </button>
) : (
  <span>Login linked</span>
)}

                  </td>
                </tr>
              );
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 16 }}>
                  No students to show with current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminClassRoster;
