// src/pages/ClientSchedulingSuccess.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ClientSchedulingSuccess = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("Finalizing your booking...");

  useEffect(() => {
    console.log("🚀 useEffect triggered on ClientSchedulingSuccess page");

    const pending = localStorage.getItem("pendingAppointment");
    console.log("🧪 Raw pendingAppointment:", pending);

    if (!pending) {
      console.warn("⚠️ No pending appointment found in localStorage.");
      setMessage("No booking info found. Please try again or contact support.");
      return;
    }

    let appointmentData = null;
    try {
      appointmentData = JSON.parse(pending);
      console.log("✅ Parsed appointmentData:", appointmentData);
    } catch (err) {
      console.error("❌ Failed to parse appointmentData:", err);
      setMessage("Invalid appointment data. Please try again.");
      return;
    }

    appointmentData.payment_method = "Square";

const submitAppointment = async () => {
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
};

    submitAppointment();
  }, [location, navigate]);

  return (
  <div className="success-container" style={{ textAlign: 'center', padding: '50px' }}>
    <h2
      style={{
        color: message.includes('confirmed') || message.includes('already processed') ? '#28a745' : 'red',
        fontSize: '24px',
        marginBottom: '20px',
      }}
    >
      {message}
    </h2>

    {(message.includes('confirmed') || message.includes('already processed')) && (
      <p style={{ color: '#333', fontSize: '16px' }}>
        Please check your email for confirmation details.
      </p>
    )}
  </div>
);

};

export default ClientSchedulingSuccess;
