import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const GigAttendance = () => {
    const [attendanceData, setAttendanceData] = useState(null);
    const [message, setMessage] = useState('Loading...'); // Default message
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // Hook to navigate back

    useEffect(() => {
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const fetchAllAttendanceData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/admin/attendance`);
                if (response.data.length === 0) {
                    setMessage('There is no data to view.');
                } else {
                    setAttendanceData(response.data);
                    setMessage(null); // Clear the message
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

    if (loading) return <p>{message}</p>;

    return (
        <div className="user-gigs-container">
            <h2>All Gig Attendance</h2>
            <nav>
                <ul>
                    <li>
                        <Link to="/admin/">Home</Link> | 
                        <Link to="/admin/admins-gigs"> My Gigs</Link> | 
                        <Link to="/admin/attendance"> Gig Attendance</Link> | 
                        <Link to="/admin/mytasks"> My Tasks</Link> | 
                        <Link to="/admin/userlist"> Users List</Link>
                    </li>
                </ul>
            </nav>
            {message ? (
                <>
                    <p>{message}</p>
                </>
            ) : (
                <ul>
                    {attendanceData.map((record) => (
                        <li key={record.id} className="gig-card">
                            <p><strong>User:</strong> {record.name}</p>
                            <p><strong>Gig:</strong> {record.client} - {record.event_type}</p>
                            <p><strong>Date:</strong> {new Date(record.date).toLocaleDateString()}</p>
                            <p><strong>Time: </strong> 
                                {record.time ? new Date(`1970-01-01T${record.time}`).toLocaleTimeString() : 'Not Available'}
                            </p>
                            <p><strong>Location:</strong> {record.location}</p>
                            <p><strong>Check-In:</strong> {record.check_in_time ? new Date(record.check_in_time).toLocaleString() : 'Not Checked In'}</p>
                            <p><strong>Check-Out:</strong> {record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'Not Checked Out'}</p>
                            <p><strong>Status:</strong> {record.is_checked_in ? 'In Progress' : 'Completed'}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GigAttendance;
