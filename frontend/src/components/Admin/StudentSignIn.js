import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import moment from "moment-timezone";

const EMPTY_ATTENDANCE_FORM = {
  student_id: "",
  sign_in_time: "",
  sign_out_time: "",
};

const StudentSignIn = () => {
  const apiUrl =
    process.env.REACT_APP_API_URL || "http://localhost:3001";

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");

  const [showAddAttendance, setShowAddAttendance] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState(
    EMPTY_ATTENDANCE_FORM
  );
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [editingEntry, setEditingEntry] = useState(null);
  const [editSignIn, setEditSignIn] = useState("");
  const [editSignOut, setEditSignOut] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchStudents = async () => {
    try {
      const res = await axios.get(
        `${apiUrl}/api/bartending-course`
      );

      const rows = Array.isArray(res.data) ? res.data : [];

      setStudents(
        rows.filter(
          (student) =>
            !student.dropped &&
            student.enrollment_status !== "dropped" &&
            student.enrollment_status !== "inquiry"
        )
      );
    } catch (error) {
      console.error("Error fetching students:", error);
      setMessage("❌ Could not load students.");
    }
  };

  const fetchAttendance = async () => {
    try {
      const res = await axios.get(
        `${apiUrl}/api/bartending-course/attendance`
      );

      const rows = Array.isArray(res.data) ? res.data : [];

      setAttendance(
        rows.sort(
          (a, b) =>
            new Date(b.sign_in_time) -
            new Date(a.sign_in_time)
        )
      );
    } catch (error) {
      console.error("Error fetching attendance:", error);
      setAttendance([]);
      setMessage("❌ Could not load attendance records.");
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAttendance();
  }, []);

  const calculateSessionHours = (signIn, signOut) => {
    if (!signIn || !signOut) return 0;

    const start = new Date(signIn);
    const end = new Date(signOut);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      return 0;
    }

    const difference =
      (end.getTime() - start.getTime()) /
      (1000 * 60 * 60);

    return Number(difference.toFixed(2));
  };

  const getStudentName = (studentId) => {
    const student = students.find(
      (item) => Number(item.id) === Number(studentId)
    );

    return student?.full_name || "Unknown";
  };

  const handleClockInOut = async () => {
    if (!selectedId) {
      setMessage("❌ Select a student first.");
      return;
    }

    try {
      const openSession = attendance.find(
        (entry) =>
          Number(entry.student_id) === Number(selectedId) &&
          !entry.sign_out_time
      );

      if (openSession) {
        await axios.post(
          `${apiUrl}/api/bartending-course/${selectedId}/sign-out`
        );

        setMessage("✅ Signed out successfully.");
      } else {
        await axios.post(
          `${apiUrl}/api/bartending-course/${selectedId}/sign-in`
        );

        setMessage("✅ Signed in successfully.");
      }

      setSelectedId("");
      await fetchAttendance();
    } catch (error) {
      console.error("Error signing in/out:", error);

      setMessage(
        error?.response?.data?.error ||
          "❌ Error signing student in or out."
      );
    }
  };

  const handleAttendanceFormChange = (event) => {
    const { name, value } = event.target;

    setAttendanceForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const addManualAttendance = async (event) => {
    event.preventDefault();

    const studentId = Number(attendanceForm.student_id);

    if (!studentId) {
      setMessage("❌ Select a student.");
      return;
    }

    if (
      !attendanceForm.sign_in_time ||
      !attendanceForm.sign_out_time
    ) {
      setMessage(
        "❌ Sign-in and sign-out times are required."
      );
      return;
    }

    const sessionHours = calculateSessionHours(
      attendanceForm.sign_in_time,
      attendanceForm.sign_out_time
    );

    if (sessionHours <= 0) {
      setMessage(
        "❌ Sign-out time must be after sign-in time."
      );
      return;
    }

    setSavingAttendance(true);
    setMessage("");

    try {
      await axios.post(
        `${apiUrl}/api/admin/bartending-course/attendance`,
        {
          student_id: studentId,
          sign_in_time: attendanceForm.sign_in_time,
          sign_out_time: attendanceForm.sign_out_time,
          session_hours: sessionHours,
        }
      );

      setMessage(
        `✅ Attendance added for ${getStudentName(
          studentId
        )}: ${sessionHours.toFixed(2)} hours.`
      );

      setAttendanceForm(EMPTY_ATTENDANCE_FORM);
      setShowAddAttendance(false);

      await fetchAttendance();
    } catch (error) {
      console.error("Error adding attendance:", error);

      setMessage(
        error?.response?.data?.error ||
          "❌ Failed to add attendance."
      );
    } finally {
      setSavingAttendance(false);
    }
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);

    setEditSignIn(
      entry.sign_in_time
        ? moment(entry.sign_in_time)
            .tz("America/New_York")
            .format("YYYY-MM-DDTHH:mm")
        : ""
    );

    setEditSignOut(
      entry.sign_out_time
        ? moment(entry.sign_out_time)
            .tz("America/New_York")
            .format("YYYY-MM-DDTHH:mm")
        : ""
    );
  };

  const handleEditSubmit = async () => {
    if (!editingEntry) return;

    if (!editSignIn || !editSignOut) {
      setMessage(
        "❌ Sign-in and sign-out times are required."
      );
      return;
    }

    const sessionHours = calculateSessionHours(
      editSignIn,
      editSignOut
    );

    if (sessionHours <= 0) {
      setMessage(
        "❌ Sign-out time must be after sign-in time."
      );
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      await axios.patch(
        `${apiUrl}/api/admin/bartending-course/attendance/${editingEntry.id}`,
        {
          sign_in_time: editSignIn,
          sign_out_time: editSignOut,
          session_hours: sessionHours,
        }
      );

      setEditingEntry(null);
      setEditSignIn("");
      setEditSignOut("");

      setMessage("✅ Attendance updated successfully.");

      await fetchAttendance();
    } catch (error) {
      console.error("Error updating attendance:", error);

      setMessage(
        error?.response?.data?.error ||
          "❌ Failed to update attendance."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteAttendance = async (entry) => {
  const studentName =
    entry.full_name || getStudentName(entry.student_id);
    const confirmed = window.confirm(
      `Delete this attendance record for ${studentName}?`
    );

    if (!confirmed) return;

    try {
      await axios.delete(
        `${apiUrl}/api/admin/bartending-course/attendance/${entry.id}`
      );

      setMessage("✅ Attendance record deleted.");

      await fetchAttendance();
    } catch (error) {
      console.error("Error deleting attendance:", error);

      setMessage(
        error?.response?.data?.error ||
          "❌ Failed to delete attendance."
      );
    }
  };

  const filteredAttendance = useMemo(() => {
    if (!selectedId) return attendance;

    return attendance.filter(
      (entry) =>
        Number(entry.student_id) === Number(selectedId)
    );
  }, [attendance, selectedId]);

  const selectedStudentTotal = useMemo(() => {
    if (!selectedId) return null;

    return attendance
      .filter(
        (entry) =>
          Number(entry.student_id) === Number(selectedId)
      )
      .reduce(
        (total, entry) =>
          total + Number(entry.session_hours || 0),
        0
      );
  }, [attendance, selectedId]);

  const manualHoursPreview = calculateSessionHours(
    attendanceForm.sign_in_time,
    attendanceForm.sign_out_time
  );

  const editHoursPreview = calculateSessionHours(
    editSignIn,
    editSignOut
  );

  return (
    <div className="signin-container">
      <h2 className="signin-title">
        🕐 Bartending Class Attendance
      </h2>

      {message && (
        <p className="signin-message">{message}</p>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <select
          value={selectedId}
          onChange={(event) =>
            setSelectedId(event.target.value)
          }
        >
          <option value="">
            Select student / show all attendance
          </option>

          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.full_name}
              {student.course_name
                ? ` — ${student.course_name}`
                : ""}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleClockInOut}
          disabled={!selectedId}
        >
          Sign In / Sign Out
        </button>

        <button
          type="button"
          onClick={() =>
            setShowAddAttendance((current) => !current)
          }
          style={{
            background: "#2e7d32",
            color: "#fff",
          }}
        >
          {showAddAttendance
            ? "Close Manual Entry"
            : "+ Add Attendance"}
        </button>

        <button
          type="button"
          onClick={fetchAttendance}
        >
          Refresh
        </button>
      </div>

      {selectedId && selectedStudentTotal !== null && (
        <div
          style={{
            padding: 10,
            marginBottom: 14,
            background: "#222",
            border: "1px solid #555",
            borderRadius: 6,
            color: "#fff",
          }}
        >
          <strong>
            {getStudentName(selectedId)} Total Hours:
          </strong>{" "}
          {Number(selectedStudentTotal).toFixed(2)}
        </div>
      )}

      {showAddAttendance && (
        <form
          onSubmit={addManualAttendance}
          className="manual-attendance-form"
          style={{
            marginBottom: 18,
            padding: 16,
            border: "1px solid #555",
            borderRadius: 8,
            background: "#333",
            color: "#fff",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Add Attendance Manually
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <label>
              Student
              <select
                name="student_id"
                value={attendanceForm.student_id}
                onChange={handleAttendanceFormChange}
                required
              >
                <option value="">Select student</option>

                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.id}
                  >
                    {student.full_name}
                    {student.course_name
                      ? ` — ${student.course_name}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Sign In
              <input
                type="datetime-local"
                name="sign_in_time"
                value={attendanceForm.sign_in_time}
                onChange={handleAttendanceFormChange}
                required
              />
            </label>

            <label>
              Sign Out
              <input
                type="datetime-local"
                name="sign_out_time"
                value={attendanceForm.sign_out_time}
                onChange={handleAttendanceFormChange}
                required
              />
            </label>

            <label>
              Calculated Hours
              <input
                type="text"
                value={manualHoursPreview.toFixed(2)}
                readOnly
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={savingAttendance}
            style={{
              marginTop: 14,
              background: "#2e7d32",
              color: "#fff",
            }}
          >
            {savingAttendance
              ? "Saving..."
              : "Save Attendance"}
          </button>
        </form>
      )}

      <h3 className="attendance-title">
        📊 Attendance History
      </h3>

      <div className="attendance-table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Sign In</th>
              <th>Sign Out</th>
              <th>Session Hours</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredAttendance.length > 0 ? (
              filteredAttendance.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.full_name || getStudentName(entry.student_id)}</td>

                  <td>
                    {entry.sign_in_time
                      ? new Date(
                          entry.sign_in_time
                        ).toLocaleString()
                      : "-"}
                  </td>

                  <td>
                    {entry.sign_out_time
                      ? new Date(
                          entry.sign_out_time
                        ).toLocaleString()
                      : "-"}
                  </td>

                  <td>
                    {Number(
                      entry.session_hours || 0
                    ).toFixed(2)}
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() => openEditModal(entry)}
                      style={{ marginRight: 8 }}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteAttendance(entry)
                      }
                      style={{
                        background: "#b71c1c",
                        color: "#fff",
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "center",
                    padding: 10,
                  }}
                >
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingEntry && (
        <div className="modal-backdrop">
          <div
            className="modal"
            style={{
              display: "block",
              position: "relative",
              width: "min(500px, 90vw)",
              height: "auto",
              background: "#222",
              color: "#fff",
              padding: 20,
              borderRadius: 8,
            }}
          >
            <h3>Edit Attendance</h3>

            <p>
              <strong>Student:</strong>{" "}
              {getStudentName(editingEntry.student_id)}
            </p>

            <label>
              Sign In
              <input
                type="datetime-local"
                value={editSignIn}
                onChange={(event) =>
                  setEditSignIn(event.target.value)
                }
              />
            </label>

            <label>
              Sign Out
              <input
                type="datetime-local"
                value={editSignOut}
                onChange={(event) =>
                  setEditSignOut(event.target.value)
                }
              />
            </label>

            <p>
              <strong>Calculated Hours:</strong>{" "}
              {editHoursPreview.toFixed(2)}
            </p>

            <div className="modal-actions">
              <button
                type="button"
                onClick={handleEditSubmit}
                disabled={savingEdit}
              >
                {savingEdit ? "Saving..." : "✅ Save"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingEntry(null);
                  setEditSignIn("");
                  setEditSignOut("");
                }}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSignIn;