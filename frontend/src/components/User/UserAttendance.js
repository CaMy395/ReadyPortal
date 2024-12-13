import React, { useState, useEffect } from 'react';
import axios from 'axios';


const UserAttendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [message, setMessage] = useState('Loading...'); // Default message
    const [loading, setLoading] = useState(true);


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
                    setAttendanceData(response.data);
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
                                <strong>Date: </strong> 
                                {(() => {
                                    const date = new Date(record.date); // Create the date object
                                    return `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`; // Format as MM/DD/YYYY
                                })()}
                            </p>
                            <p><strong>Time: </strong> 
                                {record.time ? new Date(`1970-01-01T${record.time}`).toLocaleTimeString() : 'Not Available'}
                            </p>
                            <p><strong>Location:</strong> {record.location}</p>
                            <p>
                            <strong>Check-In:</strong> {record.check_in_time
                                    ? new Intl.DateTimeFormat('en-US', {
                                        timeZone: 'America/New_York',
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true, // Display AM/PM format
                                    }).format(new Date(record.check_in_time))
                                    : 'Not Checked In'}
                            </p>
                            <p>
                                <strong>Check-Out:</strong> {record.check_out_time
                                    ? new Intl.DateTimeFormat('en-US', {
                                        timeZone: 'America/New_York',
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: true, // Display AM/PM format
                                    }).format(new Date(record.check_out_time))
                                    : 'Not Checked Out'}
                            </p>
                            <p>
                                <strong>Status: </strong> 
                                <span style={{ color: record.is_checked_in ? 'white' : 'green' }}>
                                    {record.is_checked_in ? 'Checked In' : 'Completed'}
                                </span>
                            </p>
                            <p><strong>Paid: </strong> 
                            <span style={{color: record.is_paid ? 'green' : 'red'}}>
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
