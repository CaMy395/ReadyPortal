import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Clock3, Plus, Trash2 } from 'lucide-react';
import appointmentTypes from '../../data/appointmentTypes.json';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const displayTime = (time) => {
  if (!time) return '—';
  const [hours, minutes] = String(time).split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export default function AdminAvailabilityPage() {
  const [form, setForm] = useState({ weekday: '', startTime: '', endTime: '', appointmentType: '' });
  const [availability, setAvailability] = useState([]);
  const [filters, setFilters] = useState({ weekday: '', appointmentType: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });
  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${apiUrl}/admin-availability`);
      setAvailability(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      setStatus({ type: 'error', message: 'Availability could not be loaded.' });
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

  const filtered = useMemo(() => availability.filter((slot) => (!filters.weekday || slot.weekday === filters.weekday) && (!filters.appointmentType || slot.appointment_type === filters.appointmentType)), [availability, filters]);
  const grouped = useMemo(() => filtered.reduce((result, slot) => { const key = slot.appointment_type || 'General'; (result[key] ||= []).push(slot); return result; }, {}), [filtered]);

  const addAvailability = async (event) => {
    event.preventDefault();
    if (!form.weekday || !form.startTime || !form.endTime || !form.appointmentType) return setStatus({ type: 'error', message: 'Complete every field before adding a time window.' });
    if (form.endTime <= form.startTime) return setStatus({ type: 'error', message: 'End time must be later than start time.' });
    try {
      setSaving(true); setStatus({ type: '', message: '' });
      await axios.post(`${apiUrl}/availability`, { weekday: form.weekday, start_time: form.startTime, end_time: form.endTime, appointment_type: form.appointmentType });
      setForm({ weekday: '', startTime: '', endTime: '', appointmentType: '' });
      setStatus({ type: 'success', message: 'Availability added.' });
      await fetchAvailability();
    } catch (error) {
      console.error('Error adding availability:', error);
      setStatus({ type: 'error', message: error.response?.data?.error || 'Availability could not be added.' });
    } finally { setSaving(false); }
  };

  const deleteAvailability = async (id) => {
    if (!window.confirm('Remove this availability window?')) return;
    try {
      await axios.delete(`${apiUrl}/admin-availability/${id}`);
      setAvailability((current) => current.filter((slot) => slot.id !== id));
      setStatus({ type: 'success', message: 'Availability removed.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.response?.data?.error || 'Availability could not be removed.' });
    }
  };

  return <main className="schedule-admin-workspace availability-workspace">
    <header className="schedule-admin-header"><div><span>SCHEDULE & EVENTS</span><h1>Weekly availability</h1><p>Control the appointment windows clients can select when booking.</p></div></header>
    {status.message && <div className={`schedule-admin-notice ${status.type}`}>{status.message}</div>}
    <section className="schedule-admin-panel"><div className="schedule-admin-panel-heading"><div><span>NEW WINDOW</span><h2>Add availability</h2></div><Plus /></div><form className="availability-form" onSubmit={addAvailability}><label>Weekday<select value={form.weekday} onChange={(event) => updateForm('weekday', event.target.value)}><option value="">Select day</option>{DAYS.map((day) => <option key={day}>{day}</option>)}</select></label><label>Start time<input type="time" value={form.startTime} onChange={(event) => updateForm('startTime', event.target.value)} /></label><label>End time<input type="time" value={form.endTime} onChange={(event) => updateForm('endTime', event.target.value)} /></label><label>Appointment type<select value={form.appointmentType} onChange={(event) => updateForm('appointmentType', event.target.value)}><option value="">Select type</option>{appointmentTypes.map((type) => <option key={type.title}>{type.title}</option>)}</select></label><button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add window'}</button></form></section>
    <section className="schedule-admin-panel"><div className="schedule-admin-panel-heading availability-list-heading"><div><span>CURRENT WINDOWS</span><h2>Published availability</h2></div><div className="availability-filters"><select value={filters.weekday} onChange={(event) => setFilters((current) => ({ ...current, weekday: event.target.value }))}><option value="">All days</option>{DAYS.map((day) => <option key={day}>{day}</option>)}</select><select value={filters.appointmentType} onChange={(event) => setFilters((current) => ({ ...current, appointmentType: event.target.value }))}><option value="">All appointment types</option>{appointmentTypes.map((type) => <option key={type.title}>{type.title}</option>)}</select></div></div>{loading ? <div className="schedule-admin-empty">Loading availability...</div> : Object.keys(grouped).length ? <div className="availability-groups">{Object.entries(grouped).map(([type, slots]) => <section key={type}><h3>{type}</h3>{slots.sort((a, b) => DAYS.indexOf(a.weekday) - DAYS.indexOf(b.weekday) || String(a.start_time).localeCompare(String(b.start_time))).map((slot) => <div className="availability-row" key={slot.id}><Clock3 /><strong>{slot.weekday}</strong><span>{displayTime(slot.start_time)} – {displayTime(slot.end_time)}</span><button type="button" onClick={() => deleteAvailability(slot.id)} title="Remove availability"><Trash2 /></button></div>)}</section>)}</div> : <div className="schedule-admin-empty">No availability matches these filters.</div>}</section>
  </main>;
}
