import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment-timezone'

const UserAttendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [message, setMessage] = useState('Loading...'); // Default message
    const [loading, setLoading] = useState(true);

     const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'UTC',
            });
        };
                
        const formatTime = (timeString) => {
            if (!timeString) return 'N/A';
            const dateTimeString = `1970-01-01T${timeString}`;
            const date = new Date(dateTimeString);
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/New_York',
            });
        };
    
        const formatDateTime = (dateTimeString) => {
            if (!dateTimeString) return 'Not Available';
            return moment(dateTimeString).format('MM/DD/YYYY hh:mm A');
        };
    

        useEffect(() => {
            const fetchUserAttendanceData = async () => {
                const API_BASE_URL = process.env.REACT_APP_API_URL;
                const username = localStorage.getItem('username');

                if (!username) {
                    setMessage('There is no data to view.');
                    setLoading(false);
                    return;
                }

                try {
                    const [gigRes, apptRes] = await Promise.all([
                        axios.get(`${API_BASE_URL}/api/gigs/user-attendance`, { params: { username } }),
                        axios.get(`${API_BASE_URL}/api/appointments/user-attendance`, { params: { username } }),
                    ]);

                    const gigs = gigRes.data.map(record => ({
                        ...record,
                        type: 'gig',
                        dateTime: new Date(`${record.gig_date}T${record.gig_time || '00:00'}`)
                    }));

                    const appts = apptRes.data.map(record => ({
                        ...record,
                        type: 'appointment',
                        dateTime: new Date(`${record.appt_date}T${record.appt_time || '00:00'}`)
                    }));


                    const all = [...gigs, ...appts].sort((a, b) => b.dateTime - a.dateTime);

                    if (all.length === 0) {
                        setMessage('There is no data to view.');
                    } else {
                        setAttendanceData(all);
                        setMessage(null);
                    }

                } catch (error) {
                    console.error('Error fetching user attendance data:', error);
                    setMessage('Failed to load attendance data. Please try again later.');
                } finally {
                    setLoading(false);
                }
            };

            fetchUserAttendanceData();
        }, []);

        useEffect(() => {
  console.log("🧪 Raw Attendance:", attendanceData);
}, [attendanceData]);

            if (loading) return <p>{message}</p>;

            return (
                <div>
                    <h2>My Attendance</h2>
            <p>Please confirm that your timecard is correct to avoid incorrect payout.</p>
                    {message && (
                        <>
                            <p>{message}</p>

                        </>
                    )}
                    {!message && (
                        <ul>          
                            {attendanceData.map((record) => (
                    <li key={record.id} style={{ marginBottom: '20px' }} className="gig-card">
                        <p>
                        <strong>{record.type === 'gig' ? 'Gig:' : 'Appointment:'}</strong>{' '}
                        {record.type === 'gig' ? `${record.client} - ${record.event_type}` : record.title}
                        </p>
                        <p><strong>Date:</strong> {formatDate(record.gig_date || record.appt_date)}</p>
                    <p><strong>Time:</strong> {formatTime(record.gig_time || record.appt_time)}</p>

                        <p><strong>Location:</strong> {record.location}</p>
                        <p><strong>Check-In:</strong> {record.check_in_time ? formatDateTime(record.check_in_time) : 'Not Checked In'}</p>
                        <p><strong>Check-Out:</strong> {record.check_out_time ? formatDateTime(record.check_out_time) : 'Not Checked Out'}</p>
                        <p><strong>Time Worked:</strong>{' '}
                        {record.check_in_time && record.check_out_time
                            ? `${((new Date(record.check_out_time) - new Date(record.check_in_time)) / 3600000).toFixed(2)} hours`
                            : 'N/A'}
                        </p>
                        <p><strong>Status:</strong>{' '}
                    <span style={{ color: record.check_in_time && record.check_out_time ? 'green' : record.check_in_time ? 'white' : 'gray' }}>
                        {record.check_in_time && record.check_out_time
                        ? 'Completed'
                        : record.check_in_time
                        ? 'Checked In'
                        : 'Not Started'}
                    </span>
                    </p>

                    <p><strong>Paid:</strong>{' '}
                    <span style={{ color: record.is_paid ? 'green' : 'red' }}>
                        {record.is_paid ? 'Yes' : 'No'}
                    </span>
                    </p>
                </li>
                ))}

                </ul>
            )}
        </div>
    );
};

export default UserAttendance;
