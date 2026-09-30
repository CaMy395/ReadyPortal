import React, { useState } from 'react';
import PasswordInput from './PasswordInput';
import { API_BASE_URL } from '../apiConfig';

export default function ProfilePasswordForm({ userId }) {
  const [fields, setFields] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event) {
    event.preventDefault(); setError(''); setSuccess('');
    if (fields.next.length < 8) return setError('Use at least 8 characters for your new password.');
    if (fields.next !== fields.confirm) return setError('Your new passwords do not match.');
    if (fields.next === fields.current) return setError('Choose a password different from your current password.');
    setBusy(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/password`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: fields.current, newPassword: fields.next }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to change your password.');
      setFields({ current: '', next: '', confirm: '' });
      setSuccess('Password changed. Use your new password the next time you sign in.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <section className="profile-card" id="profile-security">
    <span className="profile-eyebrow">ACCOUNT SECURITY</span>
    <h3>Change password</h3>
    <p className="profile-muted">Keep your account yours. Confirm your current password and choose a new one with at least 8 characters.</p>
    <form onSubmit={submit}>
      <div className="profile-fields">
        {[['current', 'Current password'], ['next', 'New password'], ['confirm', 'Confirm new password']].map(([key, label]) => <label key={key}>
          <span>{label}</span>
          <PasswordInput aria-label={label} visibilityLabel={label.toLowerCase()} autoComplete={key === 'current' ? 'current-password' : 'new-password'} value={fields[key]} onChange={e => setFields({ ...fields, [key]: e.target.value })} required disabled={busy} />
        </label>)}
      </div>
      {error && <p className="profile-message error" role="alert">{error}</p>}
      {success && <p className="profile-message success" role="status">{success}</p>}
      <button className="profile-primary" disabled={busy} type="submit">{busy ? 'Updating password…' : 'Update password'}</button>
    </form>
  </section>;
}
