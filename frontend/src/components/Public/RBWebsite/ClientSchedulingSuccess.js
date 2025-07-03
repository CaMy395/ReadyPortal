// src/pages/ClientSchedulingSuccess.js
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ClientSchedulingSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("Finalizing your booking...");

  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const email = query.get("email");
    const amount = query.get("amount");

    const pending = localStorage.getItem("pendingAppointment");

    if (!pending) {
      setMessage("No booking info found. Please try again or contact support.");
      return;
    }

    const appointmentData = JSON.parse(pending);

    // Attach payment method to the appointmentData
    appointmentData.payment_method = "Square";

    const submitAppointment = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Appointment created:", result);
          localStorage.removeItem("pendingAppointment");
          setMessage("Appointment confirmed! Redirecting...");
          setTimeout(() => navigate('/booking-confirmation'), 2000);
        } else {
          setMessage("Something went wrong saving your appointment. Please contact support.");
        }
      } catch (err) {
        console.error("❌ Appointment save error:", err);
        setMessage("Error saving your appointment. Please contact support.");
      }
    };

    submitAppointment();
  }, [location, navigate]);

  return (
    <div className="success-container">
      <h2>{message}</h2>
    </div>
  );
};

export default ClientSchedulingSuccess;
