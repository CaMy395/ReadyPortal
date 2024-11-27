import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const GigAttendance = () => {
    const [attendanceData, setAttendanceData] = useState(null);
    const [message, setMessage] = useState('Loading...');
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        const API_BASE_URL = process.env.REACT_APP_API_URL;
        const fetchAllAttendanceData = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/admin/attendance`);
                if (response.data.length === 0) {
                    setMessage('There is no data to view.');
                } else {
                    setAttendanceData(response.data);
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

    const handlePay = async (userId, checkInTime, checkOutTime, gigDetails) => {
        try {

            console.log('Gig Details:', gigDetails); // Log gig details
            console.log('User ID:', userId); // Log user ID
    
            const API_BASE_URL = process.env.REACT_APP_API_URL;
            const response = await axios.get(`${API_BASE_URL}/api/users/${userId}/payment-details`);
            const { preferred_payment_method, payment_details } = response.data;
    
            if (!preferred_payment_method || !payment_details) {
                alert('Payment details not available for this user.');
                return;
            }
    
            const checkIn = new Date(checkInTime);
            const checkOut = new Date(checkOutTime);
            const hoursWorked = ((checkOut - checkIn) / (1000 * 60 * 60)).toFixed(2);
            const hourlyRate = gigDetails.pay;
            const totalPay = (hoursWorked * hourlyRate).toFixed(2);
    
            const formattedDate = new Date(gigDetails.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
    
            const memo = `Payment for ${gigDetails.client} (${gigDetails.event_type}) on ${formattedDate}, worked ${hoursWorked} hours`;
    
            if (preferred_payment_method === 'Cash App') {
                alert(`Redirecting to Cash App.\nPay $${totalPay} to ${payment_details}.\nHours Worked: ${hoursWorked} hours.\nMemo: "${memo}"`);
                window.open(`https://cash.app/${payment_details}`, '_blank');
            } else if (preferred_payment_method === 'Zelle') {
                alert(`Pay via Zelle to ${payment_details}.\nAmount: $${totalPay}.\nHours Worked: ${hoursWorked} hours.\nMemo: "${memo}"`);
            }
    
            // Mark the gig as paid in the database
            const updateResponse = await axios.patch(`${API_BASE_URL}/api/gigs/${gigDetails.id}/attendance/${userId}/pay`);
            if (updateResponse.status === 200) {
                // Update the frontend state to mark the gig as paid
                setAttendanceData((prevData) =>
                    prevData.map((record) =>
                        record.id === gigDetails.id ? { ...record, is_paid: true } : record
                    )
                );
                alert('Payment marked as completed.');
            }
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Failed to process payment.');
        }
    };
    
    

    if (loading) return <p>{message}</p>;

    return (
        <div className="user-gigs-container">
            <nav>
                <ul>
                    <li>
                        <Link to="/admin/">Home</Link> | 
                        <Link to="/admin/admins-gigs">My Gigs</Link> | 
                        <Link to="/admin/attendance">Gig Attendance</Link>
                    </li>
                </ul>
            </nav>

            <h2>All Gig Attendance</h2>
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
                            <p><strong>Paid: </strong> 
                            <span style={{color: record.is_paid ? 'green' : 'red'}}>
                                {record.is_paid ? 'Yes' : 'No'}
                            </span></p>
                            {!record.is_paid && (
                            <button
                                onClick={() =>
                                    handlePay(record.user_id, record.check_in_time, record.check_out_time, {
                                        client: record.client,
                                        event_type: record.event_type,
                                        date: record.date,
                                        pay: record.pay,
                                        id: record.gig_id,
                                    })
                                }
                                style={{
                                    marginTop: '10px',
                                    padding: '10px 20px',
                                    backgroundColor: '#8B0000',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                }}
                            >
                                Pay
                            </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default GigAttendance;
