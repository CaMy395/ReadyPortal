import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ClientSchedulingSuccess = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState("Finalizing your booking...");

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const paymentPlan = searchParams.get("paymentPlan");
    const email = searchParams.get("email");

    if (paymentPlan === "Payment Plan" && email) {
      setMessage("Redirecting to save your card on file...");
      setTimeout(() => navigate(`/save-card?email=${email}`, { replace: true }), 2000);
      return;
    }

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    const pendingBartending = localStorage.getItem("pendingBartendingCourse");
    const pendingAppointment = localStorage.getItem("pendingAppointment");

    if (sessionStorage.getItem("appointment_submitted") === "true") {
      console.warn("⛔ Booking already submitted. Showing confirmation.");
      setMessage("Appointment already confirmed!");
      window.removeEventListener("beforeunload", handleBeforeUnload);
      return;
    }

    if (!pendingBartending && !pendingAppointment) {
      console.warn("⚠️ No pending booking found in localStorage.");
      setMessage("No booking info found. Please try again or contact support.");
      window.removeEventListener("beforeunload", handleBeforeUnload);
      return;
    }

    const submitBartendingAppointment = async (formData) => {
      sessionStorage.setItem("appointment_submitted", "true");

      const baseCost = formData.paymentPlan === "Payment Plan" ? 100 : 400;
      const addonCost = formData.addons?.reduce((sum, a) => sum + (a.price || 0), 0) || 0;
      const totalCost = baseCost + addonCost;
      const perClassCost = Math.round((totalCost / 8) * 100) / 100;

      const startDateStr = formData.setSchedule.split(" - ")[0] + ", 2025";
      const firstClassDate = new Date(startDateStr);

      const timeSlot = formData.preferredTime === "Weekdays 6:00pm - 9:00pm"
        ? { start: "18:00:00", end: "21:00:00" }
        : { start: "11:00:00", end: "14:00:00" };

      const isWeekday = formData.preferredTime.includes("Weekdays");
      const classDates = [];
      let current = new Date(firstClassDate);

      if (isWeekday) {
        while (classDates.length < 8) {
          const day = current.getDay();
          if (day >= 1 && day <= 4) {
            classDates.push(new Date(current));
          }
          current.setDate(current.getDate() + 1);
        }
      } else {
        for (let i = 0; i < 8; i++) {
          const sessionDate = new Date(current);
          classDates.push(sessionDate);
          current.setDate(current.getDate() + 7);
        }
      }

      try {
        for (let i = 0; i < classDates.length; i++) {
          const dateStr = classDates[i].toISOString().split("T")[0];

          const appointment = {
            title: `Bartending Course - Class ${i + 1}`,
            client_name: formData.fullName,
            client_email: formData.email,
            date: dateStr,
            time: timeSlot.start,
            end_time: timeSlot.end,
            description: `Session ${i + 1} of ${formData.setSchedule}, Preferred Time: ${formData.preferredTime}`,
            price: i === 0 ? totalCost : 0,
            status: 'finalized',
            isAdmin: true
            // Optional: add paid: i === 0 for tracking deposit
          };

          await fetch(`${apiUrl}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appointment),
          });
        }

        setMessage("Bartending Course booked successfully!");
        localStorage.removeItem("pendingBartendingCourse");
      } catch (error) {
        console.error("❌ Network error:", error);
        setMessage("Server error. Please contact support.");
      }

      window.removeEventListener("beforeunload", handleBeforeUnload);
    };

    const submitSingleAppointment = async (appointmentData) => {
      sessionStorage.setItem("appointment_submitted", "true");
      appointmentData.payment_method = "Square";
      appointmentData.status = "finalized"; // ✅ This ensures profits get logged

      try {
        const response = await fetch(`${apiUrl}/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData),
        });

        const result = await response.json();

        if (response.status === 409 || result.duplicate) {
          setMessage("Appointment already confirmed!");
        } else if (response.ok) {
          setMessage("Appointment confirmed!");
        } else {
          console.error("❌ Validation or server error:", result);
          setMessage("Something went wrong saving your appointment. Please contact support.");
        }

        localStorage.removeItem("pendingAppointment");
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
