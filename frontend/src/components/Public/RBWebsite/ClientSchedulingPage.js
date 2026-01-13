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
  const [price, setPrice] = useState(75);

  const isStartApplication = searchParams.get("startApplication") === "true";
  const cycleStartParam = searchParams.get("cycleStart") || "";

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

  // ----------------------------
  // SMS Opt-in modal
  // ----------------------------
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);

  // Pull query params into state
  useEffect(() => {
    const nameParam = searchParams.get("name");
    const emailParam = searchParams.get("email");
    const phoneParam = searchParams.get("phone");
    const guests = searchParams.get("guestCount") || 1;
    const classes = searchParams.get("classCount") || 1;
    const type = searchParams.get("appointmentType");
    const priceParam = searchParams.get("price");

    if (nameParam) setClientName(nameParam);
    if (emailParam) setClientEmail(emailParam);
    if (phoneParam) setClientPhone(phoneParam);

    if (guests) setGuestCount(parseInt(guests, 10));
    if (classes) setClassCount(parseInt(classes, 10));
    if (priceParam) setPrice(parseFloat(priceParam));

    if (isStartApplication) {
      setSelectedAppointmentType("Auditions for Bartender (1 hour 30 minutes)");
      setPrice(0);
      setDisableTypeSelect(true);
    } else if (type) {
      setSelectedAppointmentType(type);
    }
  }, [searchParams, isStartApplication]);

  // Check SMS consent AFTER we have email/phone
  useEffect(() => {
    const email = (clientEmail || "").trim().toLowerCase();
    const phone = (clientPhone || "").trim();
    if (!email && !phone) return;

    const run = async () => {
      try {
        const qs = new URLSearchParams();
        if (email) qs.set("email", email);
        else qs.set("phone", phone);

        const res = await fetch(`${apiUrl}/api/clients/sms-consent?${qs.toString()}`);
        if (!res.ok) return;

        const data = await res.json();

        const neverAnswered =
          data.found &&
          !data.smsOptInAt &&
          !data.smsOptOutAt;

        if (!data.found || neverAnswered) {
          setShowSmsModal(true);
        }
      } catch {}
    };

    run();
  }, [clientEmail, clientPhone, apiUrl]);

  const saveSmsConsent = async (optIn) => {
    const email = (clientEmail || "").trim().toLowerCase();
    const phone = (clientPhone || "").trim();

    setSmsLoading(true);
    try {
      await fetch(`${apiUrl}/api/clients/sms-consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone,
          smsOptIn: !!optIn,
          source: "client-scheduling",
        }),
      });
    } catch (e) {
      console.error("❌ Failed to save SMS consent:", e);
      // if save fails, don't block the booking flow
    } finally {
      // If they clicked "No thanks", avoid re-showing during this browser session
      if (!optIn) sessionStorage.setItem("smsModalDismissed", "1");
      setSmsLoading(false);
      setShowSmsModal(false);
    }
  };

  // ----------------------------
  // Availability
  // ----------------------------
  const fetchAvailability = useCallback(async () => {
    if (!selectedDate || !selectedAppointmentType) return;

    const formattedDate = selectedDate.toISOString().split("T")[0];
    const appointmentWeekday = selectedDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .trim();

    try {
      const response = await axios.get(`${apiUrl}/availability`, {
        params: {
          weekday: appointmentWeekday,
          appointmentType: selectedAppointmentType,
          date: formattedDate,
        },
      });

      const blockedTimesRes = await axios.get(`${apiUrl}/blocked-times`, {
        params: { date: formattedDate },
      });

      const bookedTimesRes = await axios.get(`${apiUrl}/appointments/by-date`, {
        params: { date: formattedDate },
      });

      const blockedEntries = blockedTimesRes.data.blockedTimes || [];
      const bookedTimesRaw = bookedTimesRes.data || [];

      const formattedAvailableSlots = (response.data || []).map((slot) => ({
        ...slot,
        start_time: slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time,
        end_time: slot.end_time.length === 5 ? `${slot.end_time}:00` : slot.end_time,
      }));

      const normalizeTime = (time) => (time.length === 5 ? `${time}:00` : time);
      const getMinutes = (time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
      };

      const finalSlots = formattedAvailableSlots.map((slot) => {
        const slotStartMin = getMinutes(normalizeTime(slot.start_time));
        const slotEndMin = getMinutes(normalizeTime(slot.end_time));

        const isBlocked = blockedEntries.some((blocked) => {
          if (!blocked?.timeSlot) return false;
          const parts = blocked.timeSlot.split("-");
          const blockDate = parts[0];
          const blockHour = parts[3];
          if (blockDate !== formattedDate) return false;

          const blockStartMin = getMinutes(normalizeTime(blockHour));
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
    if (selectedDate && selectedAppointmentType) fetchAvailability();
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

  // ----------------------------
  // Booking
  // ----------------------------
  const bookAppointment = async (slot) => {
    if (!clientName || !clientEmail || !clientPhone || !selectedAppointmentType) {
      alert("Please fill out all fields before booking.");
      return;
    }

    alert("⏳ Please do not close or navigate away until checkout completes.");
    setIsBooking(true);

    const isCourse = selectedAppointmentType.toLowerCase().includes("course");

    const appointmentData = {
      title: selectedAppointmentType,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      date: !isCourse ? selectedDate.toISOString().split("T")[0] : "",
      time: !isCourse && slot ? slot.start_time : "",
      end_time: !isCourse && slot ? slot.end_time : "",
      description: `Client booked a ${selectedAppointmentType} appointment`,
      payment_method: "Square",
      addons: selectedAddons,
      guestCount,
      classCount,
      price,
      ...(isCourse && cycleStartParam ? { cycleStart: cycleStartParam } : {}),
    };

    localStorage.setItem("pendingAppointment", JSON.stringify(appointmentData));

    try {
      const paymentResponse = await axios.post(`${apiUrl}/api/create-payment-link`, {
        email: clientEmail,
        amount: price,
        itemName: selectedAppointmentType,
        appointmentData,
      });

      const paymentUrl = paymentResponse?.data?.paymentLinkUrl || paymentResponse?.data?.url;

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        alert("❌ Failed to get payment link.");
      }
    } catch (err) {
      console.error("❌ Error creating payment link:", err);
      alert("There was an issue starting checkout.");
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="client-scheduling">
      <h2>Schedule an Appointment</h2>

      <label>Client Name:</label>
      <input value={clientName} onChange={(e) => setClientName(e.target.value)} />

      <label>Client Email:</label>
      <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />

      <label>Client Phone Number:</label>
      <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />

      <label>Select Appointment Type:</label>
      <select
        value={selectedAppointmentType}
        onChange={(e) => setSelectedAppointmentType(e.target.value)}
        disabled={disableTypeSelect}
      >
        <option value="">Select Appointment Type</option>
        {appointmentTypes.map((appt) => (
          <option key={appt.title} value={appt.title}>
            {appt.title}
          </option>
        ))}
      </select>

      {!selectedAppointmentType.toLowerCase().includes("course") && (
        <>
          <label>Select Date:</label>
          <Calendar onChange={setSelectedDate} value={selectedDate} />

          <h3>Available Slots</h3>

<div className="available-slots">
  {availableSlots.map((slot) => (
    <div className="available-slot" key={`${slot.start_time}-${slot.end_time}`}>
      <span>
        {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
      </span>

      <button
        disabled={slot.isUnavailable || isBooking}
        onClick={() => bookAppointment(slot)}
      >
        {slot.isUnavailable ? "Unavailable" : "Book"}
      </button>
    </div>
  ))}
</div>

        </>
      )}

      {showSmsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Want text updates?</h3>
            <p style={{ fontSize: 14, lineHeight: 1.4 }}>
              Get updates, occasional offers, and upcoming event announcements by text. Msg &amp; data rates may apply.
              Reply STOP to opt out, HELP for help.
            </p>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <button disabled={smsLoading} onClick={() => saveSmsConsent(false)}>
                No thanks
              </button>

              <button className="primary-btn" disabled={smsLoading} onClick={() => saveSmsConsent(true)}>
                Yes, text me
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientSchedulingPage;
