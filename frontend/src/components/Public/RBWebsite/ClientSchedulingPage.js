import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import moment from 'moment-timezone';
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import appointmentTypes from "../../../data/appointmentTypes.json";

import { appointmentFlow, appointmentFlows, readBookingSlot, calendarPath } from '../../../appointmentFlow';

const toLocalDateKey = (date) => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0"),
].join("-");

const applicationAppointmentTypes = [
  { title: "Auditions for Bartender (1 hour 30 minutes, @ $0)" },
  { title: "Interview for Server Roles (45 minutes, @ $0)" },
];

const appointmentTypeAliases = {
  "Mix N' Sip – Private Experience": "Mix N' Sip (2 hours, @ $75.00)",
  "Crafts & Cocktails – Private Experience": "Crafts & Cocktails (2 hours, @ $85.00)",

  "Auditions for Bartender (1 hour 30 minutes, @ $0)":
    "Auditions for Bartender (1 hour 30 minutes)",

  "Interview for Server Roles (45 minutes, @ $0)":
    "Interview for Server Roles (45 minutes)",
};

const cleanAppointmentTitle = (title = "") => {
  return String(title)
    .replace(/\s*\([^)]*@\s*\$?[\d.]+\)/g, "")
    .replace(/\s*,?\s*@\s*\$?[\d.]+/g, "")
    .trim();
};

const getBackendAppointmentType = (selectedType = "") => {
  if (/^Mix N'? Sip.*(?:Private|Group|Virtual) Experience$/i.test(selectedType)) {
    return "Mix N' Sip (2 hours, @ $75.00)";
  }
  if (/^Crafts & Cocktails.*(?:Private|Group) Experience$/i.test(selectedType)) {
    return "Crafts & Cocktails (2 hours, @ $85.00)";
  }
  return appointmentTypeAliases[selectedType] || selectedType;
};

const ClientSchedulingPage = () => {
  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";
  const [searchParams] = useSearchParams();
  const navigate=useNavigate();
  const selectedBooking=readBookingSlot(searchParams);
  const availabilityRequest=useRef(0);
  const [availabilityLoading,setAvailabilityLoading]=useState(false);
  const [availabilityError,setAvailabilityError]=useState('');

  const [selectedDate, setSelectedDate] = useState(() => { const slot=readBookingSlot(searchParams); return slot ? new Date(slot.date+'T12:00:00') : new Date(); });
  const [selectedAppointmentType, setSelectedAppointmentType] = useState(() => searchParams.get("appointmentType") || "");
  const [availableSlots, setAvailableSlots] = useState([]);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [guestCount, setGuestCount] = useState(1);
  const [classCount, setClassCount] = useState(1);

  const [disableTypeSelect, setDisableTypeSelect] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [price, setPrice] = useState(0);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const [showSmsModal, setShowSmsModal] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);

  const isStartApplication = searchParams.get("startApplication") === "true";
  const flow=appointmentFlow(selectedAppointmentType);
  const calendarFirst=Boolean(flow && !isStartApplication && !searchParams.get('name'));
  const checkout=Boolean(flow && searchParams.get('checkout')==='1' && selectedBooking);
  const cycleStartParam = searchParams.get("cycleStart") || "";
  const setScheduleParam = searchParams.get("setSchedule") || "";
  const preferredTimeParam = searchParams.get("preferredTime") || "";
  const courseTrackParam =
    searchParams.get("courseTrack") ||
    preferredTimeParam ||
    "";
  const orderTotalParam = searchParams.get("orderTotal") || "";
  const depositOnlyParam = searchParams.get("depositOnly") === "1";
  const depositAmountParam = searchParams.get("depositAmount") || "";
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
      setSelectedAppointmentType("");
      setPrice(0);
      setDisableTypeSelect(false);
    } else if (type) {
      setSelectedAppointmentType(type.trim());
      setDisableTypeSelect(true);
    } else {
      setDisableTypeSelect(false);
    }
  }, [searchParams, isStartApplication]);

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
    } finally {
      if (!optIn) sessionStorage.setItem("smsModalDismissed", "1");
      setSmsLoading(false);
      setShowSmsModal(false);
    }
  };

  const fetchAvailability = useCallback(async () => {
    if (!selectedDate || !selectedAppointmentType) return;

    const requestId=++availabilityRequest.current;
    setAvailableSlots([]);setAvailabilityLoading(true);setAvailabilityError('');
    const formattedDate = toLocalDateKey(selectedDate);

    const appointmentWeekday = selectedDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .trim();

    const availabilityAppointmentType = getBackendAppointmentType(selectedAppointmentType);

    console.log("Sending to availability:", {
      weekday: appointmentWeekday,
      appointmentType: availabilityAppointmentType,
      date: formattedDate,
    });

    try {
      const response = await axios.get(`${apiUrl}/availability`, {
        params: {
          weekday: appointmentWeekday,
          appointmentType: availabilityAppointmentType,
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
        start_time:
          slot.start_time.length === 5 ? `${slot.start_time}:00` : slot.start_time,
        end_time:
          slot.end_time.length === 5 ? `${slot.end_time}:00` : slot.end_time,
      }));

      const normalizeTime = (time) =>
        time.length === 5 ? `${time}:00` : time;

      const getMinutes = (time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m;
      };

      const minimumDateTime = new Date(Date.now() + 12 * 60 * 60 * 1000);

const finalSlots = formattedAvailableSlots
  .map((slot) => {
    const slotStartMin = getMinutes(normalizeTime(slot.start_time));
    const slotEndMin = getMinutes(normalizeTime(slot.end_time));

    const isBlocked = blockedEntries.some((blocked) => {
      if (!blocked?.timeSlot) return false;

      const parts = blocked.timeSlot.split("-");
      const blockDate = parts.slice(0,3).join("-");
      const blockHour = parts[3];

      if (blockDate !== formattedDate) return false;

      const blockStartMin = getMinutes(normalizeTime(blockHour));
      const match = blocked.label?.match(/\((\d+(\.\d+)?)\s*hours?\)/i);
      const blockEndMin =
        blockStartMin + (match ? parseFloat(match[1]) * 60 : 60);

      return slotStartMin < blockEndMin && slotEndMin > blockStartMin;
    });

    const isBooked = bookedTimesRaw.some((appointment) => {
      if (appointment.date !== formattedDate) return false;

      const bookedStartMin = getMinutes(normalizeTime(appointment.time));
      const bookedEndMin = getMinutes(normalizeTime(appointment.end_time));

      return slotStartMin < bookedEndMin && slotEndMin > bookedStartMin;
    });

    return { ...slot, isUnavailable: isBlocked || isBooked };
  })
  .filter((slot) => {
    if (slot.isUnavailable) return false;

    const slotDateTime = moment.tz(`${formattedDate} ${normalizeTime(slot.start_time)}`, 'YYYY-MM-DD HH:mm:ss', 'America/New_York').toDate();

    return slotDateTime >= minimumDateTime;
  });

if(requestId===availabilityRequest.current) setAvailableSlots(finalSlots);

    } catch (error) {
      console.error("❌ Error fetching availability:", error);
      if(requestId===availabilityRequest.current) { setAvailableSlots([]);setAvailabilityError('We could not load availability. Please retry.'); }
    } finally { if(requestId===availabilityRequest.current) setAvailabilityLoading(false); }
  }, [apiUrl, selectedDate, selectedAppointmentType]);

  useEffect(() => {
    if (selectedDate && selectedAppointmentType) {
      fetchAvailability();
    }
  }, [selectedDate, selectedAppointmentType, fetchAvailability]);

  const formatTime = (time) => {
    if (!time) return "";

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
    if (calendarFirst) {
      const params=new URLSearchParams({bookingDate:toLocalDateKey(selectedDate),bookingTime:slot.start_time,bookingEndTime:slot.end_time});
      navigate(appointmentFlows[flow].path+'?'+params.toString());
      return;
    }
    if(checkout && !availableSlots.some(item=>item.start_time.slice(0,5)===slot.start_time.slice(0,5) && item.end_time.slice(0,5)===slot.end_time.slice(0,5))) {
      alert('This time is no longer available. Please choose another date or time.');return;
    }
    if (!clientName || !clientEmail || !clientPhone || !selectedAppointmentType) {
      alert("Please fill out all fields before booking.");
      return;
    }

    setIsBooking(true);

    const backendAppointmentType = getBackendAppointmentType(selectedAppointmentType);
    const isCourse = backendAppointmentType.toLowerCase().includes("course");

    const allTypes = isStartApplication
      ? applicationAppointmentTypes
      : appointmentTypes;

    const selectedTypeObj = allTypes.find(
      (appt) => appt.title === backendAppointmentType
    );

    const getPriceNumber = (value) => {
      if (value === null || value === undefined || value === "") return 0;
      return Number(String(value).replace("$", "").trim()) || 0;
    };

    const selectedTypePrice = getPriceNumber(selectedTypeObj?.price);
    const urlPrice = getPriceNumber(price);

    const requestedAmountDue = isStartApplication ? 0 : urlPrice || selectedTypePrice;
    const suppliedOrderTotal = getPriceNumber(orderTotalParam);
    const finalPrice = isStartApplication ? 0 : suppliedOrderTotal || requestedAmountDue;

    const selectedStart =
      !isCourse && slot
        ? moment.tz(`${toLocalDateKey(selectedDate)} ${slot.start_time}`, ['YYYY-MM-DD HH:mm:ss','YYYY-MM-DD HH:mm'], 'America/New_York').toDate()
        : null;
    const hoursUntilAppointment = selectedStart
      ? (selectedStart.getTime() - Date.now()) / (60 * 60 * 1000)
      : null;
    const requiresFullPayment =
      !isCourse &&
      hoursUntilAppointment !== null &&
      hoursUntilAppointment >= 0 &&
      hoursUntilAppointment <= 72;
    const amountDueNow = requiresFullPayment ? finalPrice : requestedAmountDue;

    const appointmentData = {
      calendarFirst: checkout,
      title: backendAppointmentType,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,

      date: isCourse
        ? cycleStartParam
        : toLocalDateKey(selectedDate),

      time: !isCourse && slot ? slot.start_time : "",
      end_time: !isCourse && slot ? slot.end_time : "",

      description: `Client booked a ${backendAppointmentType} appointment`,
      payment_method: finalPrice > 0 ? "Square" : "Free",
      addons: selectedAddons,
      guestCount,
      locationPreference: searchParams.get('locationPreference') || '',
      eventAddress: searchParams.get('eventAddress') || '',
      sessionMode: /virtual/i.test(selectedAppointmentType) ? 'virtual' : 'in_person',
      classCount,
      price: finalPrice,
      amount_due_now: amountDueNow,
      deposit_only: requiresFullPayment ? false : depositOnlyParam,
      deposit_amount: requiresFullPayment
        ? finalPrice
        : getPriceNumber(depositAmountParam) || amountDueNow,

      ...(isCourse
        ? {
            courseFlag: true,
            course: true,
            cycleStart: cycleStartParam,
            setSchedule: setScheduleParam,
            preferredTime: preferredTimeParam,
            courseTrack: courseTrackParam,
          }
        : {}),
    };

    try {
      if (isStartApplication) {
        const created = await axios.post(`${apiUrl}/appointments`, {
          ...appointmentData,
          price: 0,
          amount_paid: 0,
          paid: true,
          status: "confirmed",
          isAdmin: true,
        });

        setBookingSuccess({
          title: created.data?.appointment?.title || appointmentData.title,
          date: appointmentData.date,
          time: appointmentData.time,
        });

        return;
      }

      if (!amountDueNow || amountDueNow <= 0) {
        alert("Missing price for this booking. Please go back and select the service again.");
        return;
      }

if (isCourse) {
  localStorage.setItem(
    "pendingBartendingCourse",
    JSON.stringify(appointmentData)
  );
} else {
  localStorage.setItem(
    "pendingAppointment",
    JSON.stringify(appointmentData)
  );
}
      const paymentResponse = await axios.post(`${apiUrl}/api/create-payment-link`, {
        email: clientEmail,
        amount: amountDueNow,
        itemName: backendAppointmentType,
        appointmentData,
      });

      const paymentUrl =
        paymentResponse?.data?.paymentLinkUrl || paymentResponse?.data?.url;

      if (paymentUrl) {
        window.location.href = paymentUrl;
      } else {
        alert("❌ Failed to get payment link.");
      }
    } catch (err) {
      console.error("❌ Booking error:", err);
      console.error("Backend said:", err?.response?.data);
      alert(err?.response?.data?.error || "There was an issue completing this booking.");
    } finally {
      setIsBooking(false);
    }
  };

  if (bookingSuccess) {
    return (
      <div className="client-scheduling">
        <h2>✅ Appointment Booked!</h2>
        <p>Your appointment has been scheduled successfully.</p>
        <p>
          <strong>{bookingSuccess.title}</strong>
        </p>
        <p>
          {bookingSuccess.date} at {formatTime(bookingSuccess.time)}
        </p>
      </div>
    );
  }

  return (
    <div className="client-scheduling">
      <h2>{checkout ? "Review Your Appointment" : "Check Availability"}</h2>
      {calendarFirst && <p>Choose a date and available time before entering your details. All times are Eastern.</p>}
      {!(calendarFirst || checkout) && <>

      <label>Client Name:</label>
      <input
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
      />

      <label>Client Email:</label>
      <input
        value={clientEmail}
        onChange={(e) => setClientEmail(e.target.value)}
      />

      <label>Client Phone Number:</label>
      <input
        value={clientPhone}
        onChange={(e) => setClientPhone(e.target.value)}
      />

      </>}
      {!checkout && <>
      <label>Select Appointment Type:</label>
      <select
        value={selectedAppointmentType}
        onChange={(e) => {
          setSelectedAppointmentType(e.target.value);
          setAvailableSlots([]);
        }}
        disabled={disableTypeSelect}
      >
        <option value="">
          {isStartApplication
            ? "Select Audition or Interview"
            : "Select Appointment Type"}
        </option>

        {isStartApplication ? (
          applicationAppointmentTypes.map((appt) => (
            <option key={appt.title} value={appt.title}>
              {cleanAppointmentTitle(appt.title)}
            </option>
          ))
        ) : (
          <>
            {selectedAppointmentType && (
              <option value={selectedAppointmentType}>
                {cleanAppointmentTitle(selectedAppointmentType)}
              </option>
            )}

            {appointmentTypes
              .filter(
                (appt) =>
                  cleanAppointmentTitle(appt.title).toLowerCase() !==
                  cleanAppointmentTitle(selectedAppointmentType).toLowerCase()
              )
              .map((appt) => (
                <option key={appt.title} value={appt.title}>
                  {cleanAppointmentTitle(appt.title)}
                </option>
              ))}
          </>
        )}
      </select>

      {selectedAppointmentType &&
        !selectedAppointmentType.toLowerCase().includes("course") && (
          <>
            <label>Select Date:</label>
            <Calendar onChange={setSelectedDate} value={selectedDate} minDate={new Date()} />

            <h3>Available Slots</h3>

            <div className="available-slots">
              {!availabilityLoading && !availabilityError && availableSlots.length===0 && <p>No available times on this date. Please choose another date.</p>}
              {availableSlots.map((slot) => (
                <div
                  className="available-slot"
                  key={`${slot.start_time}-${slot.end_time}`}
                >
                  <span>
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </span>

                  <button
                    disabled={slot.isUnavailable || isBooking}
                    onClick={() => bookAppointment(slot)}
                  >
                    {slot.isUnavailable ? "Unavailable" : calendarFirst ? "Select time" : "Book"}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

      </>}
      {checkout && <div className="booking-selection">
        <h3>{cleanAppointmentTitle(selectedAppointmentType)}</h3>
        <p>{selectedBooking.date} · {formatTime(selectedBooking.start_time)}–{formatTime(selectedBooking.end_time)} Eastern</p>
        <p>{clientName} · {clientEmail}</p>
        <p>Order total: $ {Number(orderTotalParam || price).toFixed(2)}. Your payment choice and any full-payment requirement within 3 days are applied at checkout.</p>
        <p>This time is not reserved until your booking is confirmed.</p>
        <button disabled={isBooking || availabilityLoading || !availableSlots.some(slot=>slot.start_time.slice(0,5)===selectedBooking.start_time && slot.end_time.slice(0,5)===selectedBooking.end_time)} onClick={()=>bookAppointment(selectedBooking)}>{isBooking ? "Preparing payment…" : "Continue to Payment"}</button>
        <p><a href={calendarPath(flow)}>Choose another date or time</a></p>
      </div>}
      {availabilityLoading && <p role="status">Checking available times…</p>}
      {availabilityError && <p role="alert">{availabilityError} <button onClick={fetchAvailability}>Retry</button></p>}
      {checkout && !availabilityLoading && !availabilityError && !availableSlots.some(slot=>slot.start_time.slice(0,5)===selectedBooking.start_time && slot.end_time.slice(0,5)===selectedBooking.end_time) && <p role="alert">This time is no longer available. Please choose another date or time.</p>}
      {showSmsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Want text updates?</h3>

            <p style={{ fontSize: 14, lineHeight: 1.4 }}>
              Get updates, occasional offers, and upcoming event announcements by text.
              Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <button
                disabled={smsLoading}
                onClick={() => saveSmsConsent(false)}
              >
                No thanks
              </button>

              <button
                className="primary-btn"
                disabled={smsLoading}
                onClick={() => saveSmsConsent(true)}
              >
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
