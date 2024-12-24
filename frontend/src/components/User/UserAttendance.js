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
        const adjustedDate = moment.utc(dateTimeString).subtract(5, 'hours');
        return adjustedDate.tz('America/New_York').format('MM/DD/YYYY hh:mm A');
    };
useEffect(() => {
    const API_BASE_URL = process.env.REACT_APP_API_URL;
    const fetchAllAttendanceData = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/admin/attendance`);
            console.log('Raw Attendance Data:', response.data);
            if (response.data.length === 0) {
                setMessage('There is no data to view.');
            } else {
                // Sort data by gig_date and optionally gig_time in descending order
                const sortedData = response.data.sort((a, b) => {
                    const dateA = new Date(a.gig_date + 'T' + (a.gig_time || '00:00:00'));
                    const dateB = new Date(b.gig_date + 'T' + (b.gig_time || '00:00:00'));
                    return dateB - dateA; // Newest to oldest
                });
                setAttendanceData(sortedData);
                setMessage(null);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error);
            setMessage('Failed to load attendance data. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    fetchAllAttendanceData();
}, []);
    

useEffect(() => {
    const fetchUserAttendanceData = async () => {
        const API_BASE_URL = process.env.REACT_APP_API_URL;
        const username = localStorage.getItem('username'); // Fetch username from localStorage

        if (!username) {
            setMessage('There is no data to view.');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(`${API_BASE_URL}/api/gigs/user-attendance`, {
                params: { username },
            });

            if (response.data.length === 0) {
                setMessage('There is no data to view.');
            } else {
                // Sort data by gig_date and optionally gig_time in descending order
                const sortedData = response.data.sort((a, b) => {
                    const dateA = new Date(a.gig_date);
                    const dateB = new Date(b.gig_date);
                    return dateB - dateA; // Newest to oldest
                });
                
                setAttendanceData(sortedData);
                setMessage(null); // Clear the message
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
                            <p><strong>Gig:</strong> {record.client} - {record.event_type}</p>
                            <p>
                                <strong>Date:</strong> {record.gig_date ? formatDate(record.gig_date) : 'Not Available'}
                            </p>
                            <p>
                                <strong>Time:</strong> {record.gig_time ? formatTime(record.gig_time) : 'Not Available'}
                            </p>

                            <p><strong>Location:</strong> {record.location}</p>
                            <p>
                                <strong>Check-In:</strong>{' '}
                                {record.check_in_time ? formatDateTime(record.check_in_time) : 'Not Checked In'}
                            </p>
                            <p>
                                <strong>Check-Out:</strong>{' '}
                                {record.check_out_time ? formatDateTime(record.check_out_time) : 'Not Checked Out'}
                            </p>
                            <p>
                                <strong>Time Worked:</strong>{' '}
                                {record.check_in_time && record.check_out_time
                                    ? `${(
                                          (new Date(record.check_out_time) - new Date(record.check_in_time)) /
                                          (1000 * 60 * 60)
                                      ).toFixed(2)} hours`
                                    : 'N/A'}
                            </p>
                            <p>
                                <strong>Status:</strong>{' '}
                                <span style={{ color: record.is_checked_in ? 'white' : 'green' }}>
                                    {record.is_checked_in ? 'Checked In' : 'Completed'}
                                </span>
                            </p>
                            <p>
                                <strong>Paid:</strong>{' '}
                                <span style={{ color: record.is_paid ? 'green' : 'red' }}>
                                    {record.is_paid ? 'Yes' : 'No'}
                                </span></p>
                            {!record.is_paid }

                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default UserAttendance;
