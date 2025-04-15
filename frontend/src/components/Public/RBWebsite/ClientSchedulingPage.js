import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import appointmentTypes from "../../../data/appointmentTypes.json";

const ClientSchedulingPage = () => {
  const navigate = useNavigate();
  const apiUrl = process.env.REACT_APP_API_URL;
  const [searchParams] = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedAppointmentType, setSelectedAppointmentType] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Zelle");
  const [guestCount, setGuestCount] = useState("");
  const [classCount, setClassCount] = useState("");
  const [disableTypeSelect, setDisableTypeSelect] = useState(false);
  const [isBooking, setIsBooking] = useState(false); // ✅ LOADING STATE

  const [selectedAddons] = useState(() => {
    const encodedAddons = searchParams.get("addons");
    if (encodedAddons) {
      try {
        return JSON.parse(atob(decodeURIComponent(encodedAddons))).map(addon => ({
          name: addon.name,
          price: addon.price,
          quantity: addon.quantity || 1
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
    const payment = searchParams.get("paymentMethod");
    const guestCount = searchParams.get("guestCount") || 1;
    const classCount = searchParams.get("classCount") || 1;
    const type = searchParams.get("appointmentType");

    if (name) setClientName(name);
    if (email) setClientEmail(email);
    if (phone) setClientPhone(phone);
    if (payment) setPaymentMethod(payment);
    if (guestCount) setGuestCount(guestCount);
    if (classCount) setClassCount(classCount);
    if (type) {
      setSelectedAppointmentType(type);
      setDisableTypeSelect(true);
    }
  }, [searchParams]);

  const fetchAvailability = useCallback(async () => {
    if (!selectedDate || !selectedAppointmentType) return;

    const formattedDate = selectedDate.toISOString().split("T")[0];
    const appointmentWeekday = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).trim();

    try {
      const response = await axios.get(`${apiUrl}/availability`, {
        params: { weekday: appointmentWeekday, appointmentType: selectedAppointmentType }
      });

      const blockedTimesRes = await axios.get(`${apiUrl}/blocked-times`, { params: { date: formattedDate } });
      const bookedTimesRes = await axios.get(`${apiUrl}/appointments/by-date`, { params: { date: formattedDate } });

      const blockedEntries = blockedTimesRes.data.blockedTimes;
      const bookedTimesRaw = bookedTimesRes.data;

      const formattedAvailableSlots = response.data.map(slot => ({
        ...slot,
        start_time: slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time,
        end_time: slot.end_time.length === 5 ? `${slot.end_time}:00` : slot.end_time
      }));

      const getMinutes = (time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
      };

      const filteredSlots = formattedAvailableSlots.filter(slot => {
        const slotStartMin = getMinutes(slot.start_time);
        const slotEndMin = getMinutes(slot.end_time);

        const isBlocked = blockedEntries.some(blocked => {
          if (!blocked?.timeSlot) return false;
          const [bDate, , , time] = blocked.timeSlot.split("-");
          if (bDate !== formattedDate) return false;

          const blockStartMin = getMinutes(time);
          const match = blocked.label?.match(/\((\d+(\.\d+)?)\s*hours?\)/i);
          const blockEndMin = blockStartMin + (match ? parseFloat(match[1]) * 60 : 60);

          return slotStartMin < blockEndMin && slotEndMin > blockStartMin;
        });

        const isBooked = bookedTimesRaw.some(appointment => {
          if (appointment.date !== formattedDate) return false;
          const bookedStartMin = getMinutes(appointment.time);
          const bookedEndMin = getMinutes(appointment.end_time);
          return slotStartMin < bookedEndMin && slotEndMin > bookedStartMin;
        });

        return !isBlocked && !isBooked;
      });

      setAvailableSlots(filteredSlots);
    } catch (error) {
      console.error("❌ Error fetching availability:", error);
      setAvailableSlots([]);
    }
  }, [apiUrl, selectedDate, selectedAppointmentType]);

  useEffect(() => {
    if (selectedDate && selectedAppointmentType) {
      fetchAvailability();
    }
  }, [selectedDate, selectedAppointmentType]);

  const formatTime = (time) => {
    const [hours, minutes] = time.split(":");
    const date = new Date();
    date.setHours(hours, minutes);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date);
  };

  const bookAppointment = async (slot) => {
    if (!clientName || !clientEmail || !clientPhone || !selectedAppointmentType || !selectedDate) {
      alert("Please fill out all fields before booking.");
      return;
    }

    setIsBooking(true); // ✅ START SPINNER

    const extractPriceFromTitle = (title) => {
      const match = title.match(/\$(\d+(\.\d{1,2})?)/);
      return match ? parseFloat(match[1]) : 0;
    };

    const basePrice = extractPriceFromTitle(selectedAppointmentType);
    const selectedType = appointmentTypes.find((type) => type.title === selectedAppointmentType);
    const category = selectedType ? selectedType.category : "General";

    try {
      const response = await axios.post(`${apiUrl}/appointments`, {
        title: selectedAppointmentType,
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone,
        date: selectedDate.toISOString().split("T")[0],
        time: slot.start_time,
        end_time: slot.end_time,
        description: `Client booked a ${selectedAppointmentType} appointment`,
        payment_method: paymentMethod,
        addons: selectedAddons,
        guestCount,
        classCount,
        category,
      });

      if (response.status === 201) {
        const { paymentLink } = response.data;

        const addonTotal = selectedAddons.reduce(
          (total, addon) => total + addon.price * addon.quantity, 0
        );

        const multiplier = guestCount > 1 ? guestCount : classCount > 1 ? classCount : 1;
        const multiplePrice = basePrice * multiplier;

        const encodedAddons = selectedAddons.length > 0
          ? encodeURIComponent(btoa(JSON.stringify(selectedAddons)))
          : "";

        if (paymentMethod === "Square" && paymentLink) {
          window.location.href = paymentLink;
        } else {
          navigate(`/rb/payment?price=${multiplePrice}&appointment_type=${encodeURIComponent(selectedAppointmentType)}&guestCount=${guestCount}&classCount=${classCount}&addons=${encodedAddons}`, {
            state: { addons: selectedAddons, addonTotal, guestCount, classCount }
          });
        }
      }
    } catch (error) {
      console.error("❌ Error booking appointment:", error);
      alert("Failed to book appointment. Please try again.");
    } finally {
      setIsBooking(false); // ✅ STOP SPINNER
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

      <label>Select Payment Method:</label>
      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
        <option value="Zelle">Zelle</option>
        <option value="CashApp">CashApp</option>
        <option value="Square">Square</option>
      </select>

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

      <label>Select Date:</label>
      <Calendar onChange={setSelectedDate} value={selectedDate} onClickDay={() => fetchAvailability()} />

      <h3>Available Slots</h3>
      <ul>
        {availableSlots.length === 0 ? (
          <p>❌ No available slots for this date.</p>
        ) : (
          availableSlots.map(slot => (
            <li key={slot.id} className="available-slot">
              {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
              <button
                onClick={() => bookAppointment(slot)}
                disabled={isBooking}
              >
                {isBooking ? "Booking..." : "Book"}
              </button>
            </li>
          ))
        )}
      </ul>

      {isBooking && (
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      )}
    </div>
  );
};

export default ClientSchedulingPage;
