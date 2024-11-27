import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const GigAttendance = () => {
    const [attendanceData, setAttendanceData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const API_BASE_URL = process.env.REACT_APP_API_URL;
        const fetchAllAttendanceData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/admin/attendance`);
                setAttendanceData(response.data);
            } catch (err) {
                console.error('Error fetching all attendance data:', err);
                setError('Failed to load attendance data. Please try again later.');
            }
        };

        fetchAllAttendanceData();
    }, []);

    if (error) return <p>{error}</p>;
    if (!attendanceData) return <p>Loading...</p>;

    return (
        <div className="user-gigs-container">
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
            
            <h2>All Gig Attendance</h2>
            {attendanceData.length > 0 ? (
                <ul>
                    {attendanceData.map((record) => {
            return (
                <li key={record.id} className="gig-card">
                    <p><strong>User:</strong> {record.name}</p>
                    <p><strong>Gig:</strong> {record.client} - {record.event_type}</p>
                    <p><strong>Date:</strong> {new Date(record.date).toLocaleDateString()}</p>
                    <p><strong>Time: </strong> {record.time ? new Date(`1970-01-01T${record.time}`).toLocaleTimeString() : 'Not Available'}</p>
                    <p><strong>Location:</strong> {record.location}</p>
                    <p><strong>Check-In:</strong> {record.check_in_time ? new Date(record.check_in_time).toLocaleString() : 'Not Checked In'}</p>
                    <p><strong>Check-Out:</strong> {record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'Not Checked Out'}</p>
                    <p><strong>Status:</strong> {record.is_checked_in ? 'In Progress' : 'Completed'}</p>
                </li>
                    );
                })}
                </ul>
            ) : (
                <p>No attendance records available.</p>
        )}

        </div>
    );
};

export default GigAttendance;
