import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import axios from 'axios';
import '../../App.css';

const SchedulingPage = () => {
    const [gigs, setGigs] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [clients, setClients] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
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
            .then((res) => setAppointments(res.data))
            .catch((err) => console.error(err));
        
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
            date: selectedDate.toISOString().split('T')[0],
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
            date: appointment.date,
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

    return (
        <div>
            <h2>Scheduling Page</h2>
            <Calendar
                onClickDay={handleDateClick}
                tileContent={getTileContent}
                value={selectedDate}
            />
            <h3>Selected Date: {selectedDate.toDateString()}</h3>
            <ul>
                {gigs
                    .filter((gig) => {
                        const formatDate = (d) => new Date(d).toISOString().split('T')[0];
                        return formatDate(gig.date) === selectedDate.toISOString().split('T')[0];
                    })
                    .map((gig) => (
                        <li key={gig.id}>
                            <strong>Client:</strong> {gig.client} <br />
                            <strong>Event:</strong> {gig.event_type} <br />
                            <strong>Time:</strong> {formatTime(gig.time)} <br />
                            <strong>Location:</strong> {gig.location}
                        </li>
                    ))}
            </ul>
            <ul>
                {appointments
                    .filter((appointment) => {
                        const formatDate = (d) => new Date(d).toISOString().split('T')[0];
                        return formatDate(appointment.date) === selectedDate.toISOString().split('T')[0];
                    })
                    .map((appointment) => (
                        <li key={appointment.id}>
                            <strong>Title:</strong> {appointment.title} <br />
                            <strong>Client:</strong> {clients.find(client => client.id === appointment.client_id)?.full_name || 'N/A'} <br />
                            <strong>Time:</strong> {formatTime(appointment.time)} - {formatTime(appointment.end_time)} <br />
                            <strong>Description:</strong> {appointment.description} <br />
                            <button onClick={() => handleEditAppointment(appointment)}>Edit</button>
                            <button onClick={() => handleDeleteAppointment(appointment.id)}>Delete</button>
                        </li>
                    ))}
            </ul>
            <h3>{editingAppointment ? 'Edit Appointment' : 'Add Appointment'}</h3>
            <form onSubmit={handleAddOrUpdateAppointment}>
                <label>
                    Title:
                    <input
                        type="text"
                        value={newAppointment.title}
                        onChange={(e) => setNewAppointment({ ...newAppointment, title: e.target.value })}
                        required
                    />
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
                        value={newAppointment.date}
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
            </form>
        </div>
    );
};

export default SchedulingPage;
