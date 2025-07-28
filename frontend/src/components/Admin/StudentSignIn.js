// src/pages/StudentSignIn.js

import React, { useEffect, useState } from "react";
import axios from "axios";

const StudentSignIn = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [attendance, setAttendance] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
const [editSignIn, setEditSignIn] = useState("");
const [editSignOut, setEditSignOut] = useState("");


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

  const formatLocalDatetime = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16); // yyyy-MM-ddTHH:mm
};

const openEditModal = (entry) => {
  setEditingEntry(entry);
  setEditSignIn(formatLocalDatetime(entry.sign_in_time));
  setEditSignOut(formatLocalDatetime(entry.sign_out_time));
};


const handleEditSubmit = async () => {
  try {
    await axios.patch(`${apiUrl}/api/bartending-course/${editingEntry.id}/attendance`, {
      check_in_time: editSignIn,
      check_out_time: editSignOut,
    });

    setEditingEntry(null);
    setMessage("✅ Updated times successfully!");
    fetchAttendance();
  } catch (error) {
    console.error("Error updating times:", error);
    setMessage("❌ Failed to update times.");
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
<td>
  {Number(a.session_hours || 0).toFixed(2)}
  <button onClick={() => openEditModal(a)} style={{ marginLeft: '10px' }}>✏️ Edit</button>
</td>
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
        {editingEntry && (
  <div className="modal-backdrop">
    <div className="modal">
      <h3>Edit Times for {students.find(s => s.id === editingEntry.student_id)?.full_name}</h3>
      <label>
        Sign In:
        <input
          type="datetime-local"
          value={editSignIn}
          onChange={(e) => setEditSignIn(e.target.value)}
        />
      </label>
      <label>
        Sign Out:
        <input
          type="datetime-local"
          value={editSignOut}
          onChange={(e) => setEditSignOut(e.target.value)}
        />
      </label>
      <div className="modal-actions">
        <button onClick={handleEditSubmit}>✅ Save</button>
        <button onClick={() => setEditingEntry(null)}>❌ Cancel</button>
      </div>
    </div>
  </div>
)}

      </div>
    </div>
  );
};

export default StudentSignIn;
