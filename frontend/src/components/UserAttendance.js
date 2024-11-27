import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const UserAttendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        const API_BASE_URL = process.env.REACT_APP_API_URL;
        const fetchUserAttendanceData = async () => {
            try {
                const username = localStorage.getItem('username'); // Fetch username from localStorage
                if (!username) throw new Error('Username is undefined');
    
                const response = await axios.get(`${API_BASE_URL}/api/gigs/user-attendance`, {
                    params: { username },
                });
                setAttendanceData(response.data);
            } catch (error) {
                console.error('Error fetching user attendance data:', error);
                setError('Failed to load attendance data. Please try again later.');
            }finally {
                setLoading(false);
            }
        };
    
        fetchUserAttendanceData();
    }, []);

    if (loading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;
    if (!attendanceData.length) return <p>Loading...</p>;

    return (
        <div className="user-gigs-container">
            <h2>My Attendance</h2>
            <nav>
                <ul>
                    <li>
                        <Link to="/gigs/">Home</Link> | 
                        <Link to="/gigs/your-gigs"> My Gigs</Link> | 
                        <Link to="/gigs/user-attendance"> My Attendance</Link> 
                    </li>
                </ul>
            </nav>
            <ul>
                {attendanceData.map((record) => (
                    <li key={record.id} style={{ marginBottom: '20px' }} className="gig-card">
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
        </div>
    );
};

export default UserAttendance;
