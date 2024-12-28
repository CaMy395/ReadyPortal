import React, { useState, useEffect } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';

const GigAttendance = () => {
    const [attendanceData, setAttendanceData] = useState(null);
    const [message, setMessage] = useState('Loading...');
    const [loading, setLoading] = useState(true);
    const [editingRecord, setEditingRecord] = useState(null); // Track the record being edited

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'America/New_York',
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
                const sortedData = response.data.sort((a, b) => {
                    const dateA = new Date(a.gig_date);
                    const dateB = new Date(b.gig_date);
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


    const handlePay = async (userId, checkInTime, checkOutTime, gigDetails) => {
        try {
            const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
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

            const formattedDate = moment(gigDetails.date).tz('America/New_York').format('MM/DD/YYYY');
            const memo = `Payment for ${gigDetails.client} (${gigDetails.event_type}) on ${formattedDate}, worked ${hoursWorked} hours`;

           /* if (preferred_payment_method === 'Cash App') {
                alert(`Redirecting to Cash App.\nPay $${totalPay} to ${payment_details}.\nMemo: "${memo}"`);
                window.open(`https://cash.app/${payment_details}`, '_blank');
            } else if (preferred_payment_method === 'Zelle') {
                alert(`Pay via Zelle to ${payment_details}.\nAmount: $${totalPay}.\nMemo: "${memo}"`);
            }*/

            // Save payout to the database
            const payoutResponse = await axios.post(`${API_BASE_URL}/api/payouts`, {
                staff_id: userId,
                gig_id: gigDetails.id,
                payout_amount: totalPay,
                description: memo,
            });

            if (payoutResponse.status === 201) {
                alert('Payout saved successfully!');
            }

            const updateResponse = await axios.patch(`${API_BASE_URL}/api/gigs/${gigDetails.id}/attendance/${userId}/pay`);
            if (updateResponse.status === 200) {
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

    const handleEdit = (record) => {
        setEditingRecord({
            ...record,
            newCheckInTime: record.check_in_time
                ? moment(record.check_in_time).format('YYYY-MM-DDTHH:mm')
                : '',
            newCheckOutTime: record.check_out_time
                ? moment(record.check_out_time).format('YYYY-MM-DDTHH:mm')
                : '',
        });
    };
    

    const handleSave = async (gigId) => {
        console.log('gigId:', gigId); // Ensure this is an integer
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        try {
            const { newCheckInTime, newCheckOutTime } = editingRecord;
            const response = await axios.patch(`${API_BASE_URL}/api/gigs/${gigId}/attendance`, {
                check_in_time: newCheckInTime,
                check_out_time: newCheckOutTime,
            });
    
            setAttendanceData((prevData) =>
                prevData.map((record) =>
                    record.gig_id === gigId
                        ? { ...record, check_in_time: newCheckInTime, check_out_time: newCheckOutTime }
                        : record
                )
            );
            setEditingRecord(null);
            alert('Times updated successfully.');
        } catch (error) {
            console.error('Error saving updated times:', error);
            alert('Failed to save updated times. Please try again.');
        }
    };
    
        
    
    const handleCancel = () => {
        setEditingRecord(null);
    };

    if (loading) return <p>{message}</p>;


    return (
        <div>
            <h2>All Gig Attendance</h2>
            {message ? (
                <p>{message}</p>
            ) : (
                <ul>
                                {attendanceData.map((record) => (
                                    <li key={record.id} className="gig-card">
                                        {/* Add a container for the button */}
                                        <div className="gig-card-header">
                                            {editingRecord && editingRecord.id === record.id ? (
                                                <div>
                                                    <button onClick={() => handleSave(record.gig_id)}>Save</button>
                                                    <button onClick={handleCancel}>Cancel</button>
                                                </div>
                                            ) : (
                                                <button className="edit-button" onClick={() => handleEdit(record)}>
                                                    Edit
                                                </button>
                                            )}
                                        </div>

                                        {/* Gig details */}
                                        <p><strong>User:</strong> {record.name}</p>
                                        <p><strong>Gig:</strong> {record.client} - {record.event_type}</p>
                                        <p><strong>Date:</strong> {record.gig_date ? formatDate(record.gig_date) : 'Not Available'}</p>
                                        <p><strong>Time:</strong> {record.gig_time ? formatTime(record.gig_time) : 'Not Available'}</p>
                                        <p><strong>Location:</strong> {record.location}</p>
                                        <p><strong>Check-In:</strong> {editingRecord && editingRecord.id === record.id ? (
                                            <input
                                                type="datetime-local"
                                                value={editingRecord.newCheckInTime || ''}
                                                onChange={(e) =>
                                                    setEditingRecord({ ...editingRecord, newCheckInTime: e.target.value })
                                                }
                                            />
                                        ) : (
                                            formatDateTime(record.check_in_time)
                                        )}</p>
                                        <p><strong>Check-Out:</strong> {editingRecord && editingRecord.id === record.id ? (
                                            <input
                                                type="datetime-local"
                                                value={editingRecord.newCheckOutTime || ''}
                                                onChange={(e) =>
                                                    setEditingRecord({ ...editingRecord, newCheckOutTime: e.target.value })
                                                }
                                            />
                                        ) : (
                                            formatDateTime(record.check_out_time)
                                        )}</p>
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
                                            </span>
                                        </p>
                            <p>
                                <strong>Payment Method:</strong> {record.preferred_payment_method}
                            </p>
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
