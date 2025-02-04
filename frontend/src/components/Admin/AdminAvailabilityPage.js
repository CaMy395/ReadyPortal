import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import appointmentTypes from "../../data/appointmentTypes.json";

const AdminAvailabilityPage = () => {
    const [weekday, setWeekday] = useState("");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [appointmentType, setAppointmentType] = useState("");
    const [availability, setAvailability] = useState([]);
    const [selectedWeekday, setSelectedWeekday] = useState("");  // Default to show all
    const [selectedAppointmentType, setSelectedAppointmentType] = useState("");

    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";


/** ✅ Fetch Availability (Handles "Show All" Case) **/
const fetchAvailability = useCallback(async () => {
    try {
        let url = `${apiUrl}/availability`;
        let params = {};

        // Only add filters if selected
        if (selectedWeekday !== "Show All Days") params.weekday = selectedWeekday;
        if (selectedAppointmentType !== "Show All Types") params.appointmentType = selectedAppointmentType;

        console.log("📥 Fetching availability from:", url, params);

        const response = await axios.get(url, { params });
        console.log("✅ Fetched Availability:", response.data);
        setAvailability(response.data);
    } catch (error) {
        console.error("❌ Error fetching availability:", error.response?.data || error.message);
    }
}, [apiUrl, selectedWeekday, selectedAppointmentType]);



    /** 🔄 Fetch All Availability When Page Loads **/
    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    /** ✅ Add Availability **/
    const addAvailability = async () => {
        if (!weekday || !startTime || !endTime || !appointmentType) {
            alert("Please fill out all fields.");
            return;
        }

        try {
            await axios.post(`${apiUrl}/availability`, {
                weekday,
                start_time: startTime,
                end_time: endTime,
                appointment_type: appointmentType
            });

            console.log("✅ Availability added successfully!");
            fetchAvailability(); // Refresh list
        } catch (error) {
            console.error("❌ Error adding availability:", error.response?.data || error.message);
        }
    };

    const formatTime = (time) => {
        if (!time) return "Invalid Time";
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(hours, minutes);
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        }).format(date);
    };

    return (
        <div className="admin-availability">
            <h2>Set Weekly Availability</h2>

            <label>Select: Weekday, start/end time, and Appt type:</label>
            <select value={weekday} onChange={(e) => setWeekday(e.target.value)}>
                <option value="">Select a Day</option>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <option key={day} value={day}>{day}</option>
                ))}
            </select>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            <select value={appointmentType} onChange={(e) => setAppointmentType(e.target.value)}>
                <option value="">Select Appointment Type</option>
                {appointmentTypes.map((appt) => (
                    <option key={appt.title} value={appt.title}>
                        {appt.title}
                    </option>
                ))}
            </select>


            <button onClick={addAvailability}>Add Availability</button>

            <h3>Filter Availability</h3>
            <select value={selectedWeekday} onChange={(e) => setSelectedWeekday(e.target.value)}>
    <option value="Show All Days">Show All Days</option>
    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
        <option key={day} value={day}>{day}</option>
    ))}
</select>

<select value={selectedAppointmentType} onChange={(e) => setSelectedAppointmentType(e.target.value)}>
    <option value="Show All Types">Show All Types</option>
    {appointmentTypes.map((appt) => (
        <option key={appt.title} value={appt.title}>{appt.title}</option>
    ))}
</select>


            <button onClick={fetchAvailability}>Search</button>

            <h3>Current Weekly Availability</h3>
            {availability.length === 0 ? (
                <p>No availability found.</p>
            ) : (
                <ul>
                    {availability.map((slot, index) => (
                        <li key={index}>
                            <strong>{slot.weekday}</strong> | {formatTime(slot.start_time)} - {formatTime(slot.end_time)} ({slot.appointment_type})
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default AdminAvailabilityPage;
