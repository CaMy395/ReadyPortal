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

    useEffect(() => {
        axios.get(`${apiUrl}/gigs`)
            .then((res) => setGigs(res.data))
            .catch((err) => console.error(err));
        
            axios.get(`${apiUrl}/appointments`)
            .then((res) => {
                const processedAppointments = res.data.map((appointment) => {
                    const date = new Date(appointment.date).toISOString().split('T')[0]; // Convert date to YYYY-MM-DD
                    return { ...appointment, date }; // Add the date field
                });
                console.log("Processed Appointments:", processedAppointments);
                setAppointments(processedAppointments);
            })
        
        axios.get(`${apiUrl}/api/clients`)
            .then((res) => setClients(res.data))
            .catch((err) => console.error('Error fetching clients:', err));
    }, [apiUrl]);
    

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

        const appointmentData = {
            ...newAppointment,
            date: newAppointment.date,
            client_id: newAppointment.client,
            end_time: newAppointment.endTime,
        };

        if (editingAppointment) {
            // Update existing appointment
            axios.patch(`${apiUrl}/appointments/${editingAppointment.id}`, appointmentData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then((res) => {
                alert('Appointment updated successfully!');
                setAppointments((prev) =>
                    prev.map((appt) =>
                        appt.id === editingAppointment.id ? res.data : appt
                    )
                );
                setEditingAppointment(null);
                setNewAppointment({ title: '', client: '', date: '', time: '', endTime: '', description: '' });
            })
            .catch((err) => alert('Error updating appointment:', err));
        } else {

            // Add new appointment
            axios.post(`${apiUrl}/appointments`, appointmentData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            })
            .then((res) => {
                alert('Appointment added successfully!');
                setAppointments([...appointments, res.data]);
                setNewAppointment({ title: '', client: '', date: '', time: '', endTime: '', description: '' });
            })
            .catch((err) => alert('Error adding appointment:', err));
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
    
    
    const toggleBlockedTime = (day, hour) => {
        // Check for existing appointments at the specified day and hour
        const existingAppointments = appointments.filter((appointment) => {
            const normalizedDate = new Date(appointment.date).toISOString().split('T')[0];
            const [appointmentHour] = appointment.time.split(':').map(Number);
            return normalizedDate === day && appointmentHour === hour;
        });
    
        // Check for existing gigs at the specified day and hour
        const existingGigs = gigs.filter((gig) => {
            const normalizedDate = new Date(gig.date).toISOString().split('T')[0];
            const [gigHour] = gig.time.split(':').map(Number);
            return normalizedDate === day && gigHour === hour;
        });
    
        // Prevent blocking if there's an appointment or gig
        if (existingAppointments.length > 0 || existingGigs.length > 0) {
            //alert("You cannot block a time slot that already has an appointment or gig.");
            return;
        }
    
        const timeSlot = `${day}-${hour}`;
        setBlockedTimes((prevBlockedTimes) =>
            prevBlockedTimes.includes(timeSlot)
                ? prevBlockedTimes.filter((slot) => slot !== timeSlot)
                : [...prevBlockedTimes, timeSlot]
        );
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

        const hours = Array.from({ length: 14 }, (_, i) => i+10).concat(0); // Generate hours: 0 to 23
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
                                    
                                    
                                    const blocked = isBlocked(dayString, hour);

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
                                    {blocked && <div className="blocked-indicator">Blocked</div>}
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
            onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
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
