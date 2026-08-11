import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef
} from "react";
import axios from "axios";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";

const STUDENT_STATUSES = [
  "enrolled",
  "in_progress",
  "completed",
  "graduated",
  "dropped",
];

const EMPTY_STUDENT_FORM = {
  full_name: "",
  email: "",
  phone: "",
  course_code: "",
  set_schedule: "Private Training",
  preferred_time: "",
  is_adult: true,
  experience: false,
};

const EMPTY_EDIT_FORM = {
  full_name: "",
  email: "",
  phone: "",
  course_code: "",
  set_schedule: "",
  preferred_time: "",
  is_adult: true,
  experience: false,
};

const AdminClassRoster = () => {
  const apiUrl =
    process.env.REACT_APP_API_URL || "http://localhost:3001";

  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [courses, setCourses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showDropped, setShowDropped] = useState(false);
  const [showGraduatedOnly, setShowGraduatedOnly] = useState(false);
  const [showInquiries, setShowInquiries] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);

  const [studentForm, setStudentForm] = useState(EMPTY_STUDENT_FORM);
  const [savingStudent, setSavingStudent] = useState(false);
  const [processingStudentId, setProcessingStudentId] = useState(null);

  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  const [graduationStudent, setGraduationStudent] = useState(null);
  const [writtenScore, setWrittenScore] = useState("");
  const [practicalScore, setPracticalScore] = useState("");
  const [promoteToStaff, setPromoteToStaff] = useState(false);
  const [graduationResult, setGraduationResult] = useState(null);
  const qrRef = useRef(null);

  const fetchRoster = useCallback(async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/bartending-course`
      );

      setStudents(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching roster:", err);
      setError(
        err?.response?.data?.error ||
          "The class roster could not be loaded."
      );
    }
  }, [apiUrl]);

  const fetchAttendance = useCallback(async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/bartending-course/attendance`
      );

      setAttendance(
        Array.isArray(response.data) ? response.data : []
      );
    } catch (err) {
      console.error("Error fetching attendance:", err);
      setError(
        err?.response?.data?.error ||
          "Attendance records could not be loaded."
      );
    }
  }, [apiUrl]);

  const fetchCourses = useCallback(async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/admin/training-courses`
      );

      const rows = Array.isArray(response.data)
        ? response.data
        : [];

      setCourses(rows);
      setStudentForm((current) => ({
        ...current,
        course_code:
          current.course_code || rows[0]?.course_code || "",
      }));
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(
        err?.response?.data?.error ||
          "Training courses could not be loaded."
      );
    }
  }, [apiUrl]);

  const refreshPageData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        fetchRoster(),
        fetchAttendance(),
        fetchCourses(),
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchRoster, fetchAttendance, fetchCourses]);

  useEffect(() => {
    refreshPageData();
  }, [refreshPageData]);

  const calculateHours = useCallback(
    (studentId) => {
      const total = attendance
        .filter(
          (entry) =>
            Number(entry.student_id) === Number(studentId)
        )
        .reduce(
          (sum, entry) =>
            sum + Number(entry.session_hours || 0),
          0
        );

      return Number(total.toFixed(2));
    },
    [attendance]
  );

  const deleteTrainingStudent = async (student) => {
    if (student.graduated_at) {
      window.alert(
        "Graduated students cannot be permanently deleted."
      );
      return;
    }

    const confirmed = window.confirm(
      [
        `Delete ${student.full_name}?`,
        "",
        "This permanently removes the student and their attendance records.",
        "Only use this for duplicates or accidental records.",
      ].join("\n")
    );

    if (!confirmed) return;

    const secondConfirmation = window.confirm(
      "Are you sure? This cannot be undone."
    );

    if (!secondConfirmation) return;

    setProcessingStudentId(student.id);
    setError("");

    try {
      await axios.delete(
        `${apiUrl}/api/admin/training-students/${student.id}`
      );

      window.alert(
        `${student.full_name} was deleted successfully.`
      );

      await Promise.all([
        fetchRoster(),
        fetchAttendance(),
      ]);
    } catch (err) {
      console.error("Error deleting student:", err);

      const message =
        err?.response?.data?.error ||
        "The student could not be deleted.";

      setError(message);
      window.alert(message);
    } finally {
      setProcessingStudentId(null);
    }
  };

  const getEnrollmentStatus = (student) => {
    if (student.graduated_at) return "graduated";

    if (
      student.dropped ||
      student.enrollment_status === "dropped"
    ) {
      return "dropped";
    }

    return student.enrollment_status || "inquiry";
  };

  const isActualStudent = (student) =>
    STUDENT_STATUSES.includes(getEnrollmentStatus(student));

  const calculatedOverallScore = useMemo(() => {
    if (!graduationStudent) return null;

    const writtenRequired =
      graduationStudent.written_exam_required !== false;

    const practicalRequired =
      graduationStudent.practical_exam_required === true;

    const written =
      writtenScore === "" ? null : Number(writtenScore);

    const practical =
      practicalScore === "" ? null : Number(practicalScore);

    if (
      writtenRequired &&
      (written === null || !Number.isFinite(written))
    ) {
      return null;
    }

    if (
      practicalRequired &&
      (practical === null || !Number.isFinite(practical))
    ) {
      return null;
    }

    if (writtenRequired && practicalRequired) {
      return Number(((written + practical) / 2).toFixed(2));
    }

    if (writtenRequired && !practicalRequired) {
      return Number(written.toFixed(2));
    }

    if (!writtenRequired && practicalRequired) {
      return Number(practical.toFixed(2));
    }

    return null;
  }, [
    graduationStudent,
    writtenScore,
    practicalScore,
  ]);

  const handleStudentFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setStudentForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const addTrainingStudent = async (event) => {
    event.preventDefault();

    if (
      !studentForm.full_name.trim() ||
      !studentForm.email.trim() ||
      !studentForm.phone.trim() ||
      !studentForm.course_code
    ) {
      window.alert(
        "Name, email, phone, and course are required."
      );
      return;
    }

    setSavingStudent(true);
    setError("");

    try {
      const response = await axios.post(
        `${apiUrl}/api/admin/training-students`,
        {
          full_name: studentForm.full_name.trim(),
          email: studentForm.email.trim(),
          phone: studentForm.phone.trim(),
          course_code: studentForm.course_code,
          set_schedule:
            studentForm.set_schedule.trim() || "Private Training",
          preferred_time:
            studentForm.preferred_time.trim() || null,
          is_adult: studentForm.is_adult,
          experience: studentForm.experience,
        }
      );

      window.alert(
        `${response.data?.student?.full_name || "Student"} was added to the training roster.`
      );

      setStudentForm({
        ...EMPTY_STUDENT_FORM,
        course_code: courses[0]?.course_code || "",
      });
      setShowAddStudent(false);
      await fetchRoster();
    } catch (err) {
      console.error("Error adding student:", err);
      const message =
        err?.response?.data?.error ||
        "The training student could not be added.";
      setError(message);
      window.alert(message);
    } finally {
      setSavingStudent(false);
    }
  };

  const openEditStudentModal = (student) => {
    setEditingStudent(student);
    setEditForm({
      full_name: student.full_name || "",
      email: student.email || "",
      phone: student.phone || "",
      course_code: student.course_code || "",
      set_schedule: student.set_schedule || "",
      preferred_time: student.preferred_time || "",
      is_adult: Boolean(student.is_adult),
      experience: Boolean(student.experience),
    });
    setError("");
  };

  const closeEditStudentModal = () => {
    if (savingEdit) return;
    setEditingStudent(null);
    setEditForm(EMPTY_EDIT_FORM);
  };

  const handleEditFormChange = (event) => {
    const { name, value, type, checked } = event.target;

    setEditForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveStudentEdits = async (event) => {
    event.preventDefault();

    if (!editingStudent) return;

    if (
      !editForm.full_name.trim() ||
      !editForm.email.trim() ||
      !editForm.phone.trim() ||
      (!editingStudent.graduated_at && !editForm.course_code)
    ) {
      window.alert(
        editingStudent.graduated_at
          ? "Name, email, and phone are required."
          : "Name, email, phone, and course are required."
      );
      return;
    }

    const courseChanged =
      !editingStudent.graduated_at &&
      editForm.course_code !== (editingStudent.course_code || "");

    if (courseChanged) {
      const confirmed = window.confirm(
        "Changing the course will also change the required hours and graduation requirements. Continue?"
      );
      if (!confirmed) return;
    }

    setSavingEdit(true);
    setError("");

    try {
      const response = await axios.patch(
        `${apiUrl}/api/admin/training-students/${editingStudent.id}`,
        {
          full_name: editForm.full_name.trim(),
          email: editForm.email.trim(),
          phone: editForm.phone.trim(),
          course_code: editingStudent.graduated_at
            ? editingStudent.course_code
            : editForm.course_code,
          set_schedule:
            editForm.set_schedule.trim() || "Private Training",
          preferred_time: editForm.preferred_time.trim() || null,
          is_adult: editForm.is_adult,
          experience: editForm.experience,
        }
      );

      window.alert(
        `${response.data?.student?.full_name || "Student"} was updated successfully.`
      );

      setEditingStudent(null);
      setEditForm(EMPTY_EDIT_FORM);
      await fetchRoster();
    } catch (err) {
      console.error("Error updating student:", err);
      const message =
        err?.response?.data?.error ||
        "The student record could not be updated.";
      setError(message);
      window.alert(message);
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleDropped = async (student) => {
    const currentlyDropped =
      student.dropped ||
      student.enrollment_status === "dropped";

    const nextDropped = !currentlyDropped;
    const nextStatus = nextDropped ? "dropped" : "enrolled";

    const confirmed = window.confirm(
      nextDropped
        ? `Mark ${student.full_name} as dropped?`
        : `Return ${student.full_name} to enrolled status?`
    );

    if (!confirmed) return;

    setProcessingStudentId(student.id);
    setError("");

    try {
      await axios.patch(
        `${apiUrl}/api/bartending-course/${student.id}`,
        {
          dropped: nextDropped,
          enrollment_status: nextStatus,
        }
      );

      await fetchRoster();
    } catch (err) {
      console.error("Error updating status:", err);
      const message =
        err?.response?.data?.error ||
        "The enrollment status could not be updated.";
      setError(message);
      window.alert(message);
    } finally {
      setProcessingStudentId(null);
    }
  };

  const createStudentLogin = async (student) => {
    setProcessingStudentId(student.id);
    setError("");

    try {
      const response = await fetch(
        `${apiUrl}/admin/inquiries/${student.id}/create-login`,
        { method: "POST" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create login.");
      }

      if (data.tempPassword) {
        window.alert(
          [
            "Login created.",
            "",
            `Username: ${data.user?.username || ""}`,
            `Temporary Password: ${data.tempPassword}`,
          ].join("\n")
        );
      } else {
        window.alert(
          `Linked to existing user: ${
            data.user?.username ||
            data.user?.email ||
            "User account"
          }`
        );
      }

      await fetchRoster();
    } catch (err) {
      console.error("Error creating login:", err);
      const message =
        err?.message || "Failed to create student login.";
      setError(message);
      window.alert(message);
    } finally {
      setProcessingStudentId(null);
    }
  };

  const regenerateCertificate = async (student) => {
    if (!student?.id) return;

    const confirmed = window.confirm(
      [
        `Regenerate ${student.full_name}'s certificate?`,
        "",
        "This will:",
        "• Generate a fresh certificate PDF",
        "• Keep the same certificate number",
        "• Keep the same issue date",
        "• Keep the same verification link",
        "• Email the updated certificate to the student",
        "",
        `Send to: ${student.email}`,
      ].join("\n")
    );

    if (!confirmed) return;

    const curriculumUpdate = window.confirm(
      [
        "Does this regeneration reflect a curriculum update?",
        "",
        "Choose OK only if the student completed a supplemental curriculum review/assessment and you want to record the curriculum update date.",
        "",
        "Choose Cancel for a normal certificate regeneration or correction.",
      ].join("\n")
    );

    setProcessingStudentId(student.id);
    setError("");

    try {
      const response = await axios.post(
        `${apiUrl}/api/admin/training-certificates/${student.id}/regenerate`,
        {
          curriculum_update: curriculumUpdate,
        }
      );

      window.alert(
        response.data?.message ||
          (
            curriculumUpdate
              ? `${student.full_name}'s certificate was regenerated, emailed, and the curriculum update date was recorded.`
              : `${student.full_name}'s certificate was regenerated and emailed successfully.`
          )
      );

      await fetchRoster();
    } catch (err) {
      console.error("Error regenerating certificate:", err);

      const message =
        err?.response?.data?.error ||
        "The certificate could not be regenerated.";

      setError(message);
      window.alert(message);
    } finally {
      setProcessingStudentId(null);
    }
  };

  const openGraduationModal = (student) => {
    setGraduationStudent(student);
    setWrittenScore(
      student.written_exam_score !== null &&
        student.written_exam_score !== undefined
        ? String(student.written_exam_score)
        : ""
    );
    setPracticalScore(
      student.practical_exam_score !== null &&
        student.practical_exam_score !== undefined
        ? String(student.practical_exam_score)
        : ""
    );
    setPromoteToStaff(false);
    setGraduationResult(null);
    setError("");
  };

  const closeGraduationModal = () => {
    setGraduationStudent(null);
    setWrittenScore("");
    setPracticalScore("");
    setPromoteToStaff(false);
    setGraduationResult(null);
  };

  const graduateStudent = async () => {
    if (!graduationStudent) return;

    const writtenRequired =
      graduationStudent.written_exam_required !== false;

    const practicalRequired =
      graduationStudent.practical_exam_required === true;

    const written =
      writtenScore === "" ? null : Number(writtenScore);

    const practical =
      practicalScore === "" ? null : Number(practicalScore);

    const overall = calculatedOverallScore;

    if (
      writtenRequired &&
      (!Number.isFinite(written) ||
        written < 0 ||
        written > 100)
    ) {
      window.alert("Enter a valid written score from 0 to 100.");
      return;
    }

    if (
      practicalRequired &&
      (!Number.isFinite(practical) ||
        practical < 0 ||
        practical > 100)
    ) {
      window.alert(
        "Enter a valid practical score from 0 to 100."
      );
      return;
    }

    if (overall === null) {
      window.alert("The final score could not be calculated.");
      return;
    }

    const minimumWritten = Number(
      graduationStudent.minimum_written_score ?? 0
    );

    const minimumPractical = Number(
      graduationStudent.minimum_practical_score ?? 0
    );

    const minimumOverall = Number(
      graduationStudent.minimum_overall_score ?? 0
    );

    if (writtenRequired && written < minimumWritten) {
      window.alert(
        `Written score must be at least ${minimumWritten}%.`
      );
      return;
    }

    if (practicalRequired && practical < minimumPractical) {
      window.alert(
        `Practical score must be at least ${minimumPractical}%.`
      );
      return;
    }

    if (overall < minimumOverall) {
      window.alert(
        `Final score must be at least ${minimumOverall}%.`
      );
      return;
    }

    const confirmationLines = [
      `Graduate ${graduationStudent.full_name}?`,
      "",
    ];

    if (writtenRequired) {
      confirmationLines.push(
        `Written: ${written.toFixed(2)}%`
      );
    }

    if (practicalRequired) {
      confirmationLines.push(
        `Practical: ${practical.toFixed(2)}%`
      );
    }

    confirmationLines.push(
      practicalRequired
        ? `Overall: ${overall.toFixed(2)}%`
        : `Final Score: ${overall.toFixed(2)}%`,
      "",
      "This will generate the certificate number."
    );

    const confirmed = window.confirm(
      confirmationLines.join("")
    );

    if (!confirmed) return;

    setProcessingStudentId(graduationStudent.id);
    setError("");

    try {
      const response = await axios.patch(
        `${apiUrl}/admin/students/${graduationStudent.id}/graduate`,
        {
          written_exam_score:
            writtenRequired ? written : null,

          practical_exam_score:
            practicalRequired ? practical : null,

          promote_to_staff: promoteToStaff,
        }
      );

      setGraduationResult(response.data);
      await Promise.all([fetchRoster(), fetchAttendance()]);
    } catch (err) {
      console.error("Error graduating student:", err);

      const message =
        err?.response?.data?.error ||
        "The student could not be graduated.";

      setError(message);
      window.alert(message);
    } finally {
      setProcessingStudentId(null);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const status = getEnrollmentStatus(student);
      const actualStudent = isActualStudent(student);
      const dropped = status === "dropped";
      const graduated = Boolean(student.graduated_at);

      if (!showInquiries && !actualStudent) return false;
      if (!showDropped && dropped) return false;
      if (showGraduatedOnly && !graduated) return false;

      return true;
    });
  }, [students, showDropped, showGraduatedOnly, showInquiries]);

  const counts = useMemo(() => {
    const actualStudents = students.filter(isActualStudent);

    const inquiries = students.filter(
      (student) => !isActualStudent(student)
    ).length;

    const dropped = actualStudents.filter(
      (student) => getEnrollmentStatus(student) === "dropped"
    ).length;

    const graduated = actualStudents.filter((student) =>
      Boolean(student.graduated_at)
    ).length;

    const active = actualStudents.filter((student) =>
      ["enrolled", "in_progress", "completed"].includes(
        getEnrollmentStatus(student)
      )
    ).length;

    return {
      totalStudents: actualStudents.length,
      inquiries,
      dropped,
      graduated,
      active,
    };
  }, [students]);

  const getStatusBadgeStyle = (status) => {
    const base = {
      display: "inline-block",
      padding: "3px 8px",
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 700,
      textTransform: "capitalize",
    };

    const styles = {
      graduated: {
        background: "#e8f5e9",
        border: "1px solid #81c784",
        color: "#1b5e20",
      },
      dropped: {
        background: "#ffebee",
        border: "1px solid #ef9a9a",
        color: "#b71c1c",
      },
      in_progress: {
        background: "#fff8e1",
        border: "1px solid #ffd54f",
        color: "#795548",
      },
      completed: {
        background: "#e3f2fd",
        border: "1px solid #90caf9",
        color: "#0d47a1",
      },
      enrolled: {
        background: "#e8eaf6",
        border: "1px solid #9fa8da",
        color: "#283593",
      },
      inquiry: {
        background: "#eeeeee",
        border: "1px solid #bdbdbd",
        color: "#424242",
      },
    };

    return {
      ...base,
      ...(styles[status] || styles.inquiry),
    };
  };

  if (loading) {
    return (
      <div className="roster-container">
        <h2 className="roster-title">
          📋 Ready Training Institute Roster
        </h2>
        <p>Loading roster...</p>
      </div>
    );
  }

  const downloadQRCode = async () => {
  if (!qrRef.current) return;

  try {
    const dataUrl = await toPng(qrRef.current, {
      cacheBust: true,
      pixelRatio: 3,
    });

    const link = document.createElement("a");

    link.download = `${
      graduationResult.certificate.certificate_number
    }-QR.png`;

    link.href = dataUrl;

    link.click();
  } catch (err) {
    console.error(err);

    alert("Unable to download QR Code.");
  }
};

  return (
    <div className="roster-container">
      <h2 className="roster-title">
        📋 Ready Training Institute Roster
      </h2>

      {error && (
        <div
          style={{
            margin: "10px 0",
            padding: 12,
            background: "#ffebee",
            border: "1px solid #ef9a9a",
            color: "#b71c1c",
            borderRadius: 6,
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button
          type="button"
          onClick={() => setShowAddStudent((current) => !current)}
          style={{ background: "#7b1fa2", color: "#fff" }}
        >
          {showAddStudent
            ? "Close Add Student"
            : "+ Add Training Student"}
        </button>

        <button type="button" onClick={refreshPageData}>
          Refresh
        </button>
      </div>

      {showAddStudent && (
        <form
          className="training-student-form"
          onSubmit={addTrainingStudent}
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
            Add Private or Corporate Training Student
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
              Full Name
              <input
                type="text"
                name="full_name"
                value={studentForm.full_name}
                onChange={handleStudentFormChange}
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                name="email"
                value={studentForm.email}
                onChange={handleStudentFormChange}
                required
              />
            </label>

            <label>
              Phone
              <input
                type="tel"
                name="phone"
                value={studentForm.phone}
                onChange={handleStudentFormChange}
                required
              />
            </label>

            <label>
              Training Course
              <select
                name="course_code"
                value={studentForm.course_code}
                onChange={handleStudentFormChange}
                required
              >
                <option value="">Select course</option>
                {courses.map((course) => (
                  <option
                    key={course.id}
                    value={course.course_code}
                  >
                    {course.course_name} — {Number(course.required_hours)} hours
                  </option>
                ))}
              </select>
            </label>

            <label>
              Schedule Label
              <input
                type="text"
                name="set_schedule"
                value={studentForm.set_schedule}
                onChange={handleStudentFormChange}
                placeholder="Runway Staff Training"
              />
            </label>

            <label>
              Preferred Days or Time
              <input
                type="text"
                name="preferred_time"
                value={studentForm.preferred_time}
                onChange={handleStudentFormChange}
                placeholder="Tuesday–Thursday, 6–9 PM"
              />
            </label>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 18,
              marginTop: 14,
            }}
          >
            <label>
              <input
                type="checkbox"
                name="is_adult"
                checked={studentForm.is_adult}
                onChange={handleStudentFormChange}
              />
              Student is at least 18
            </label>

            <label>
              <input
                type="checkbox"
                name="experience"
                checked={studentForm.experience}
                onChange={handleStudentFormChange}
              />
              Has bartending experience
            </label>
          </div>

          <button
            type="submit"
            disabled={savingStudent}
            style={{
              marginTop: 14,
              background: "#2e7d32",
              color: "#fff",
            }}
          >
            {savingStudent
              ? "Adding Student..."
              : "Add to Training Roster"}
          </button>
        </form>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
          margin: "10px 0",
        }}
      >
        <button
          type="button"
          onClick={() => setShowDropped((current) => !current)}
        >
          {showDropped ? "Hide Dropped" : "Show Dropped"} ({counts.dropped})
        </button>

        <button
          type="button"
          onClick={() =>
            setShowGraduatedOnly((current) => !current)
          }
        >
          {showGraduatedOnly
            ? "Show All Students"
            : "Show Graduated Only"}{" "}
          ({counts.graduated})
        </button>

        <button
          type="button"
          onClick={() => setShowInquiries((current) => !current)}
        >
          {showInquiries ? "Hide Inquiries" : "Show Inquiries"} ({counts.inquiries})
        </button>

        <span
          style={{
            marginLeft: "auto",
            fontSize: 14,
            color: "#fff",
          }}
        >
          Students: {counts.totalStudents} • Active: {counts.active} • Graduated: {counts.graduated} • Inquiries: {counts.inquiries}
        </span>
      </div>

      <div className="roster-table-wrapper">
        <table className="roster-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Course</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Schedule</th>
              <th>Days</th>
              <th>Hours</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudents.map((student) => {
              const hours = calculateHours(student.id);
              const requiredHours = Number(
                student.required_hours || 24
              );
              const hoursComplete = hours >= requiredHours;
              const status = getEnrollmentStatus(student);
              const isDropped = status === "dropped";
              const isGraduated = Boolean(student.graduated_at);
              const isInquiry = status === "inquiry";
              const isProcessing =
                processingStudentId === student.id;
              const canGraduate =
                !isDropped &&
                !isGraduated &&
                !isInquiry &&
                hoursComplete;

              return (
                <tr key={student.id}>
                  <td>{student.full_name}</td>

                  <td>
                    <strong>
                      {student.course_code || "Not assigned"}
                    </strong>
                    <div style={{ fontSize: 12 }}>
                      {student.course_name || ""}
                    </div>
                  </td>

                  <td>{student.email}</td>
                  <td>{student.phone}</td>
                  <td>{student.set_schedule}</td>
                  <td>{student.preferred_time}</td>
                  <td>
                    {hours.toFixed(2)} / {requiredHours.toFixed(2)}
                  </td>

                  <td>
                    <span style={getStatusBadgeStyle(status)}>
                      {status.replaceAll("_", " ")}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() => openEditStudentModal(student)}
                      disabled={isProcessing}
                      title={
                        isGraduated
                          ? "Edit contact details. Course remains locked after graduation."
                          : "Edit student details and assigned course."
                      }
                      style={{
                        marginRight: 6,
                        background: "#1565c0",
                        color: "#fff",
                      }}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTrainingStudent(student)}
                      disabled={isProcessing || isGraduated}
                      title={
                        isGraduated
                          ? "Graduated students cannot be permanently deleted."
                          : "Delete duplicate or accidental student record."
                      }
                      style={{
                        marginRight: 6,
                        background: isGraduated ? "#555" : "#b71c1c",
                        color: "#fff",
                      }}
                    >
                      🗑️ Delete
                    </button>

                    {!isInquiry && (
                      <button
                        type="button"
                        onClick={() => toggleDropped(student)}
                        disabled={isProcessing || isGraduated}
                        style={{ marginRight: 6 }}
                      >
                        {isDropped
                          ? "Return to Enrolled"
                          : "Mark Dropped"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openGraduationModal(student)}
                      disabled={!canGraduate || isProcessing}
                      style={{
                        marginRight: 6,
                        background: canGraduate ? "#2e7d32" : "#555",
                        color: "#fff",
                      }}
                    >
                      {isProcessing
                        ? "Processing..."
                        : isGraduated
                          ? "Graduated"
                          : "Graduate + Certificate"}
                    </button>

                    {isGraduated && (
                      <button
                        type="button"
                        onClick={() => regenerateCertificate(student)}
                        disabled={isProcessing}
                        style={{
                          marginRight: 6,
                          background: "#6a1b9a",
                          color: "#fff",
                        }}
                        title="Regenerate the certificate PDF and email the updated certificate to the student."
                      >
                        {isProcessing
                          ? "Regenerating..."
                          : "♻️ Regenerate Cert"}
                      </button>
                    )}

                    {!student.user_id ? (
                      <button
                        type="button"
                        onClick={() => createStudentLogin(student)}
                        disabled={isProcessing}
                      >
                        Create Login
                      </button>
                    ) : (
                      <span> Login linked</span>
                    )}
                  </td>
                </tr>
              );
            })}

            {filteredStudents.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{ textAlign: "center", padding: 16 }}
                >
                  No students match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            padding: 20,
          }}
        >
          <form
            onSubmit={saveStudentEdits}
            style={{
              width: "min(620px, 95vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#222",
              color: "#fff",
              border: "1px solid #666",
              borderRadius: 10,
              padding: 20,
            }}
          >
            <h3 style={{ marginTop: 0 }}>Edit Training Student</h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <label style={{ color: "#fff" }}>
                Full Name
                <input
                  type="text"
                  name="full_name"
                  value={editForm.full_name}
                  onChange={handleEditFormChange}
                  required
                />
              </label>

              <label style={{ color: "#fff" }}>
                Email
                <input
                  type="email"
                  name="email"
                  value={editForm.email}
                  onChange={handleEditFormChange}
                  required
                />
              </label>

              <label style={{ color: "#fff" }}>
                Phone
                <input
                  type="tel"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditFormChange}
                  required
                />
              </label>

              <label style={{ color: "#fff" }}>
                Training Course
                <select
                  name="course_code"
                  value={editForm.course_code}
                  onChange={handleEditFormChange}
                  required={!editingStudent?.graduated_at}
                  disabled={Boolean(editingStudent?.graduated_at)}
                >
                  <option value="">Select course</option>
                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.course_code}
                    >
                      {course.course_name} — {Number(course.required_hours)} hours
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ color: "#fff" }}>
                Schedule Label
                <input
                  type="text"
                  name="set_schedule"
                  value={editForm.set_schedule}
                  onChange={handleEditFormChange}
                  placeholder="Runway Staff Training"
                />
              </label>

              <label style={{ color: "#fff" }}>
                Preferred Days or Time
                <input
                  type="text"
                  name="preferred_time"
                  value={editForm.preferred_time}
                  onChange={handleEditFormChange}
                  placeholder="Tuesday–Thursday, 6–9 PM"
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 18,
                marginTop: 16,
              }}
            >
              <label
                style={{
                  color: "#fff",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  name="is_adult"
                  checked={editForm.is_adult}
                  onChange={handleEditFormChange}
                />
                Student is at least 18
              </label>

              <label
                style={{
                  color: "#fff",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  name="experience"
                  checked={editForm.experience}
                  onChange={handleEditFormChange}
                />
                Has bartending experience
              </label>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "#111",
                border: "1px solid #555",
                borderRadius: 8,
                fontSize: 13,
              }}
            >
              {editingStudent?.graduated_at
                ? "This student has graduated. You may correct the name, email, phone, schedule, and other contact details, but the assigned course is locked. Name corrections also need to update the certificate record in the backend."
                : "Changing the course changes the required attendance hours and graduation requirements."}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 20,
              }}
            >
              <button
                type="button"
                onClick={closeEditStudentModal}
                disabled={savingEdit}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={savingEdit}
                style={{ background: "#1565c0", color: "#fff" }}
              >
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {graduationStudent && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.78)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(560px, 95vw)",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#222",
              color: "#fff",
              border: "1px solid #666",
              borderRadius: 10,
              padding: 20,
            }}
          >
            {!graduationResult ? (
              <>
                <h3 style={{ marginTop: 0 }}>Graduate Student</h3>

                <p>
                  <strong>Student:</strong>{" "}
                  {graduationStudent.full_name}
                </p>

                <p>
                  <strong>Course:</strong>{" "}
                  {graduationStudent.course_name ||
                    graduationStudent.course_code}
                </p>

                <p>
                  <strong>Hours:</strong>{" "}
                  {calculateHours(graduationStudent.id).toFixed(2)} /{" "}
                  {Number(
                    graduationStudent.required_hours || 24
                  ).toFixed(2)}
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: 12,
                    marginTop: 18,
                  }}
                >
                  {graduationStudent.written_exam_required !== false && (
                    <label style={{ color: "#fff" }}>
                      Written Exam Score
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={writtenScore}
                        onChange={(event) =>
                          setWrittenScore(event.target.value)
                        }
                      />
                      <small>
                        Minimum:{" "}
                        {Number(
                          graduationStudent.minimum_written_score ??
                            0
                        ).toFixed(2)}
                        %
                      </small>
                    </label>
                  )}

                  {graduationStudent.practical_exam_required === true && (
                    <label style={{ color: "#fff" }}>
                      Practical Exam Score
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={practicalScore}
                        onChange={(event) =>
                          setPracticalScore(event.target.value)
                        }
                      />
                      <small>
                        Minimum:{" "}
                        {Number(
                          graduationStudent.minimum_practical_score ??
                            0
                        ).toFixed(2)}
                        %
                      </small>
                    </label>
                  )}
                </div>

                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    background: "#111",
                    border: "1px solid #555",
                    borderRadius: 8,
                  }}
                >
                  <strong>
                    {graduationStudent.practical_exam_required === true
                      ? "Overall Score:"
                      : "Final Score:"}
                  </strong>{" "}
                  {calculatedOverallScore === null
                    ? "Enter required score"
                    : `${calculatedOverallScore.toFixed(2)}%`}
                </div>

                <label
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    marginTop: 16,
                    color: "#fff",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={promoteToStaff}
                    onChange={(event) =>
                      setPromoteToStaff(event.target.checked)
                    }
                  />
                  Promote to Ready staff
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                    marginTop: 20,
                  }}
                >
                  <button
                    type="button"
                    onClick={closeGraduationModal}
                    disabled={
                      processingStudentId === graduationStudent.id
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={graduateStudent}
                    disabled={
                      processingStudentId === graduationStudent.id ||
                      calculatedOverallScore === null
                    }
                    style={{ background: "#2e7d32", color: "#fff" }}
                  >
                    {processingStudentId === graduationStudent.id
                      ? "Graduating..."
                      : "Graduate + Generate Number"}
                  </button>
                </div>
              </>
            ) : (
              <>
  <h3 style={{ marginTop: 0 }}>
    🎓 Graduation Complete
  </h3>

  {(() => {
    const certificate = graduationResult?.certificate;

    const verificationToken =
      certificate?.verification_token || "";

    const verificationUrl = verificationToken
      ? `https://readybartending.com/verify/${verificationToken}`
      : "";

    return (
      <>
        <div
          style={{
            padding: 16,
            background: "#111",
            border: "1px solid #555",
            borderRadius: 8,
            lineHeight: 1.8,
          }}
        >
          <div>
            <strong>Student:</strong>{" "}
            {graduationResult?.student?.full_name ||
              graduationStudent?.full_name ||
              "Not provided"}
          </div>

          <div>
            <strong>Certificate Number:</strong>{" "}
            {certificate?.certificate_number || "Not generated"}
          </div>

          <div>
            <strong>Course:</strong>{" "}
            {certificate?.course_name ||
              graduationStudent?.course_name ||
              "Not provided"}
          </div>

          <div>
            <strong>Course Hours:</strong>{" "}
            {certificate?.course_hours ||
              graduationStudent?.required_hours ||
              "Not provided"}
          </div>

          {graduationStudent?.written_exam_required !== false && (
            <div>
              <strong>Written Score:</strong>{" "}
              {Number(writtenScore).toFixed(2)}%
            </div>
          )}

          {graduationStudent?.practical_exam_required === true && (
            <div>
              <strong>Practical Score:</strong>{" "}
              {Number(practicalScore).toFixed(2)}%
            </div>
          )}

          <div>
            <strong>
              {graduationStudent?.practical_exam_required === true
                ? "Overall Score:"
                : "Final Score:"}
            </strong>{" "}
            {calculatedOverallScore !== null
              ? `${Number(calculatedOverallScore).toFixed(2)}%`
              : "Not provided"}
          </div>

          <div>
            <strong>Issue Date:</strong>{" "}
            {certificate?.issue_date
              ? new Date(
                  certificate.issue_date
                ).toLocaleDateString()
              : new Date().toLocaleDateString()}
          </div>
        </div>

        {verificationUrl ? (
          <div
            style={{
              marginTop: 20,
              textAlign: "center",
            }}
          >
            <h4>Verification QR Code</h4>

            <div
  ref={qrRef}
  style={{
    background: "#fff",
    padding: 15,
    display: "inline-block",
    borderRadius: 8,
  }}
>

              <QRCode
                value={verificationUrl}
                size={180}
              />
            </div>

            <p style={{ marginTop: 15 }}>
              <strong>Verification Link</strong>
            </p>

            <input
              type="text"
              readOnly
              value={verificationUrl}
              style={{
                width: "100%",
                padding: 10,
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    verificationUrl
                  );

                  window.alert(
                    "Verification link copied."
                  );
                } catch (error) {
                  console.error(
                    "Could not copy verification link:",
                    error
                  );

                  window.alert(
                    "Could not copy the link automatically."
                  );
                }
              }}
              style={{ marginTop: 10 }}
            >
              Copy Verification Link
            </button>
            <button
  type="button"
  onClick={downloadQRCode}
  style={{
    marginTop: 10,
    marginLeft: 10,
  }}
>
    Download QR Code
</button>
          </div>
        ) : (
          <p
            style={{
              marginTop: 16,
              color: "#ffb3b3",
            }}
          >
            The verification token was not returned, so the QR
            code could not be created.
          </p>
        )}

        <p style={{ marginTop: 14 }}>
          Use this information and QR code in your Canva
          certificate template.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 18,
          }}
        >
          <button
            type="button"
            onClick={closeGraduationModal}
          >
            Close
          </button>
        </div>
      </>
    );
  })()}
</>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClassRoster;
