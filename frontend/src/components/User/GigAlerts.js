import React, { useEffect, useState } from 'react';
import { applicationKey, isIPhoneBrowser, isInstalled, pushSupported } from '../../visitorNotifications';
import { disableGigPush, gigPushRequest, registerGigWorker } from '../../gigNotifications';
import '../Admin/VisitorAlerts.css';

export default function GigAlerts() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [setup, setSetup] = useState(null);
  const [message, setMessage] = useState('Checking gig notifications…');
  const supported = pushSupported();
  const needsInstall = isIPhoneBrowser() && !isInstalled();
  useEffect(() => {
    if (!supported || needsInstall) { setBusy(false); setMessage(''); return; }
    let stopped = false;
    let refreshing = false;
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const [config, registration] = await Promise.all([gigPushRequest('/config', undefined, 'GET'), registerGigWorker()]);
        let subscription = await registration.pushManager.getSubscription();
        if (subscription?.options?.applicationServerKey && Array.from(new Uint8Array(subscription.options.applicationServerKey)).join(',') !== Array.from(applicationKey(config.publicKey)).join(',')) {
          await subscription.unsubscribe(); subscription = null;
        }
        if (stopped) return;
        const status = subscription && Notification.permission === 'granted'
          ? await gigPushRequest('/status', { endpoint: subscription.endpoint }) : { enabled: false };
        // Refresh only a subscription already owned by this signed-in account.
        // Browser permission alone must never opt another account into alerts.
        if (status.enabled && !stopped) await gigPushRequest('/subscription', { subscription: subscription.toJSON() });
        if (!stopped) {
          setSetup({ registration, publicKey: config.publicKey });
          setEnabled(status.enabled);
          setMessage('');
        }
      } catch (error) { if (!stopped) setMessage(error.message); }
      finally { refreshing = false; if (!stopped) setBusy(false); }
    }
    refresh();
    window.addEventListener('focus', refresh);
    return () => { stopped = true; window.removeEventListener('focus', refresh); };
  }, [supported, needsInstall]);
  async function enable() {
    setBusy(true); setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Allow notifications in your phone or browser settings, then try again.');
      const subscription = await setup.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(setup.publicKey) });
      await gigPushRequest('/subscription', { subscription: subscription.toJSON() });
      setEnabled(true); setMessage('New gig alerts are enabled on this device.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true);
    try { await disableGigPush(); setEnabled(false); setMessage('Gig alerts are off on this device.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function test() {
    setBusy(true);
    try {
      const subscription = await setup.registration.pushManager.getSubscription();
      if (!subscription) throw new Error('Enable gig notifications first.');
      await gigPushRequest('/test', { endpoint: subscription.endpoint });
      setMessage('Test sent. Check your phone’s notifications.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <section className="visitor-alerts gig-alerts" aria-label="New gig notifications">
    <strong>New gig notifications</strong>
    <p>Get a phone notification when a new gig is posted. Tap the alert to view available gigs. Emails will still arrive.</p>
    {needsInstall ? <p>On iPhone or iPad: open the portal in Safari, tap Share → Add to Home Screen, then open Ready from your Home Screen and enable gig notifications here. Requires iOS 16.4 or later.</p>
      : !supported ? <p>Use a browser that supports push notifications over HTTPS to enable gig alerts.</p>
      : <div className="visitor-alert-actions">
        <span className={enabled ? 'visitor-alert-on' : ''}>{enabled ? 'On for this device' : 'Off for this device'}</span>
        <button type="button" disabled={busy || (!enabled && !setup)} onClick={enabled ? disable : enable}>{enabled ? 'Turn off gig alerts' : 'Enable gig notifications'}</button>
        {enabled && <button type="button" disabled={busy} onClick={test}>Send test notification</button>}
      </div>}
    {enabled && <p>Alerts work with the app closed. Logging out turns alerts off on this device; sign in and enable them again to resume.</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
