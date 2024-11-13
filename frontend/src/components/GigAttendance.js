import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const GigAttendance = () => {
    const { gigId } = useParams();  // Extract gigId from the URL
    const [attendanceData, setAttendanceData] = useState(null);

    useEffect(() => {
        const fetchAttendanceData = async () => {
            try {
                const response = await axios.get(`/api/admin/gig/${gigId}/attendance`);
                setAttendanceData(response.data);
            } catch (error) {
                console.error('Error fetching attendance data:', error);
            }
        };

        fetchAttendanceData();
    }, [gigId]);

    if (!attendanceData) return <p>Loading...</p>;

    return (
        <div className="user-gigs-container">
            <h2>Attendance Details for Gig {attendanceData.gig.client}</h2>
            <p><strong>Event Type:</strong> {attendanceData.gig.event_type}</p>
            <p><strong>Date:</strong> {new Date(attendanceData.gig.date).toLocaleDateString()}</p>
            <p><strong>Time:</strong> {new Date(attendanceData.gig.time).toLocaleTimeString()}</p>
            <p><strong>Location:</strong> {attendanceData.gig.location}</p>

            <h3>Attendance Records</h3>
            {attendanceData.attendance.length > 0 ? (
                <ul>
                    {attendanceData.attendance.map(att => (
                        <li key={att.user_id}>
                            <p><strong>User:</strong> {att.user_name}</p>
                            <p><strong>Check-In:</strong> {att.check_in_time ? new Date(att.check_in_time).toLocaleString() : "Not Checked In"}</p>
                            <p><strong>Check-Out:</strong> {att.check_out_time ? new Date(att.check_out_time).toLocaleString() : "Not Checked Out"}</p>
                            <p><strong>Status:</strong> {att.is_checked_in ? "Checked In" : "Not Checked In"}</p>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No attendance records available for this gig.</p>
            )}
        </div>
    );
};

export default GigAttendance;
