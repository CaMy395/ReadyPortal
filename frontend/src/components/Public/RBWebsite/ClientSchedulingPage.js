import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom"; // ✅ Read URL parameters
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import appointmentTypes from "../../../data/appointmentTypes.json";

const ClientSchedulingPage = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const [searchParams] = useSearchParams(); // ✅ Get client details from URL

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedAppointmentType, setSelectedAppointmentType] = useState("");
    const [availableSlots, setAvailableSlots] = useState([]);
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientPhone, setClientPhone] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("Square"); // ✅ Default payment method

    /** ✅ Load Client Info from URL on First Load **/
    useEffect(() => {
        const name = searchParams.get("name");
        const email = searchParams.get("email");
        const phone = searchParams.get("phone");
        const payment = searchParams.get("paymentMethod");

        if (name) setClientName(name);
        if (email) setClientEmail(email);
        if (phone) setClientPhone(phone);
        if (payment) setPaymentMethod(payment);
    }, [searchParams]);

    /** ✅ Fetch Available Slots (Considering Blocked & Booked Times) **/
    const fetchAvailability = useCallback(async () => {
        if (!selectedDate || !selectedAppointmentType) return;

        const formattedDate = selectedDate.toISOString().split("T")[0];
        const appointmentWeekday = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).trim();

        try {
            // ✅ Fetch all available slots for the selected weekday & appointment type
            const response = await axios.get(`${apiUrl}/availability`, {
                params: { weekday: appointmentWeekday, appointmentType: selectedAppointmentType }
            });

            console.log("📅 Available Slots Before Filtering:", response.data);

            // ✅ Fetch booked times
            const bookedAppointmentsRes = await axios.get(`${apiUrl}/appointments/by-date`, { params: { date: formattedDate } });
            const bookedTimes = bookedAppointmentsRes.data.map(appt => appt.time);
            console.log("🚫 Booked Times:", bookedTimes);

            // ✅ Fetch blocked times (manually blocked schedule slots)
            const blockedTimesRes = await axios.get(`${apiUrl}/api/schedule/block`, { params: { date: formattedDate } });
            const blockedTimes = blockedTimesRes.data.blockedTimes || [];
            console.log("⛔ Blocked Times:", blockedTimes);

            // ✅ Filter out booked and blocked slots
            const filteredSlots = response.data.filter(slot => 
                slot.weekday === appointmentWeekday &&
                !bookedTimes.includes(slot.start_time) &&
                !blockedTimes.includes(slot.start_time)
            );

            console.log("✅ Available Slots After Filtering:", filteredSlots);
            setAvailableSlots(filteredSlots.length > 0 ? filteredSlots : []);
        } catch (error) {
            console.error("❌ Error fetching availability:", error);
            setAvailableSlots([]);
        }
    }, [apiUrl, selectedDate, selectedAppointmentType]);

    /** ✅ Fetch Slots Whenever Date or Type Changes **/
    useEffect(() => {
        if (selectedDate && selectedAppointmentType) {
            console.log("🔄 Fetching availability for:", selectedDate);
            fetchAvailability();
        }
    }, [selectedDate, selectedAppointmentType, fetchAvailability]);

    /** ✅ Format Time **/
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

    /** ✅ Handle Booking **/
    const bookAppointment = async (slot) => {
        if (!clientName || !clientEmail || !clientPhone || !selectedAppointmentType || !selectedDate) {
            alert("Please fill out all fields before booking.");
            return;
        }
    
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
                payment_method: paymentMethod, // ✅ Include selected payment method
            });
    
            if (response.status === 201) {
                const { paymentLink, paymentMethod } = response.data; // ✅ Extract data from response
                alert("Appointment booked successfully!");
    

                fetchAvailability(); // ✅ Refresh available slots
            }
        } catch (error) {
            console.error("❌ Error booking appointment:", error);
            alert("Failed to book appointment. Please try again.");
        }
    };
    

    return (
        <div className="client-scheduling">
            <h2>Schedule an Appointment</h2>

            <label>Client Name:</label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter your name" />

            <label>Client Email:</label>
            <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="Enter your email" />

            <label>Client Phone Number:</label>
            <input type="phone" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Enter your phone number" />

            <label>Select Payment Method:</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="Square">Square</option>
                <option value="Zelle">Zelle</option>
                <option value="CashApp">CashApp</option>
            </select>

            <label>Select Appointment Type:</label>
            <select value={selectedAppointmentType} onChange={(e) => setSelectedAppointmentType(e.target.value)}>
                <option value="">Select Appointment Type</option>
                {appointmentTypes.map((appt) => (
                    <option key={appt.title} value={appt.title}>{appt.title}</option>
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
                            <button onClick={() => bookAppointment(slot)}>Book</button>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default ClientSchedulingPage;
