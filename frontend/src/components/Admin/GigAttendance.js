import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';

const GigAttendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const [editingRecord, setEditingRecord] = useState(null);

    useEffect(() => {
        fetchAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/admin/attendance`);
            const sortedData = response.data.sort((a, b) => new Date(b.event_date) - new Date(a.event_date));

            const fixedData = sortedData.map((item) => ({
                ...item,
                gig_id: item.type === 'gig' ? item.source_id : undefined,
                appointment_id: item.type === 'appointment' ? item.source_id : undefined,
            }));

            setAttendanceData(fixedData);
        } catch (err) {
            console.error('Error fetching attendance:', err);
        }
    };

    const formatDateTime = (value) => {
        if (!value) return '—';
        return moment(value).tz('America/New_York').format('MMM D, YYYY h:mm A');
    };

    const handlePay = async (record) => {
    try {
        const userId = record.user_id;
        const checkInTime = record.check_in_time;
        const checkOutTime = record.check_out_time;

        const response = await axios.get(`${API_BASE_URL}/api/users/${userId}/payment-details`);
        const { preferred_payment_method, payment_details } = response.data;

        if (!preferred_payment_method || !payment_details) {
            alert('Payment details not available for this user.');
            return;
        }

        const hoursWorked = ((new Date(checkOutTime) - new Date(checkInTime)) / (1000 * 60 * 60)).toFixed(2);
        const hourlyRate = record.type === 'appointment' ? 25 : record.pay;
        const totalPay = (hoursWorked * hourlyRate).toFixed(2);

        const formattedDate = moment(record.event_date).tz('America/New_York').format('MM/DD/YYYY');
        const memo = `Payment for ${record.client} (${record.event_type}) on ${formattedDate}, worked ${hoursWorked} hours`;

        if (preferred_payment_method === 'Cash App') {
            alert(`Redirecting to Cash App.\nPay $${totalPay} to ${payment_details}.\nMemo: "${memo}"`);
            window.open(`https://cash.app/${payment_details}`, '_blank');
        } else if (preferred_payment_method === 'Zelle') {
            alert(`Pay via Zelle to ${payment_details}.\nAmount: $${totalPay}.\nMemo: "${memo}"`);
        }

        // Update is_paid
        if (record.type === 'gig' && record.gig_id) {
            await axios.patch(`${API_BASE_URL}/api/gigs/${record.gig_id}/attendance/${userId}/pay`);
        } else if (record.type === 'appointment' && record.appointment_id) {
            await axios.patch(`${API_BASE_URL}/appointments/${record.appointment_id}/attendance/${userId}/pay`);
        } else {
            console.error('Missing gig_id or appointment_id in record:', record);
            alert('Unable to determine event type or ID for payment.');
            return;
        }

        // INSERT into payouts (and backend should also handle inserting into profits)
        await axios.post(`${API_BASE_URL}/api/payouts`, {
            staff_id: userId,
            payout_amount: totalPay,
            description: memo,
            gig_id: record.type === 'gig' ? record.gig_id : null,
            appointment_id: record.type === 'appointment' ? record.appointment_id : null,
        });

        setAttendanceData((prevData) =>
            prevData.map((r) =>
                r.user_id === userId &&
                ((record.gig_id && r.gig_id === record.gig_id) || (record.appointment_id && r.appointment_id === record.appointment_id))
                    ? { ...r, is_paid: true }
                    : r
            )
        );

        alert('Payment marked as completed.');
    } catch (err) {
        console.error('Error updating payment status:', err);
        alert('❌ Failed to mark as paid.');
    }
    };


    const handleEdit = (record) => {
        setEditingRecord({ ...record, newCheckInTime: record.check_in_time, newCheckOutTime: record.check_out_time });
    };

    const handleSave = async () => {
        const { user_id, newCheckInTime, newCheckOutTime, gig_id, appointment_id, type } = editingRecord;
        const targetId = type === 'gig' ? gig_id : appointment_id;

        try {
            const endpoint = type === 'gig'
                ? `${API_BASE_URL}/api/gigs/${targetId}/attendance/${user_id}`
                : `${API_BASE_URL}/appointments/${targetId}/attendance/${user_id}`;

            await axios.patch(endpoint, {
                check_in_time: newCheckInTime,
                check_out_time: newCheckOutTime,
            });

            setAttendanceData((prevData) =>
                prevData.map((r) =>
                    r.user_id === user_id && ((type === 'gig' && r.gig_id === targetId) || (type === 'appointment' && r.appointment_id === targetId))
                        ? { ...r, check_in_time: newCheckInTime, check_out_time: newCheckOutTime }
                        : r
                )
            );

            setEditingRecord(null);
        } catch (err) {
            console.error('❌ Error saving edited times:', err);
        }
    };

    const handleCancel = () => {
        setEditingRecord(null);
    };

    return (
        <div className="p-4">
            <h2 className="text-xl font-bold mb-4">Gig & Appointment Attendance</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse border border-white">
                    <thead>
                        <tr className="bg-gray-800 text-white">
                        <th className="border border-white px-4 py-2">Name</th>
                        <th className="border border-white px-4 py-2">Client</th>
                        <th className="border border-white px-4 py-2">Event Type</th>
                        <th className="border border-white px-4 py-2">Check-In</th>
                        <th className="border border-white px-4 py-2">Check-Out</th>
                        <th className="border border-white px-4 py-2">Paid</th>
                        <th className="border border-white px-4 py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attendanceData.map((record, index) => (
                        <tr
                            key={`${record.type}-${record.user_id}-${record.source_id}`}
                            className={`text-center border-b border-white ${index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-black'} hover:bg-[#333] transition`}
                        >
                            <td className="border border-white px-4 py-2 text-white">{record.name}</td>
                            <td className="border border-white px-4 py-2 text-white">{record.client}</td>
                            <td className="border border-white px-4 py-2 text-white">{record.event_type}</td>
                            <td className="border border-white px-4 py-2 text-white">
                            {editingRecord && editingRecord.user_id === record.user_id && editingRecord.source_id === record.source_id ? (
                                <input
                                type="datetime-local"
                                value={editingRecord.newCheckInTime?.slice(0, 16)}
                                onChange={(e) =>
                                    setEditingRecord((prev) => ({ ...prev, newCheckInTime: e.target.value }))
                                }
                                className="border rounded px-2 py-1"
                                />
                            ) : (
                                formatDateTime(record.check_in_time)
                            )}
                            </td>
                            <td className="border border-white px-4 py-2 text-white">
                            {editingRecord && editingRecord.user_id === record.user_id && editingRecord.source_id === record.source_id ? (
                                <input
                                type="datetime-local"
                                value={editingRecord.newCheckOutTime?.slice(0, 16)}
                                onChange={(e) =>
                                    setEditingRecord((prev) => ({ ...prev, newCheckOutTime: e.target.value }))
                                }
                                className="border rounded px-2 py-1"
                                />
                            ) : (
                                formatDateTime(record.check_out_time)
                            )}
                            </td>
                            <td className="border border-white px-4 py-2 text-white">{record.is_paid ? '✅' : '❌'}</td>
                            <td className="border border-white px-4 py-2 text-white">
                            {editingRecord && editingRecord.user_id === record.user_id && editingRecord.source_id === record.source_id ? (
                                <div className="space-x-2">
                                <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={handleSave}>Save</button>
                                <button className="bg-gray-400 text-white px-2 py-1 rounded" onClick={handleCancel}>Cancel</button>
                                </div>
                            ) : (
                                <div className="space-x-2">
                                <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={() => handleEdit(record)}>Edit</button>
                                <button className="bg-purple-600 text-white px-2 py-1 rounded" onClick={() => handlePay(record)}>Pay</button>
                                </div>
                            )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>

            </div>
        </div>
    );
};

export default GigAttendance;
