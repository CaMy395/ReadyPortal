import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../apiConfig';

export default function BankingMfa({ children }) {
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [reset, setReset] = useState(false);
  const [codes, setCodes] = useState(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function request(path, body) {
    const response = await fetch(`${API_BASE_URL}/api/mfa/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to verify banking access.');
    return data;
  }
  async function refresh() {
    try {
      const data = await request('status');
      setStatus(data);
      if (!data.verified) sessionStorage.removeItem('readyBankingMfa');
    } catch (e) { setError(e.message); setStatus({ unavailable: true }); }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    const expired = () => setStatus(current => ({ ...current, verified: false }));
    window.addEventListener('ready:banking-mfa-required', expired);
    return () => { clearInterval(timer); window.removeEventListener('ready:banking-mfa-required', expired); };
    // The status endpoint uses the current signed-in session on every request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      if ((!status.enabled && !setup) || reset) {
        setSetup(await request(reset ? 'reset' : 'setup', { password, ...(reset ? { recoveryCode: code } : {}) }));
        setPassword(''); setCode(''); setReset(false); setRecovery(false);
      } else {
        const result = await request(setup ? 'confirm' : 'verify', recovery ? { recoveryCode: code } : { code });
        sessionStorage.setItem('readyBankingMfa', result.token);
        setCode(''); setSetup(null);
        if (result.recoveryCodes) setCodes(result.recoveryCodes);
        setStatus({ configured: true, enabled: true, verified: true });
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  if (status?.verified && !codes) return children;
  return <section style={{ maxWidth: 560, margin: '32px auto', padding: 24, background: '#fff', color: '#201b1b', border: '1px solid #ded6d0', borderRadius: 12 }}>
    <h2 style={{ color: '#201b1b' }}>Protect your banking access</h2>
    {!status && !error && <p>Checking verification…</p>}
    {error && <p role="alert">{error}</p>}
    {status?.unavailable && <button type="button" onClick={refresh}>Try again</button>}
    {status && !status.unavailable && !status.configured && <p>Banking verification needs a one-time server setup. Ask the site owner to configure MFA_ENCRYPTION_KEY in Render before enrolling an authenticator.</p>}
    {codes ? <>
      <h3 style={{ color: '#201b1b' }}>Save your recovery codes</h3>
      <p>Each code works once if you lose your authenticator. Keep these in your password manager. They are only shown now.</p>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{codes.join('\n')}</pre>
      <label><input type="checkbox" checked={saved} onChange={e => setSaved(e.target.checked)} /> I have saved these recovery codes.</label>
      <p><button type="button" disabled={!saved} onClick={() => setCodes(null)}>Continue to banking</button></p>
    </> : status?.configured && <form onSubmit={submit}>
      {setup ? <>
        <p>Scan this QR code with your authenticator app, then enter its six-digit code. Setup expires after 10 minutes.</p>
        <img src={setup.qr} alt="Scan to add Ready Bartending to your authenticator" width="220" height="220" />
        <p>Manual setup key: <code style={{ overflowWrap: 'anywhere' }}>{setup.secret}</code></p>
      </> : <p>{!status.enabled ? 'Confirm your Ready password to set up an authenticator app.' : reset ? 'Use your Ready password and an unused recovery code to replace a lost authenticator.' : 'Enter an authenticator code to unlock banking for 30 minutes.'}</p>}
      {((!status.enabled && !setup) || reset) && <label style={{ display: 'block', marginBottom: 16 }}>Ready password
        <input style={{ display: 'block', width: '100%' }} type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
      </label>}
      {(setup || status.enabled || reset) && <label style={{ display: 'block', marginBottom: 16 }}>{recovery || reset ? 'Recovery code' : 'Authenticator code'}
        <input style={{ display: 'block', width: '100%' }} autoComplete="one-time-code" inputMode={recovery || reset ? 'text' : 'numeric'} value={code} onChange={e => setCode(e.target.value.trim())} required maxLength={recovery || reset ? 30 : 6} pattern={recovery || reset ? undefined : '[0-9]{6}'} />
      </label>}
      <button disabled={busy} type="submit">{busy ? 'Checking…' : setup ? 'Enable authenticator' : (!status.enabled || reset) ? 'Set up authenticator' : 'Verify'}</button>
      {status.enabled && !setup && <p>
        <button type="button" disabled={busy} onClick={() => { setRecovery(!recovery); setReset(false); setCode(''); }}>{recovery ? 'Use authenticator code' : 'Use a recovery code'}</button>{' '}
        <button type="button" disabled={busy} onClick={() => { setReset(!reset); setRecovery(false); setCode(''); }}>{reset ? 'Cancel replacement' : 'Replace lost authenticator'}</button>
      </p>}
      {setup && <p><button type="button" disabled={busy} onClick={() => { setSetup(null); setStatus(s => ({ ...s, enabled: false })); setCode(''); }}>Restart setup</button></p>}
    </form>}
  </section>;
}
