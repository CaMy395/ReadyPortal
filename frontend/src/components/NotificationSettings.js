import React, { useEffect, useState } from 'react';
import GigAlerts from './User/GigAlerts';
import VisitorAlerts from './Admin/VisitorAlerts';
import { gigPushRequest } from '../gigNotifications';

const options = [
  ['new_gigs', 'New gig opportunities', 'Push alerts when a new gig you can claim is posted.'],
  ['gig_reminders', 'Upcoming claimed gigs', 'A reminder 24 hours before your claimed gig starts.'],
  ['clock_in_reminders', 'Clock-in reminders', 'A reminder at the gig start time if you have not clocked in.'],
];
export default function NotificationSettings({ role }) {
  const [preferences, setPreferences] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setMessage('');
    gigPushRequest('/preferences', undefined, 'GET').then(values => {
      if (active) setPreferences(values);
    }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [retry]);
  async function change(key, checked) {
    setBusy(true); setMessage('');
    try {
      const saved = await gigPushRequest('/preferences', { ...preferences, [key]: checked }, 'PUT');
      setPreferences(saved); setMessage('Notification settings saved.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <section className="profile-card" aria-label="Notification settings">
    <h3>Notifications</h3>
    <p>Choose your alerts, then enable push notifications on each device you want to use. Your choices apply across your devices. Gig times use Eastern time.</p>
    {preferences ? <div className="notification-options">{options.map(([key, title, description]) =>
      <label key={key} className="notification-option">
        <input type="checkbox" checked={preferences[key]} disabled={busy} onChange={event => change(key, event.target.checked)} />
        <span><strong>{title}</strong><small>{description}</small></span>
      </label>)}</div> : <p>{message ? 'Could not load your notification choices.' : 'Loading notification choices…'}</p>}
    {!preferences && message && <button type="button" onClick={() => setRetry(value => value + 1)}>Try again</button>}
    {message && <p role="status">{message}</p>}
    <GigAlerts />
    {role === 'admin' && <VisitorAlerts />}
    <p>These settings control phone push notifications. Existing operational emails continue.</p>
  </section>;
}
