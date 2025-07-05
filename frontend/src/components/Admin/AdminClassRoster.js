import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminClassRoster = () => {
  const [students, setStudents] = useState([]);
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const fetchRoster = async () => {
    try {
      const res = await axios.get(`${apiUrl}/api/bartending-course`);
      setStudents(res.data);
    } catch (error) {
      console.error("Error fetching roster:", error);
    }
  };

  const toggleDropped = async (id, dropped) => {
    try {
      await axios.patch(`${apiUrl}/api/bartending-course/${id}`, { dropped });
      fetchRoster();
    } catch (error) {
      console.error("Error updating dropped status:", error);
    }
  };

  useEffect(() => {
    fetchRoster();
  }, []);

  return (
    <div className="roster-container">
      <h2 className="roster-title">📋 Bartending Course Roster</h2>
      <div className="roster-table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Schedule</th>
              <th>Hours</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} style={{ backgroundColor: s.dropped ? "#f8d7da" : "#d4edda" }}>
                <td>{s.full_name}</td>
                <td>{s.email}</td>
                <td>{s.phone}</td>
                <td>{s.set_schedule}</td>
                <td>{Number(s.hours_completed || 0).toFixed(2)} / 24</td>
                <td>
                  <button
                    className="roster-button"
                    onClick={() => toggleDropped(s.id, !s.dropped)}
                  >
                    {s.dropped ? "Dropped" : "Enrolled"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminClassRoster;
