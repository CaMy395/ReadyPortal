// src/pages/StudentSignIn.js

import React, { useEffect, useState } from "react";
import axios from "axios";

const StudentSignIn = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState([]);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/bartending-course`);
      setStudents(res.data.filter((s) => !s.dropped));
    } catch (error) {
      console.error("Error fetching students:", error);
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/bartending-course/attendance`);
      setAttendance(
        Array.isArray(res.data)
          ? res.data.sort((a, b) => new Date(b.sign_in_time) - new Date(a.sign_in_time))
          : []
      );
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setAttendance([]);
    }
  };

  const handleClockInOut = async () => {
    if (!selectedId) return;

    try {
      const openSession = attendance.find(
        (a) => a.student_id === parseInt(selectedId) && !a.sign_out_time
      );

      if (openSession) {
        await axios.post(`${apiUrl}/api/bartending-course/${selectedId}/sign-out`);
        setMessage("✅ Signed out successfully!");
      } else {
        await axios.post(`${apiUrl}/api/bartending-course/${selectedId}/sign-in`);
        setMessage("✅ Signed in successfully!");
      }

      setSelectedId("");
      fetchAttendance();
    } catch (error) {
      console.error("Error signing in/out:", error);
      setMessage("❌ Error. Please try again.");
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAttendance();
  }, []);

  return (
    <div className="signin-container">
      <h2 className="signin-title">🕐 Bartending Class Sign-In/Out</h2>

      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="signin-select"
      >
        <option value="">Select your name</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.full_name}
          </option>
        ))}
      </select>

      <button
        className="signin-button"
        onClick={handleClockInOut}
        disabled={!selectedId}
      >
        Clock In/Out
      </button>

      {message && <p className="signin-message">{message}</p>}

      <h3 className="attendance-title">📊 Attendance History</h3>
      <div className="attendance-table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Sign In</th>
              <th>Sign Out</th>
              <th>Session Hours</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(attendance) && attendance.length > 0 ? (
              attendance
                .filter((a) => !selectedId || a.student_id === parseInt(selectedId))
                .map((a) => {
                  const student = students.find((s) => s.id === a.student_id);
                  return (
                    <tr key={a.id}>
                      <td>{student ? student.full_name : "Unknown"}</td>
                      <td>
                        {a.sign_in_time
                          ? new Date(a.sign_in_time).toLocaleString("en-US", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "-"}
                      </td>
                      <td>
                        {a.sign_out_time
                          ? new Date(a.sign_out_time).toLocaleString("en-US", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "-"}
                      </td>
                      <td>{Number(a.session_hours || 0).toFixed(2)}</td>
                    </tr>
                  );
                })
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: "10px" }}>
                  No attendance records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentSignIn;
