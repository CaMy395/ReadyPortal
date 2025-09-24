import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import appointmentTypes from "../../../data/appointmentTypes.json";

const ClientSchedulingPage = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const [searchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointmentType, setSelectedAppointmentType] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [classCount, setClassCount] = useState(1);
  const [disableTypeSelect, setDisableTypeSelect] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [price, setPrice] = useState(75); // Default fallback

  const isStartApplication = searchParams.get("startApplication") === "true";
  const cycleStartParam = searchParams.get("cycleStart") || ""; // optional for courses

  const [selectedAddons] = useState(() => {
    const encodedAddons = searchParams.get("addons");
    if (encodedAddons) {
      try {
        return JSON.parse(atob(decodeURIComponent(encodedAddons))).map((addon) => ({
          name: addon.name,
          price: addon.price,
          quantity: addon.quantity || 1,
        }));
      } catch (error) {
        console.error("❌ Error decoding add-ons:", error);
      }
    }
    return [];
  });

  useEffect(() => {
    const name = searchParams.get("name");
    const email = searchParams.get("email");
    const phone = searchParams.get("phone");
    const guests = searchParams.get("guestCount") || 1;
    const classes = searchParams.get("classCount") || 1;
    const type = searchParams.get("appointmentType");
    const priceParam = searchParams.get("price");

    if (name) setClientName(name);
    if (email) setClientEmail(email);
    if (phone) setClientPhone(phone);
    if (guests) setGuestCount(parseInt(guests));
    if (classes) setClassCount(parseInt(classes));
    if (priceParam) setPrice(parseFloat(priceParam));

    if (isStartApplication) {
      setSelectedAppointmentType("Auditions for Bartender (1 hour 30 minutes)");
      setPrice(0);
    } else if (type) {
      setSelectedAppointmentType(type);
    }
  }, [searchParams, isStartApplication]);

  const fetchAvailability = useCallback(async () => {
    if (!selectedDate || !selectedAppointmentType) return;

    const formattedDate = selectedDate.toISOString().split("T")[0];
    const appointmentWeekday = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).trim();

    try {
      const response = await axios.get(`${apiUrl}/availability`, {
        params: { weekday: appointmentWeekday, appointmentType: selectedAppointmentType, date: formattedDate },
      });

      const blockedTimesRes = await axios.get(`${apiUrl}/blocked-times`, { params: { date: formattedDate } });
      const bookedTimesRes = await axios.get(`${apiUrl}/appointments/by-date`, { params: { date: formattedDate } });

      const blockedEntries = blockedTimesRes.data.blockedTimes;
      const bookedTimesRaw = bookedTimesRes.data;

      const formattedAvailableSlots = response.data.map((slot) => ({
        ...slot,
        start_time: slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time,
        end_time: slot.end_time.length === 5 ? `${slot.end_time}:00` : slot.end_time,
      }));

      const getMinutes = (time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
      };

      const normalizeTime = (time) => (time.length === 5 ? `${time}:00` : time);

      const finalSlots = formattedAvailableSlots.map((slot) => {
        const slotStartMin = getMinutes(normalizeTime(slot.start_time));
        const slotEndMin = getMinutes(normalizeTime(slot.end_time));

        const isBlocked = blockedEntries.some((blocked) => {
          if (!blocked?.timeSlot) return false;
          const parts = blocked.timeSlot.split("-");
          const blockDate = parts[0];
          const blockHour = parts[3];
          if (blockDate !== formattedDate) return false;
          const blockStartMin = getMinutes(blockHour.length === 5 ? `${blockHour}:00` : blockHour);
          const match = blocked.label?.match(/\((\d+(\.\d+)?)\s*hours?\)/i);
          const blockEndMin = blockStartMin + (match ? parseFloat(match[1]) * 60 : 60);
          return slotStartMin < blockEndMin && slotEndMin > blockStartMin;
        });

        const isBooked = bookedTimesRaw.some((appointment) => {
          if (appointment.date !== formattedDate) return false;

          const bookedStartMin = getMinutes(normalizeTime(appointment.time));
          const bookedEndMin = getMinutes(normalizeTime(appointment.end_time));

          return slotStartMin < bookedEndMin && slotEndMin > bookedStartMin;
        });

        return { ...slot, isUnavailable: isBlocked || isBooked };
      });

      setAvailableSlots(finalSlots);
    } catch (error) {
      console.error("❌ Error fetching availability:", error);
      setAvailableSlots([]);
    }
  }, [apiUrl, selectedDate, selectedAppointmentType]);

  useEffect(() => {
    if (selectedDate && selectedAppointmentType) {
      fetchAvailability();
    }
  }, [selectedDate, selectedAppointmentType, fetchAvailability]);

  const formatTime = (time) => {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(hours, minutes);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const bookAppointment = async (slot) => {
    if (!clientName || !clientEmail || !clientPhone || !selectedAppointmentType) {
      alert("Please fill out all fields before booking.");
      return;
    }

    setIsBooking(true);

    // Build the payload we want everywhere (server redirect + success page)
    const isCourse = selectedAppointmentType.toLowerCase().includes("course");

    const appointmentData = {
      title: selectedAppointmentType,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      // For non-course single sessions, include the chosen date/time
      date: !isCourse ? selectedDate.toISOString().split("T")[0] : "",
      time: !isCourse && slot ? slot.start_time : "",
      end_time: !isCourse && slot ? slot.end_time : "",
      description: `Client booked a ${selectedAppointmentType} appointment`,
      payment_method: "Square",
      addons: selectedAddons,
      guestCount,
      classCount,
      price, // let success page display "Amount recorded"
      // For courses, optionally pass a cycle start (e.g., next Monday) via URL param
      ...(isCourse && cycleStartParam ? { cycleStart: cycleStartParam } : {}),
    };

    // Save to localStorage so success page has a fallback
    localStorage.setItem("pendingAppointment", JSON.stringify(appointmentData));

    // No-payment path for applications: send details in URL so success page can finalize even if localStorage is empty
    if (isStartApplication) {
      const params = new URLSearchParams({
        email: clientEmail,
        title: appointmentData.title,
        date: appointmentData.date || "",
        time: appointmentData.time || "",
        end: appointmentData.end_time || "",
        amount: price,   // NEW: ensure success page sees gross charged total

      });
      window.location.href = `/rb/client-scheduling-success?${params.toString()}`;
      setIsBooking(false);
      return;
    }

    // 🔴 PAID FLOW (Mix N Sip, Crafts, Class, and also Course purchases)
    try {
      // ✅ IMPORTANT: send appointmentData + itemName so backend can embed details & paymentLinkId into redirect URL
      const paymentResponse = await axios.post(`${apiUrl}/api/create-payment-link`, {
        email: clientEmail,
        amount: price,
        itemName: selectedAppointmentType,
        appointmentData, // <-- REQUIRED for your backend
      });

      const paymentUrl =
        paymentResponse?.data?.paymentLinkUrl || paymentResponse?.data?.url;

      if (paymentUrl) {
        setTimeout(() => {
          window.location.href = paymentUrl;
        }, 100);
      } else {
        alert("❌ Failed to get payment link. Please try again.");
      }
    } catch (err) {
      console.error("❌ Error creating payment link:", err);
      alert("There was an issue starting checkout. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="client-scheduling">
      <h2>Schedule an Appointment</h2>

      <label>Client Name:</label>
      <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} />

      <label>Client Email:</label>
      <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />

      <label>Client Phone Number:</label>
      <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />

      <label>Select Appointment Type:</label>
      <select
        value={selectedAppointmentType}
        onChange={(e) => setSelectedAppointmentType(e.target.value)}
        disabled={disableTypeSelect}
      >
        <option value="">Select Appointment Type</option>
        {isStartApplication ? (
          <>
            <option value="Auditions for Bartender (1 hour 30 minutes)">Auditions for Bartender (1 hour 30 minutes)</option>
            <option value="Interview for Server Roles (45 minutes)">Interview for Server Roles (45 minutes)</option>
          </>
        ) : (
          appointmentTypes.map((appt) => (
            <option key={appt.title} value={appt.title}>
              {appt.title}
            </option>
          ))
        )}
      </select>

      {/* For non-course single-session bookings, user picks a date/time */}
      {!selectedAppointmentType.toLowerCase().includes("course") && (
        <>
          <label>Select Date:</label>
          <Calendar onChange={setSelectedDate} value={selectedDate} />

          <h3>Available Slots</h3>
          <ul>
            {availableSlots.length === 0 ? (
              <p>❌ No available slots for this date.</p>
            ) : (
              availableSlots.map((slot) => (
                <li
                  key={`${slot.start_time}-${slot.end_time}`}
                  className="available-slot"
                  style={{
                    opacity: slot.isUnavailable ? 0.5 : 1,
                    pointerEvents: slot.isUnavailable ? "none" : "auto",
                    marginBottom: "10px",
                  }}
                >
                  {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                  <button
                    onClick={() => bookAppointment(slot)}
                    disabled={slot.isUnavailable || isBooking}
                    style={{
                      backgroundColor: slot.isUnavailable ? "gray" : "#8B0000",
                      color: "white",
                      padding: "8px 16px",
                      borderRadius: "5px",
                      border: "none",
                      marginLeft: "10px",
                      cursor: slot.isUnavailable ? "not-allowed" : "pointer",
                      fontWeight: "bold",
                    }}
                  >
                    {slot.isUnavailable ? "Unavailable" : isBooking ? "Booking..." : "Book"}
                  </button>
                </li>
              ))
            )}
          </ul>
        </>
      )}

      {/* For Course purchases, no slot picking — just a single Pay button */}
      {selectedAppointmentType.toLowerCase().includes("course") && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={() => bookAppointment(null)}
            disabled={isBooking}
            style={{
              backgroundColor: "#8B0000",
              color: "white",
              padding: "10px 18px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {isBooking ? "Starting Checkout..." : "Pay & Enroll"}
          </button>
          {cycleStartParam && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>
              Cycle start: {cycleStartParam} (passed to success page)
            </div>
          )}
        </div>
      )}

      {isBooking && (
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default ClientSchedulingPage;
