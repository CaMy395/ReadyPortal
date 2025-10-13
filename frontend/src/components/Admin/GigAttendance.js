import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';

const GigAttendance = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // ===== Table state =====
  const [attendanceData, setAttendanceData] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);

  // ===== Add Attendance form state =====
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAttendance, setNewAttendance] = useState({
    type: 'gig',       // 'gig' | 'appointment'
    sourceId: '',      // selected gig/appointment id
    username: '',      // selected staff username (for check-in/out)
    userId: null,      // selected staff id (for PATCH)
    checkIn: '',       // 'YYYY-MM-DDTHH:mm'
    checkOut: ''       // 'YYYY-MM-DDTHH:mm'
  });

  // Unattended event options
  const [unattendedOptions, setUnattendedOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Users (staff) options
  const [usersOptions, setUsersOptions] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // ===== Helpers =====
  const toISOFromLocalNY = (val) => {
    if (!val) return null;
    return moment.tz(val, 'America/New_York').toISOString();
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    return moment(value).tz('America/New_York').format('MMM D, YYYY h:mm A');
  };

  // hourly rate: appointments fixed at $25, gigs use record.pay
const getRate = (r) => (r?.type === 'appointment' ? 25 : Number(r?.pay || 0));

const computePay = (r) => {
  const cin = r?.check_in_time ? new Date(r.check_in_time) : null;
  const cout = r?.check_out_time ? new Date(r.check_out_time) : null;
  const rate = getRate(r);

  if (!cin || !cout || isNaN(cin) || isNaN(cout)) {
    return { hours: null, rate, total: null };
  }

  const ms = cout - cin;
  if (ms <= 0) return { hours: 0, rate, total: 0 };

  const hours = ms / (1000 * 60 * 60);
  const total = hours * rate;
  return { hours, rate, total };
};

  // Parse safe NY datetime from separate date/time strings
  const parseNY = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const t = (timeStr || '').trim();
    const tNorm = t.length === 5 ? `${t}:00` : (t.length === 8 ? t : '00:00:00'); // HH:mm -> HH:mm:00
    const m = moment.tz(`${dateStr} ${tNorm}`, 'YYYY-MM-DD HH:mm:ss', 'America/New_York', true);
    if (m.isValid()) return m;
    const mDateOnly = moment.tz(dateStr, 'YYYY-MM-DD', 'America/New_York', true);
    return mDateOnly.isValid() ? mDateOnly : null;
  };

  // Replace parseNY with a simple formatter that avoids moment.tz()
const formatEventWhen = (dateStr, timeStr) => {
  if (!dateStr) return '';
  const t = (timeStr || '').trim();
  const tNorm = t.length === 5 ? `${t}:00` : (t.length === 8 ? t : '00:00:00'); // HH:mm -> HH:mm:00
  const iso = `${dateStr}T${tNorm}`;
  const m = moment(iso); // parse as browser local (you’re in ET)
  if (!m.isValid()) return dateStr;
  return timeStr ? m.format('MMM D, YYYY @ h:mm A') : m.format('MMM D, YYYY');
};

  const eventOptionLabel = (item) => {
  const { title, client_name, date, time, location } = item;
  const when = formatEventWhen(date, time);
  return `${title || 'Untitled'} • ${client_name || 'No Client'}${when ? ` • ${when}` : ''}${location ? ` • ${location}` : ''}`;
};


  // ===== Load attendance table =====
  const fetchAttendance = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/attendance`);
      const sortedData = response.data.sort(
        (a, b) => new Date(b.event_date) - new Date(a.event_date)
      );

      const fixedData = sortedData.map((item) => ({
        ...item,
        source_id: item.source_id, // for stable keys
        gig_id: item.type === 'gig' ? item.source_id : undefined,
        appointment_id: item.type === 'appointment' ? item.source_id : undefined,
      }));

      setAttendanceData(fixedData);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // ===== Load unattended options when form opens or type changes =====
  useEffect(() => {
    if (!showAddForm) return;

    (async () => {
      try {
        setLoadingOptions(true);
        const url =
          newAttendance.type === 'gig'
            ? `${API_BASE_URL}/gigs/unattended-mix`   // 3 past + 2 upcoming unattended gigs
            : `${API_BASE_URL}/appointments/unattended`;

        const { data } = await axios.get(url);
        setUnattendedOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load unattended options', e);
        setUnattendedOptions([]);
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, [showAddForm, newAttendance.type, API_BASE_URL]);

  // ===== Load users list when form opens =====
  useEffect(() => {
    if (!showAddForm) return;
    (async () => {
      try {
        setUsersLoading(true);
        const { data } = await axios.get(`${API_BASE_URL}/users`);
        // Expect fields: id, username, full_name (or name)
        setUsersOptions(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Failed to load users', e);
        setUsersOptions([]);
      } finally {
        setUsersLoading(false);
      }
    })();
  }, [showAddForm, API_BASE_URL]);

  // ===== Add Attendance handler =====
  const handleAddAttendance = async () => {
    try {
      const { type, sourceId, username, userId, checkIn, checkOut } = newAttendance;
      if (!type || !sourceId || !username) {
        alert('Type, Event, and Staff are required.');
        return;
      }

      // 1) Create/ensure attendance via check-in (uses username)
      if (type === 'gig') {
        await axios.post(`${API_BASE_URL}/gigs/${sourceId}/check-in`, { username });
      } else {
        await axios.post(`${API_BASE_URL}/appointments/${sourceId}/check-in`, { username });
      }

      // 2) Optional immediate check-out
      if (checkOut) {
        if (type === 'gig') {
          await axios.post(`${API_BASE_URL}/gigs/${sourceId}/check-out`, { username });
        } else {
          await axios.post(`${API_BASE_URL}/appointments/${sourceId}/check-out`, { username });
        }
      }

      // 3) Overwrite times if provided (prefer selected userId; fallback lookup)
      if (checkIn || checkOut) {
        let targetUserId = userId;
        if (!targetUserId) {
          const usersRes = await axios.get(`${API_BASE_URL}/users`);
          const users = usersRes.data || [];
          const u = users.find(
            (x) => String(x.username).toLowerCase() === String(username).toLowerCase()
          );
          targetUserId = u?.id ?? null;
        }

        if (targetUserId) {
          const payload = {
            check_in_time: toISOFromLocalNY(checkIn),
            check_out_time: toISOFromLocalNY(checkOut),
          };

          if (type === 'gig') {
            await axios.patch(`${API_BASE_URL}/api/gigs/${sourceId}/attendance/${targetUserId}`, payload);
          } else {
            try {
              await axios.patch(`${API_BASE_URL}/appointments/${sourceId}/attendance/${targetUserId}`, payload);
            } catch (e) {
              console.warn('No appointment-attendance edit route; skipping manual time update.');
            }
          }
        } else {
          console.warn('Could not resolve userId for manual time overwrite.');
        }
      }

      await fetchAttendance();
      setNewAttendance({ type: 'gig', sourceId: '', username: '', userId: null, checkIn: '', checkOut: '' });
      setShowAddForm(false);
      alert('Attendance added.');
    } catch (err) {
      console.error('Error adding attendance:', err);
      alert('❌ Failed to add attendance.');
    }
  };

  // ===== Pay / Edit existing =====
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

      if (record.type === 'gig' && record.gig_id) {
        await axios.patch(`${API_BASE_URL}/api/gigs/${record.gig_id}/attendance/${userId}/pay`);
      } else if (record.type === 'appointment' && record.appointment_id) {
        await axios.patch(`${API_BASE_URL}/appointments/${record.appointment_id}/attendance/${userId}/pay`);
      } else {
        console.error('Missing gig_id or appointment_id in record:', record);
        alert('Unable to determine event type or ID for payment.');
        return;
      }

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
    setEditingRecord({
      ...record,
      newCheckInTime: record.check_in_time,
      newCheckOutTime: record.check_out_time,
    });
  };

  const handleSave = async () => {
    const { user_id, newCheckInTime, newCheckOutTime, gig_id, appointment_id, type } = editingRecord;
    const targetId = type === 'gig' ? gig_id : appointment_id;

    const isoCheckIn = new Date(newCheckInTime).toISOString();
    const isoCheckOut = new Date(newCheckOutTime).toISOString();

    try {
      const endpoint =
        type === 'gig'
          ? `${API_BASE_URL}/api/gigs/${targetId}/attendance/${user_id}`
          : `${API_BASE_URL}/appointments/${targetId}/attendance/${user_id}`;

      await axios.patch(endpoint, {
        check_in_time: isoCheckIn,
        check_out_time: isoCheckOut,
      });

      setAttendanceData((prevData) =>
        prevData.map((r) =>
          r.user_id === user_id &&
          ((type === 'gig' && r.gig_id === targetId) || (type === 'appointment' && r.appointment_id === targetId))
            ? { ...r, check_in_time: isoCheckIn, check_out_time: isoCheckOut }
            : r
        )
      );

      setEditingRecord(null);
    } catch (err) {
      console.error('❌ Error saving edited times:', err);
    }
  };

  const handleCancel = () => setEditingRecord(null);

  return (
    <div className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">Gig & Appointment Attendance</h2>
        <button
          className="bg-green-600 text-white px-3 py-2 rounded"
          onClick={() => {
            setShowAddForm((s) => !s);
            if (!showAddForm) {
              setNewAttendance({ type: 'gig', sourceId: '', username: '', userId: null, checkIn: '', checkOut: '' });
            }
          }}
        >
          {showAddForm ? 'Close' : 'Add Attendance'}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 rounded border border-white bg-[#111] text-white">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {/* Type */}
            <div>
              <label className="block text-sm mb-1">Type</label>
              <select
                className="w-full bg-black border border-white rounded p-2"
                value={newAttendance.type}
                onChange={(e) => setNewAttendance((p) => ({ ...p, type: e.target.value, sourceId: '' }))}
              >
                <option value="gig">Gig</option>
                <option value="appointment">Appointment</option>
              </select>
            </div>

            {/* Event dropdown */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">
                {newAttendance.type === 'gig' ? 'Select Unattended Gig' : 'Select Unattended Appointment'}
              </label>
              <select
                className="w-full bg-black border border-white rounded p-2"
                value={newAttendance.sourceId}
                onChange={(e) => setNewAttendance((p) => ({ ...p, sourceId: e.target.value }))}
                disabled={loadingOptions}
              >
                <option value="">{loadingOptions ? 'Loading…' : '— Select —'}</option>
                {unattendedOptions.map((item) => (
                  <option key={`${newAttendance.type}-${item.id}`} value={item.id}>
                    {eventOptionLabel(item)}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff dropdown */}
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Staff</label>
              <select
                className="w-full bg-black border border-white rounded p-2"
                value={newAttendance.userId || ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  const u = usersOptions.find((x) => x.id === id);
                  setNewAttendance((p) => ({
                    ...p,
                    userId: id,
                    username: u?.username || '',
                  }));
                }}
                disabled={usersLoading}
              >
                <option value="">{usersLoading ? 'Loading…' : '— Select —'}</option>
                {usersOptions.map((u) => {
                  const display = u.full_name || u.name || u.username || 'Unnamed';
                  return (
                    <option key={`user-${u.id}`} value={u.id}>
                      {display} @{u.username}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Check-in */}
            <div>
              <label className="block text-sm mb-1">Check-In (optional)</label>
              <input
                className="w-full bg-black border border-white rounded p-2"
                type="datetime-local"
                value={newAttendance.checkIn}
                onChange={(e) => setNewAttendance((p) => ({ ...p, checkIn: e.target.value }))}
              />
            </div>

            {/* Check-out */}
            <div>
              <label className="block text-sm mb-1">Check-Out (optional)</label>
              <input
                className="w-full bg-black border border-white rounded p-2"
                type="datetime-local"
                value={newAttendance.checkOut}
                onChange={(e) => setNewAttendance((p) => ({ ...p, checkOut: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4">
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleAddAttendance}>
              Save Attendance
            </button>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto border-collapse border border-white">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="border border-white px-4 py-2">Name</th>
              <th className="border border-white px-4 py-2">Client</th>
              <th className="border border-white px-4 py-2">Event Type</th>
              <th className="border border-white px-4 py-2">Check-In</th>
              <th className="border border-white px-4 py-2">Check-Out</th>
              <th className="border border-white px-4 py-2">Pay</th>
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
                  {editingRecord &&
                  editingRecord.user_id === record.user_id &&
                  editingRecord.source_id === record.source_id ? (
                    <input
                      type="datetime-local"
                      value={moment(editingRecord.newCheckInTime).tz('America/New_York').format('YYYY-MM-DDTHH:mm')}
                      onChange={(e) => setEditingRecord((prev) => ({ ...prev, newCheckInTime: e.target.value }))}
                      className="border rounded px-2 py-1"
                    />
                  ) : (
                    formatDateTime(record.check_in_time)
                  )}
                </td>
                <td className="border border-white px-4 py-2 text-white">
                  {editingRecord &&
                  editingRecord.user_id === record.user_id &&
                  editingRecord.source_id === record.source_id ? (
                    <input
                      type="datetime-local"
                      value={moment(editingRecord.newCheckOutTime).tz('America/New_York').format('YYYY-MM-DDTHH:mm')}
                      onChange={(e) => setEditingRecord((prev) => ({ ...prev, newCheckOutTime: e.target.value }))}
                      className="border rounded px-2 py-1"
                    />
                  ) : (
                    formatDateTime(record.check_out_time)
                  )}
                </td>
                <td className="border border-white px-4 py-2 text-white">
  {(() => {
    const { hours, rate, total } = computePay(record);
    if (total == null) return '—';
    return `$${total.toFixed(2)} (${(hours ?? 0).toFixed(2)}h × $${rate.toFixed(2)}/h)`;
  })()}
</td>

                <td className="border border-white px-4 py-2 text-white">{record.is_paid ? '✅' : '❌'}</td>
                <td className="border border-white px-4 py-2 text-white">
                  {editingRecord &&
                  editingRecord.user_id === record.user_id &&
                  editingRecord.source_id === record.source_id ? (
                    <div className="space-x-2">
                      <button className="bg-green-500 text-white px-2 py-1 rounded" onClick={handleSave}>Save</button>
                      <button className="bg-gray-400 text-white px-2 py-1 rounded" onClick={handleCancel}>Cancel</button>
                    </div>
                  ) : (
                    <div className="space-x-2">
                      <button className="bg-blue-500 text-white px-2 py-1 rounded" onClick={() => setEditingRecord({ ...record, newCheckInTime: record.check_in_time, newCheckOutTime: record.check_out_time })}>Edit</button>
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
