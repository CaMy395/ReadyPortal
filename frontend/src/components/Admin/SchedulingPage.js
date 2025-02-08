import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';
import '../../App.css';
import appointmentTypes from '../../data/appointmentTypes.json';

const SchedulingPage = () => {
    const [gigs, setGigs] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [clients, setClients] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [blockedTimes, setBlockedTimes] = useState([]);
    const [isWeekView, setIsWeekView] = useState(() => {
        // Check localStorage for the view preference, default to false (month view)
        return localStorage.getItem('isWeekView') === 'true';
    });

    const [newAppointment, setNewAppointment] = useState({
        title: '',
        client: '',
        date: '',
        time: '',
        endTime: '',
        description: '',
    });

    const [editingAppointment, setEditingAppointment] = useState(null);

    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    const fetchBlockedTimes = async () => {
        try {
            const response = await fetch(`${apiUrl}/api/schedule/block`);
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setBlockedTimes(data);
        } catch (error) {
            console.error('Error fetching blocked times:', error);
        }
    };

    const fetchGigs = async () => {
        try {
            console.log("🔄 Fetching gigs...");
            const response = await axios.get(`${apiUrl}/gigs`);
            console.log("✅ Gigs received from API:", response.data); // Debug log
            setGigs(response.data);
        } catch (error) {
            console.error("❌ Error fetching gigs:", error);
        }
    };

    const fetchAppointments = async () => {
        try {
            const response = await axios.get(`${apiUrl}/appointments`);
            const processedAppointments = response.data.map((appointment) => ({
                ...appointment,
                date: new Date(appointment.date).toISOString().split("T")[0] // Format to YYYY-MM-DD
            }));
            setAppointments(processedAppointments);
        } catch (error) {
            console.error("❌ Error fetching appointments:", error);
        }
    };

    const fetchClients = async () => {
        try {
            const response = await axios.get(`${apiUrl}/api/clients`);
            console.log("📥 Raw Clients API Response:", response.data); // ✅ Debug log
            if (Array.isArray(response.data)) {
                setClients(response.data);
                console.log("✅ Clients state updated:", response.data);
            } else {
                console.error("❌ Unexpected clients format:", response.data);
            }
        } catch (error) {
            console.error("❌ Error fetching clients:", error);
        }
    };
    

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Run all API calls in parallel using Promise.all
                const [gigsRes, appointmentsRes, clientsRes, blockedTimesRes] = await Promise.all([
                    axios.get(`${apiUrl}/gigs`),
                    axios.get(`${apiUrl}/appointments`),
                    axios.get(`${apiUrl}/api/clients`),
                    axios.get(`${apiUrl}/api/schedule/block`)
                ]);
                console.log("👥 Clients fetched:", clientsRes.data);
                // Update state for gigs
                setGigs(gigsRes.data);
    
                // Process appointments by formatting date
                const processedAppointments = appointmentsRes.data.map((appointment) => ({
                    ...appointment,
                    date: new Date(appointment.date).toISOString().split("T")[0] // Convert to YYYY-MM-DD
                }));
                setAppointments(processedAppointments);
    
                // Update state for clients
                setClients(clientsRes.data);
    
                // Update state for blocked times
                if (blockedTimesRes.data.blockedTimes) {
                    setBlockedTimes(blockedTimesRes.data.blockedTimes);
                }
    
            } catch (error) {
                console.error("❌ Error fetching data:", error);
            }
        };
    
        fetchData();
        fetchAppointments();
        fetchClients();
        fetchGigs();
    }, [apiUrl]); // Only runs when `apiUrl` changes
        

    const formatTime = (time) => {
        const [hours, minutes] = time.split(':');
        const date = new Date();
        date.setHours(hours, minutes);
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
        }).format(date);
    };

    const handleDateClick = (date) => setSelectedDate(date);

    const handleAddOrUpdateAppointment = (e) => {
        e.preventDefault();
        
        const clientId = parseInt(newAppointment.client, 10);
        const selectedClient = clients.find(c => c.id === clientId);
    
        if (!selectedClient) {
            alert("❌ Error: Selected client not found!");
            return;
        }
    
        const appointmentData = {
            title: newAppointment.title,
            client_id: clientId,  // ✅ Correct field name
            date: newAppointment.date,
            time: newAppointment.time,
            end_time: newAppointment.endTime,
            description: newAppointment.description,
        };
    
        console.log("📤 PATCH Request Data:", appointmentData); // ✅ Debug log
    
        if (editingAppointment) {
            // ✅ PATCH request for updates
            axios.patch(`${apiUrl}/appointments/${editingAppointment.id}`, appointmentData)
                .then((res) => {
                    alert('✅ Appointment updated successfully!');
                    setAppointments((prev) =>
                        prev.map((appt) => (appt.id === editingAppointment.id ? res.data : appt))
                    );
                    setEditingAppointment(null);
                    setNewAppointment({ title: '', client: '', date: '', time: '', endTime: '', description: '' });
                })
                .catch((err) => {
                    console.error("❌ Error updating appointment:", err);
                    alert('Error updating appointment.');
                });
        } else {
            // ✅ POST request for new appointments
            axios.post(`${apiUrl}/appointments`, appointmentData)
                .then((res) => {
                    alert('✅ Appointment added successfully!');
                    setAppointments([...appointments, res.data]);
                    setNewAppointment({ title: '', client: '', date: '', time: '', endTime: '', description: '' });
                })
                .catch((err) => {
                    console.error("❌ Error adding appointment:", err);
                    alert('Error adding appointment.');
                });
        }
    };
    

    const handleEditAppointment = (appointment) => {
        setEditingAppointment(appointment);
        setNewAppointment({
            title: appointment.title,
            client: appointment.client_id,
            date:  new Date(appointment.date).toISOString().split('T')[0], // Format to YYYY-MM-DD
            time: appointment.time,
            endTime: appointment.end_time,
            description: appointment.description,
        });
    };

    const handleDeleteAppointment = (appointmentId) => {
        if (window.confirm('Are you sure you want to delete this appointment?')) {
            axios.delete(`${apiUrl}/appointments/${appointmentId}`, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then(() => {
                alert('Appointment deleted successfully!');
                setAppointments((prev) =>
                    prev.filter((appt) => appt.id !== appointmentId)
                );
            })
            .catch((err) => alert('Error deleting appointment:', err));
        }
    };

    const getTileContent = ({ date }) => {
        const formatDate = (d) => new Date(d).toISOString().split('T')[0];
        const calendarDate = formatDate(date);

        const gigsOnDate = gigs.filter((gig) => formatDate(gig.date) === calendarDate);
        const appointmentsOnDate = appointments.filter((appointment) => formatDate(appointment.date) === calendarDate);

        return (
            <div>
                {gigsOnDate.length > 0 && (
                    <span style={{ color: 'blue' }}>{gigsOnDate.length} Gig(s)</span>
                )}
                {appointmentsOnDate.length > 0 && (
                    <span style={{ color: 'purple' }}>{appointmentsOnDate.length} Appointment(s)</span>
                )}
            </div>
        );
    };

    const toggleView = () => {
        setIsWeekView((prevView) => {
            const newView = !prevView;
            localStorage.setItem('isWeekView', newView); // Save to localStorage
            return newView;
        });
    };

    const togglePaidStatus = async (type, id, newPaidStatus) => {
        const endpoint = type === 'appointment' ? `${apiUrl}/appointments/${id}/paid` : `${apiUrl}/gigs/${id}/paid`;
    
        try {
            let price = 0;
            let description = '';
    
            if (type === 'appointment') {
                const appointment = appointments.find((appt) => appt.id === id);
                price = parseFloat(appointment.price || 0); // Extract price from appointment
                description = `Appointment: ${appointment.title}`;
            } else if (type === 'gig') {
                const gig = gigs.find((gig) => gig.id === id);
                price = parseFloat(gig.price || 0); // Extract price from gig
                description = `Gig: ${gig.event_type} with ${gig.client}`;
            }
    
            // Update the paid status in the backend
            await axios.patch(endpoint, { paid: newPaidStatus });
    
            // Update local state
            if (type === 'appointment') {
                setAppointments((prevAppointments) =>
                    prevAppointments.map((appt) =>
                        appt.id === id ? { ...appt, paid: newPaidStatus } : appt
                    )
                );
            } else if (type === 'gig') {
                setGigs((prevGigs) =>
                    prevGigs.map((gig) => (gig.id === id ? { ...gig, paid: newPaidStatus } : gig))
                );
            }
    
            // Update the profits table
            if (newPaidStatus) {
                // Add to profits
                await axios.post(`${apiUrl}/profits`, {
                    category: 'Income',
                    description,
                    amount: price,
                    type: type === 'appointment' ? 'Appointment' : 'Gig',
                });
            } else {
                // Remove from profits
                await axios.delete(`${apiUrl}/profits`, { data: { description } });
            }
        } catch (error) {
            // Only log the error if you want to debug further; otherwise, suppress it
            if (process.env.NODE_ENV === 'development') {
                console.error('Error updating paid status:', error);
            }
        }
    };
    
    const toggleBlockedTime = async (day, startHour) => {
        let updatedBlockedTimes = [...blockedTimes];
    
        const existingIndex = blockedTimes.findIndex(slot => slot.timeSlot === `${day}-${startHour}`);
    
        if (existingIndex !== -1) {
            // If already blocked, remove it
            updatedBlockedTimes.splice(existingIndex, 1);
        } else {
            // Ask user for duration
            const duration = parseInt(prompt("Enter duration in hours (e.g., 2 for 2 hours):"), 10);
            if (!duration || duration <= 0) return;
    
            // Ask user for reason
            const label = prompt("Enter a reason for blocking this time:");
            if (!label) return;
    
            // Generate all time slots based on duration
            const newBlockedTimes = [];
            for (let i = 0; i < duration; i++) {
                const timeSlot = `${day}-${parseInt(startHour, 10) + i}`;
                if (!updatedBlockedTimes.some(slot => slot.timeSlot === timeSlot)) {
                    newBlockedTimes.push({ timeSlot, label });
                }
            }
    
            // Add new blocked times to state
            updatedBlockedTimes.push(...newBlockedTimes);
        }
    
        setBlockedTimes(updatedBlockedTimes);
    
        console.log("📤 Sending blockedTimes to backend:", updatedBlockedTimes);
    
        try {
            await axios.post(`${apiUrl}/api/schedule/block`, { blockedTimes: updatedBlockedTimes });
        } catch (error) {
            console.error("❌ Error updating blocked times:", error);
        }
    };   

    const isBlocked = (day, hour) => {
        const timeSlot = `${day}-${hour}`;
        return blockedTimes.includes(timeSlot);
    };
    
    const goToPreviousWeek = () => {
        setSelectedDate((prevDate) => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() - 7); // Move back 7 days
            return newDate;
        });
    };
    
    const goToNextWeek = () => {
        setSelectedDate((prevDate) => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + 7); // Move forward 7 days
            return newDate;
        });
    };
    
    const weekView = () => {
        console.log("Appointments:", appointments); // Log the full appointments array
        console.log("Gigs Data:", gigs);

        const startOfWeek = new Date(selectedDate);
        startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay()); // Start on Sunday
        startOfWeek.setHours(0, 0, 0, 0); // Ensure time is midnight

        const hours = Array.from({ length: 15 }, (_, i) => i+9).concat(0); // Generate hours: 0 to 23
        const weekDates = Array.from({ length: 7 }, (_, i) => {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            return day;
        });
    
        const formatHour = (hour) => {
            const period = hour < 12 ? 'AM' : 'PM';
            const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
            return `${formattedHour}:00 ${period}`;
        };
    
        const now = new Date();
        const currentDay = now.toLocaleDateString('en-CA'); // Outputs YYYY-MM-DD in local timezone
        const currentHour = now.getHours(); // Current hour (0–23)
        const currentMinutes = now.getMinutes(); // Current minutes (0–59)
    
        return (
            <div className="week-view">
                <div className="week-navigation">
                    <button onClick={goToPreviousWeek}>&lt; Previous Week</button>
                    <h3>{`Week of ${weekDates[0].toDateString()} - ${weekDates[6].toDateString()}`}</h3>
                    <button onClick={goToNextWeek}>Next Week &gt;</button>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            {weekDates.map((date, i) => (
                                <th key={i}onClick={() => setSelectedDate(date)} // Update selectedDate on click
                                style={{ cursor: 'pointer', textAlign: 'center' }} // Add pointer cursor for clarity
                            >
                                <div style={{ textAlign: 'center' }}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                    <br />
                                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </div>
                            </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {hours.map((hour) => (
                            <tr key={hour}>
                                <td>{formatHour(hour)}</td>
                                {weekDates.map((date, dayIndex) => {
                                    const dayString = date.toISOString().split('T')[0];
    
                                    // Filter appointments for this hour
                                    const appointmentsAtTime = appointments.filter((appointment) => {
                                        const normalizedDate = new Date(appointment.date).toISOString().split('T')[0];
                                        const [appointmentHour] = appointment.time.split(':').map(Number);
                                        return (
                                            normalizedDate === dayString &&
                                            appointmentHour === hour &&
                                            !isBlocked(dayString, hour) // Exclude blocked times
                                        );
                                    });
    
                                    // Filter gigs for this hour
                                    const gigsAtTime = gigs.filter((gig) => {
                                        const normalizedDate = new Date(gig.date).toISOString().split('T')[0];
                                        const [gigHour] = gig.time.split(':').map(Number);
                                        return normalizedDate === dayString && gigHour === hour;
                                    });
                                    
                                    
                                    const blocked = blockedTimes.find(b => b.timeSlot === `${dayString}-${hour}`);

                                    return (
                                        <td
                                            key={dayIndex}
                                            style={{
                                                position: 'relative',
                                                height: '40px',
                                                backgroundColor: blocked ? '#d3d3d3' : 'inherit',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => toggleBlockedTime(dayString, hour)} // Toggle block on click
                                        >
                                            {/* Render the red line for the current time */}
                                            {currentDay === dayString && currentHour === hour && (
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        top: `${(currentMinutes / 60) * 100}%`,
                                                        left: 0,
                                                        right: 0,
                                                        height: '2px',
                                                        backgroundColor: 'red',
                                                        zIndex: 10,
                                                    }}
                                                />
                                            )}
                                            <div>
                                        {/* Render appointments */}
                                        {appointmentsAtTime.map((appointment, index) => {
                                        const startTime = new Date(`${appointment.date}T${appointment.time}`);
                                        const endTime = new Date(`${appointment.date}T${appointment.end_time}`);
                                        const durationInMinutes = (endTime - startTime) / (1000 * 60); // Duration in minutes
                                        //const startHour = startTime.getHours();
                                        const startMinutes = startTime.getMinutes();
                                        const topPercentage = (startMinutes / 60) * 100; // Calculate top offset

                                        return (
                                            <div
                                                key={appointment.id}
                                                className={`event appointment ${index > 0 ? 'overlapping' : ''}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: `${topPercentage}%`,
                                                    height: `${(durationInMinutes / 60) * 100}%`, // Height as a percentage
                                                    padding: '2px',
                                                }}
                                            >
                                                {clients.find((c) => c.id === appointment.client_id)?.full_name || 'Unknown'} -{' '}
                                                {appointment.title}
                                                <div>
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={appointment.paid}
                                                            onChange={() => togglePaidStatus('appointment', appointment.id, !appointment.paid)}
                                                        />
                                                        Completed
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {gigsAtTime.map((gig, index) => {
                                        const startTime = new Date(`${gig.date}T${gig.time}`);
                                        const durationInMinutes = (gig.duration || 1) * 60; // Duration in minutes (default to 1 hour)
                                        //const startHour = startTime.getHours();
                                        const startMinutes = startTime.getMinutes();
                                        const topPercentage = (startMinutes / 60) * 100; // Calculate top offset

                                        return (
                                            <div
                                                key={gig.id}
                                                className={`event gig ${index > 0 ? 'overlapping' : ''}`}
                                                style={{
                                                    position: 'absolute',
                                                    top: `${topPercentage}%`,
                                                    height: `${(durationInMinutes / 60) * 100}%`,
                                                    padding: '2px',
                                                }}
                                            >
                                                {gig.client} - {gig.event_type}
                                                <div>
                                                    <label>
                                                        <input
                                                            type="checkbox"
                                                            checked={gig.paid}
                                                            onChange={() => togglePaidStatus('gig', gig.id, !gig.paid)}
                                                        />
                                                        Paid
                                                    </label>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    </div>
                                    {blocked && (<div className="blocked-indicator">Blocked: {blocked.label || "No reason provided"}</div>)}
                                </td>
                            );
                        })}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
    };
    console.log("👥 Clients in Dropdown:", clients);

    return (
        <div>
            <h2>Scheduling Page</h2>
            <button onClick={toggleView}>
            {isWeekView ? 'Switch to Month View' : 'Switch to Week View'}
        </button>
        {isWeekView ? weekView() : (
            <Calendar
                onClickDay={handleDateClick}
                tileContent={getTileContent}
                value={selectedDate}
            />
            )}
            <h3>Selected Date: {selectedDate.toDateString()}</h3>
            <div className="gig-container">
                {gigs
                    .filter((gig) => {
                        const formatDate = (d) => new Date(d).toISOString().split('T')[0];
                        return formatDate(gig.date) === selectedDate.toISOString().split('T')[0];
                    })
                    .map((gig) => (
                        <div key={gig.id} className="gig-card">
                            <strong>Client:</strong> {gig.client} <br />
                            <strong>Event:</strong> {gig.event_type} <br />
                            <strong>Time:</strong> {formatTime(gig.time)} <br />
                            <strong>Location:</strong> {gig.location}
                        </div>
                    ))}
                </div>
                <div className="appointment-container">
                    {appointments
                        .filter((appointment) => {
                            const formatDate = (d) => new Date(d).toISOString().split('T')[0];
                            return formatDate(appointment.date) === selectedDate.toISOString().split('T')[0];
                        })
                        .map((appointment) => (
                            <div key={appointment.id} className="gig-card">
                                <strong>Title:</strong> {appointment.title} <br />
                                <strong>Client:</strong> {clients?.length > 0 && appointment.client_id 
                                ? clients.find(client => client.id === appointment.client_id)?.full_name || 'N/A' 
                                : 'N/A'} <br />

                                <strong>Time:</strong> {formatTime(appointment.time)} - {formatTime(appointment.end_time)} <br />
                                <strong>Description:</strong> {appointment.description} <br />
                                <br></br>
                                <button onClick={() => handleEditAppointment(appointment)}>Edit</button>
                                <button onClick={() => handleDeleteAppointment(appointment.id)}>Delete</button>
                            </div>
                        ))}
                </div>

                {/*Add Appointment*/}
                <h3>{editingAppointment ? 'Edit Appointment' : 'Add Appointment'}</h3>
                <form onSubmit={handleAddOrUpdateAppointment}>
                <label>
                    Title:
                    <select
                        value={newAppointment.title}
                        onChange={(e) => {
                            const selectedType = appointmentTypes.find((type) => type.title === e.target.value);
                            setNewAppointment({
                                ...newAppointment,
                                title: selectedType.title,
                                category: selectedType.category, // Include category in the state
                            });
                        }}
                        required
                    >
                        <option value="" disabled>Select an Appointment Type</option>
                        {appointmentTypes.map((type, index) => (
                            <option key={index} value={type.title}>
                                {type.title}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Client:
                    <select
                        value={newAppointment.client}
                        onChange={(e) => setNewAppointment({ ...newAppointment, client: e.target.value })}
                        required
                    >
                        <option value="" disabled>
                            Select a Client
                        </option>
                        {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                                {client.full_name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Date:
                    <input
                        type="date"
                        value={newAppointment.date || ''}
                        onChange={(e) => setNewAppointment({ ...newAppointment, date: e.target.value })}
                        required
                    />
                </label>
                <label>
                    Time:
                    <input
                        type="time"
                        value={newAppointment.time}
                        onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
                        required
                    />
                </label>
                <label>
                    End Time:
                    <input
                        type="time"
                        value={newAppointment.endTime}
                        onChange={(e) => setNewAppointment({ ...newAppointment, endTime: e.target.value })}
                    />
                </label>
                <label>
                    Description:
                    <textarea
                        value={newAppointment.description}
                        onChange={(e) => setNewAppointment({ ...newAppointment, description: e.target.value })}
                    />
                </label>
                <button type="submit">{editingAppointment ? 'Update Appointment' : 'Add Appointment'}</button>
                    {editingAppointment && (
                        <button
                            type="button"
                            onClick={() => {
                                setEditingAppointment(null);
                                setNewAppointment({
                                    title: '',
                                    client: '',
                                    date: '',
                                    time: '',
                                    endTime: '',
                                    description: '',
                                });
                            }}
                            style={{ marginLeft: '10px' }}
                        >
                            Cancel
                        </button>
                    )}
            </form>
        </div>
    );
};

export default SchedulingPage;
