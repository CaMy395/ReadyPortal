import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ClientSchedulingSuccess = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("Finalizing your booking...");

  useEffect(() => {
    console.log("✅ useEffect triggered on ClientSchedulingSuccess page");

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    const pendingBartending = localStorage.getItem("pendingBartendingCourse");
    const pendingAppointment = localStorage.getItem("pendingAppointment");

    if (!pendingBartending && !pendingAppointment) {
      console.warn("⚠️ No pending booking found in localStorage.");
      setMessage("No booking info found. Please try again or contact support.");
      window.removeEventListener("beforeunload", handleBeforeUnload);
      return;
    }

    const submitBartendingAppointment = async (formData) => {
      const scheduleStartDates = {
        "July 19 - Aug 9": "2025-07-19",
        "Aug 23 - Sep 13": "2025-08-23",
        "Sep 27 - Oct 18": "2025-09-27"
      };

      const startDateStr = scheduleStartDates[formData.setSchedule];
      if (!startDateStr) {
        console.error("❌ Invalid setSchedule value:", formData.setSchedule);
        window.removeEventListener("beforeunload", handleBeforeUnload);
        return;
      }

      const firstClassDate = new Date(startDateStr);

      const timeSlot = formData.preferredTime === "Weekdays 6:00pm - 9:00pm"
        ? { start: "18:00:00", end: "21:00:00" }
        : { start: "11:00:00", end: "14:00:00" };

      const appointment = {
        title: "Bartending Course - First Day",
        client_name: formData.fullName,
        client_email: formData.email,
        date: firstClassDate.toISOString().split("T")[0],
        time: timeSlot.start,
        end_time: timeSlot.end,
        description: `Student enrolled in course: ${formData.setSchedule}, Preferred Time: ${formData.preferredTime}`,
        total_cost: 400,
        isFinalized: true,
        isAdmin: true
      };

      console.log("📦 Submitting first day appointment:", appointment);

      const response = await fetch(`${apiUrl}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointment),
      });

      if (!response.ok) {
        console.error("❌ Failed to save the appointment");
        setMessage("Something went wrong saving your appointment. Please contact support.");
        window.removeEventListener("beforeunload", handleBeforeUnload);
        return;
      }

      localStorage.removeItem("pendingBartendingCourse");
      setMessage("Bartending Course booked successfully!");
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };

    const submitSingleAppointment = async (appointmentData) => {
      appointmentData.payment_method = "Square";

      try {
        console.log("📦 Submitting appointment:", appointmentData);
        const response = await fetch(`${apiUrl}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData),
        });

        console.log("📬 Response status:", response.status);
        const result = await response.json();
        console.log("📬 Response body:", result);

        if (response.ok) {
          console.log("✅ Appointment created:", result);
          localStorage.removeItem("pendingAppointment");
          setMessage("Appointment confirmed!");
        } else {
          console.error("❌ Appointment failed validation or availability check.");
          setMessage("Something went wrong saving your appointment. Please contact support.");
        }
      } catch (err) {
        console.error("❌ Appointment save error:", err);
        setMessage("Server error. Please contact support.");
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };

    if (pendingBartending) {
      const formData = JSON.parse(pendingBartending);
      submitBartendingAppointment(formData);
    } else if (pendingAppointment) {
      const appointmentData = JSON.parse(pendingAppointment);
      submitSingleAppointment(appointmentData);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [location, navigate]);

  return (
    <div className="success-container" style={{ textAlign: 'center', padding: '50px' }}>
      <h2 style={{ color: message.includes('confirmed') || message.includes('successfully') ? '#28a745' : 'red', fontSize: '24px', marginBottom: '20px' }}>{message}</h2>
      {(message.includes('confirmed') || message.includes('successfully')) && (
        <p style={{ color: '#333', fontSize: '16px' }}>
          Please check your email for confirmation details. Check spam if email is not received.
        </p>
      )}
    </div>
  );
};

export default ClientSchedulingSuccess;
