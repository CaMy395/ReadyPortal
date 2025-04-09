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
    const [recurringDays, setRecurringDays] = useState([]);
    const [recurrenceWeeks, setRecurrenceWeeks] = useState(1);

    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockDate, setBlockDate] = useState('');
    const [blockStartTime, setBlockStartTime] = useState('');
    const [blockDuration, setBlockDuration] = useState(1);
    const [blockLabel, setBlockLabel] = useState('');
    

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
            const response = await axios.get(`${apiUrl}/api/schedule/block`);
    
            console.log("📥 RAW Blocked Times Response:", JSON.stringify(response.data, null, 2));
    
            if (response.data.blockedTimes && response.data.blockedTimes.length > 0) {
                const updatedBlockedTimes = response.data.blockedTimes.map(({ timeSlot, label, date }) => ({
                    timeSlot: timeSlot.trim(),
                    label: label ? label.trim() : "Blocked",
                    date: new Date(date).toISOString().split('T')[0] // ✅ Ensure date is in YYYY-MM-DD format
                }));
                
                console.log("✅ Updated Blocked Times in State:", updatedBlockedTimes);
                setBlockedTimes(updatedBlockedTimes);
            }
        } catch (error) {
            console.error("❌ Error fetching blocked times:", error);
        }
    };
    
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [gigsRes, appointmentsRes, clientsRes] = await Promise.all([
                    axios.get(`${apiUrl}/gigs`),
                    axios.get(`${apiUrl}/appointments`),
                    axios.get(`${apiUrl}/api/clients`)
                ]);
    
                console.log("👥 Clients fetched:", clientsRes.data);
                setGigs(gigsRes.data);
    
                const processedAppointments = appointmentsRes.data.map((appointment) => ({
                    ...appointment,
                    date: new Date(appointment.date).toISOString().split("T")[0] 
                }));
                setAppointments(processedAppointments);
                setClients(clientsRes.data);
    
                // ✅ Fetch blocked times for the selected date
                fetchBlockedTimes();
    
            } catch (error) {
                console.error("❌ Error fetching data:", error);
            }
        };
    
        fetchData();
    }, [apiUrl]); // ✅ Now runs every time `selectedDate` changes
    

    const formatTime = (time) => {
        // Ensure time is always in HH format (e.g., "7" → "07:00", "19" → "19:00")
        let formattedTime = time.length === 1 ? `0${time}:00` : `${time}:00`;
    
        // Create a Date object for formatting
        const date = new Date();
        const [hours, minutes] = formattedTime.split(':');
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
        const selectedClient = clients.find(c => c.id === clientId) || {}; // ✅ Ensures `selectedClient` is always an object

    
        if (!selectedClient) {
            alert("❌ Error: Selected client not found!");
            return;
        }
    

        const appointmentData = {
            title: newAppointment.title,
            client_id: clientId,
            client_name: selectedClient ? selectedClient.full_name : "Unknown",  // ✅ Ensure client_name is included
            client_email: selectedClient ? selectedClient.email : "Unknown",    // ✅ Ensure client_email is included
            date: newAppointment.date,
            time: newAppointment.time,
            end_time: newAppointment.endTime,
            description: newAppointment.description,
            isAdmin: true,
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
    
    const generateRecurringBlockedTimes = () => {
      const blocked = [];
      const [startHour, startMinute] = blockStartTime.split(":").map(Number);
      const startDate = new Date(blockDate);
    
      for (let week = 0; week < recurrenceWeeks; week++) {
        recurringDays.forEach((dayIndex) => {
          const date = new Date(startDate);
          
          // Get start of week (Sunday), then move to desired day
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay()); // Go to Sunday
          startOfWeek.setHours(0, 0, 0, 0);
    
          const current = new Date(startOfWeek);
          current.setDate(startOfWeek.getDate() + dayIndex + (week * 7)); // Add dayIndex + 7 days per week
    
          const isoDate = current.toISOString().split('T')[0];
          const startTime = `${startHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`;
    
          blocked.push({
            timeSlot: `${isoDate}-${startTime}`,
            label: `${blockLabel} (${blockDuration} hours)`,
            date: isoDate,
            duration: blockDuration,
          });
        });
      }
    
      return blocked;
    };
    
    
      

const handleBlockTime = async () => {
  if (!blockDate || !blockStartTime || !blockDuration || !blockLabel || recurringDays.length === 0) {
    alert("⚠️ Please fill in all fields and select at least one day.");
    return;
  }

  const blockedTimesArray = generateRecurringBlockedTimes();

  try {
    const response = await axios.post(`${apiUrl}/api/schedule/block`, { blockedTimes: blockedTimesArray });
    if (response.data.success) {
      setBlockedTimes((prev) => [...prev, ...blockedTimesArray]);
    }
    setShowBlockModal(false);
    setBlockDate('');
    setBlockStartTime('');
    setBlockDuration(1);
    setBlockLabel('');
    setRecurringDays([]);
    setRecurrenceWeeks(1);
  } catch (error) {
    console.error("❌ Error posting blocked times:", error);
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

    const handleDeleteBlockedTime = async (blocked) => {
        if (window.confirm(`Are you sure you want to remove the blocked time at ${formatTime(blocked.timeSlot.split('-').pop())}?`)) {
            try {
                await axios.delete(`${apiUrl}/api/schedule/block`, { data: { timeSlot: blocked.timeSlot, date: blocked.date } });
    
                setBlockedTimes(prev => prev.filter(bt => !(bt.timeSlot === blocked.timeSlot && bt.date === blocked.date)));
                console.log(`✅ Blocked time removed: ${blocked.timeSlot} on ${blocked.date}`);
            } catch (error) {
                console.error("❌ Error deleting blocked time:", error);
                alert("Failed to delete blocked time.");
            }
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
                                            appointmentHour === hour
                                        );
                                    });
    
                                    // Filter gigs for this hour
                                    const gigsAtTime = gigs.filter((gig) => {
                                        const normalizedDate = new Date(gig.date).toISOString().split('T')[0];
                                        const [gigHour] = gig.time.split(':').map(Number);
                                        return normalizedDate === dayString && gigHour === hour;
                                    });
                                    
                                    
                                    const blockedEntriesAtTime = blockedTimes.map((b) => {
                                        const [startHour, startMinutes] = b.timeSlot.split('-').pop().split(':').map(Number);
                                    
                                        // Extract duration from label (e.g., "test (1 hours)")
                                        let durationMatch = b.label.match(/\((\d+(\.\d+)?)\s*hours?\)/i);
                                        let duration = durationMatch ? parseFloat(durationMatch[1]) : 1; // Default to 1 hour if missing
                                    
                                        return {
                                            ...b,
                                            startHour,
                                            startMinutes: startMinutes || 0, // Ensure minutes are set
                                            duration, // Use extracted duration
                                        };
                                    }).filter(b => b.date === dayString && b.startHour === hour);
                    
                                    return (
                                        <td
                                        key={dayIndex}
                                        className="time-slot"
                                        style={{
                                            position: 'relative',
                                            verticalAlign: 'top',
                                            height: '30px',
                                        }}
                                    >
                                        {/* Render blocked slots exactly like appointments */}
                                        {blockedEntriesAtTime.map((blocked, index) => {
                                            const [startHour, startMinutes] = blocked.timeSlot.split('-').pop().split(':').map(Number);
                                            const blockTop = (startMinutes / 60) * 100; // Align inside the hour
                                            const blockHeight = blocked.duration * 100; // Each hour = 100% of the row height
                                    
                                            return (
                                                <div
                                                    key={index}
                                                    className="blocked-indicator"
                                                    style={{
                                                        position: 'absolute',
                                                        top: `${blockTop}%`, 
                                                        left: 0,
                                                        right: 0,
                                                        height: `${blockHeight}%`, 
                                                        backgroundColor: '#d3d3d3',
                                                        textAlign: 'center',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {blocked.label || "Blocked"}
                                                </div>
                                            );
                                        })}
                                        
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
                                                        onClick={(e) => e.stopPropagation()} // Prevents the time popup
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
      
          {/* Gigs */}
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
      
          {/* Appointments */}
          <div className="appointment-container">
            {appointments
              .filter((appointment) => {
                const formatDate = (d) => new Date(d).toISOString().split('T')[0];
                return formatDate(appointment.date) === selectedDate.toISOString().split('T')[0];
              })
              .map((appointment) => (
                <div key={appointment.id} className="gig-card">
                  <strong>Title:</strong> {appointment.title} <br />
                  <strong>Client:</strong>{' '}
                  {clients?.length > 0 && appointment.client_id
                    ? clients.find(client => client.id === appointment.client_id)?.full_name || 'N/A'
                    : 'N/A'} <br />
                  <strong>Time:</strong> {formatTime(appointment.time)} - {formatTime(appointment.end_time)} <br />
                  <strong>Description:</strong> {appointment.description} <br />
                  <br />
                  <button onClick={() => handleEditAppointment(appointment)}>Edit</button>
                  <button onClick={() => handleDeleteAppointment(appointment.id)}>Delete</button>
                </div>
              ))}
          </div>
      
          {/* Blocked Times */}
          <div className="blocked-time-container">
            {blockedTimes
              .filter(blocked => {
                const blockedDate = new Date(blocked.date).toISOString().split('T')[0];
                const selectedDateFormatted = selectedDate.toISOString().split('T')[0];
                return blockedDate === selectedDateFormatted;
              })
              .map((blocked) => (
                <div key={blocked.timeSlot} className="gig-card blocked">
                  <strong>Blocked Time:</strong> {formatTime(blocked.timeSlot.split('-').pop())} <br />
                  <strong>Reason:</strong> {blocked.label} <br />
                  <button onClick={() => handleDeleteBlockedTime(blocked)}>Delete</button>
                </div>
              ))}
          </div>
      
          {/* + Button to open block modal */}
          <button
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              backgroundColor: '#8B0000',
              color: 'white',
              borderRadius: '50%',
              width: '50px',
              height: '50px',
              fontSize: '24px',
              cursor: 'pointer',
              border: 'none',
            }}
            onClick={() => setShowBlockModal(true)}
          >
            +
          </button>
      
          {/* Block Time Modal with recurrence options */}
          {showBlockModal && (
            <div className="modal">
              <div className="modal-content">
                <h3>Block Time Slot</h3>
      
                <label>Select Date:</label>
                <input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
      
                <label>Start Time:</label>
                <input type="time" value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} />
      
                <label>Duration (Hours):</label>
                <input
                  type="number"
                  min="1"
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(Number(e.target.value))}
                />
      
                <label>Reason:</label>
                <input type="text" value={blockLabel} onChange={(e) => setBlockLabel(e.target.value)} />
      
                <label>Select Days of the Week:</label>
                <div style={{ marginBottom: '10px' }}>
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, i) => (
                    <label key={day} style={{ marginRight: '10px' }}>
                      <input
                        type="checkbox"
                        value={i}
                        checked={recurringDays.includes(i)}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          setRecurringDays((prev) =>
                            e.target.checked ? [...prev, value] : prev.filter((d) => d !== value)
                          );
                        }}
                      />
                      {day}
                    </label>
                  ))}
                </div>
      
                <label>Number of Weeks to Repeat:</label>
                <input
                  type="number"
                  min="1"
                  value={recurrenceWeeks}
                  onChange={(e) => setRecurrenceWeeks(Number(e.target.value))}
                />
      
                <div style={{ marginTop: '20px' }}>
                  <button onClick={handleBlockTime}>Block Time</button>
                  <button onClick={() => setShowBlockModal(false)} style={{ marginLeft: '10px' }}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
      
          {/* Add/Edit Appointment Form */}
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
                    category: selectedType.category,
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
                <option value="" disabled>Select a Client</option>
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
    }      
export default SchedulingPage;
