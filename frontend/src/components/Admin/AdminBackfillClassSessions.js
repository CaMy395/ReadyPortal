import React, { useEffect, useState } from "react";
import axios from "axios";

const AdminBackfillClassSessions = () => {
  const [students, setStudents] = useState([]);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [log, setLog] = useState([]);

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axios.get(`${apiUrl}/api/bartending-course`);
        setStudents(res.data);
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();
  }, [apiUrl]);

  const convertSetScheduleToStartDate = (schedule) => {
    switch (schedule) {
      case "May 10 - 31":
        return "2025-05-10";
      case "June 14 - July 5":
        return "2025-06-14";
      case "July 19 - Aug 9":
        return "2025-07-19";
      default:
        return null;
    }
  };

  const backfillAppointments = async () => {
    setIsBackfilling(true);
    const newLogs = [];

    for (const student of students) {
        if (student.dropped) {
            newLogs.push(`🚫 Skipped ${student.full_name} - marked as dropped`);
            continue;
        }
      const startDateStr = convertSetScheduleToStartDate(student.set_schedule);
        if (!startDateStr) {
            newLogs.push(`⚠️ Skipped ${student.full_name}: Unknown schedule`);
            continue;
        }

      const startDate = new Date(startDateStr);
      for (let i = 0; i < 4; i++) {
        const classDate = new Date(startDate);
        classDate.setDate(startDate.getDate() + i * 7);
        const dateISO = classDate.toISOString().split("T")[0];

        try {
          const existing = await axios.get(`${apiUrl}/appointments`, {
            params: {
              email: student.email,
              date: dateISO,
            },
          });

          if (existing.data && existing.data.length > 0) {
            newLogs.push(`🟡 Skipped ${student.full_name} - already scheduled for ${dateISO}`);
            continue;
          }
        } catch (err) {
          newLogs.push(`❌ Check failed for ${student.full_name} - ${dateISO}`);
          continue;
        }

        const appointment = {
          title: "Bartending Course (3 hours)",
          client_name: student.full_name,
          client_email: student.email,
          date: dateISO,
          time: "11:00:00",
          end_time: "14:00:00",
          description: `Student enrolled in course: ${student.set_schedule} (Week ${i + 1})`,
          isAdmin: true,
        };

        try {
          await axios.post(`${apiUrl}/appointments`, appointment);
          newLogs.push(`✅ Added ${student.full_name} - ${dateISO}`);
        } catch (err) {
          newLogs.push(`❌ Failed for ${student.full_name} - ${dateISO}`);
          console.error(err);
        }
      }
    }

    setLog(newLogs);
    setIsBackfilling(false);
  };

  return (
    <div>
      <h2>📚 Backfill Class Sessions to Calendar</h2>
      <button onClick={backfillAppointments} disabled={isBackfilling}>
        {isBackfilling ? "Working..." : "Backfill All Students"}
      </button>

      <div style={{ marginTop: "20px" }}>
        <h3>Log:</h3>
        <ul>
          {log.map((line, idx) => (
            <li key={idx}>{line}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AdminBackfillClassSessions;
