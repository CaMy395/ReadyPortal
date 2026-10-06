import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationKey, disableVisitorPush, isIPhoneBrowser, isInstalled, pushRequest, pushSupported, registerPushWorker } from '../../visitorNotifications';
import './VisitorAlerts.css';

export default function VisitorAlerts() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState('Checking notifications…');
  const [setup, setSetup] = useState(null);
  const needsInstall = isIPhoneBrowser() && !isInstalled();
  const supported = pushSupported();
  useEffect(() => {
    if (!supported || needsInstall) { setBusy(false); setMessage(''); return; }
    let stopped = false;
    const refresh = async () => {
      try {
        const [config, registration] = await Promise.all([pushRequest('/config', undefined, 'GET'), registerPushWorker()]);
        let subscription = await registration.pushManager.getSubscription();
        // The browser may retain a subscription from a previous server key.
        if (subscription?.options?.applicationServerKey
          && Array.from(new Uint8Array(subscription.options.applicationServerKey)).join(',') !== Array.from(applicationKey(config.publicKey)).join(',')) {
          await subscription.unsubscribe(); subscription = null;
        }
        if (stopped) return;
        if (subscription && Notification.permission === 'granted') await pushRequest('/subscription', { subscription: subscription.toJSON() });
        if (!stopped) {
          setSetup({ registration, publicKey: config.publicKey });
          setEnabled(Boolean(subscription && Notification.permission === 'granted'));
          setMessage('');
        }
      } catch (error) { if (!stopped) setMessage(error.message); }
      finally { if (!stopped) setBusy(false); }
    };
    refresh();
    window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 5 * 60 * 1000);
    return () => { stopped = true; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [supported, needsInstall]);

  const enable = async () => {
    setBusy(true); setMessage('');
    try {
      // Called directly from the tap handler for iOS's user gesture requirement.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Allow notifications in your phone or browser settings, then try again.');
      const subscription = await setup.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationKey(setup.publicKey) });
      await pushRequest('/subscription', { subscription: subscription.toJSON() });
      setEnabled(true); setMessage('Visitor alerts are enabled on this device.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try { await disableVisitorPush(); setEnabled(false); setMessage('Visitor alerts are off on this device.'); }
    catch (error) { setEnabled(false); setMessage(error.message); }
    finally { setBusy(false); }
  };
  const test = async () => {
    setBusy(true);
    try {
      const subscription = await setup.registration.pushManager.getSubscription();
      if (!subscription) throw new Error('Enable notifications on this device first.');
      await pushRequest('/test', { endpoint: subscription.endpoint });
      setMessage('Test sent. Check your phone’s notifications.');
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  };
  return <section className="visitor-alerts" aria-label="Visitor notifications">
    <div><strong>Visitor notifications</strong><p>Get a phone notification when someone arrives or sends a chat message, including anonymous visitors. Tap an alert to open their conversation.</p><Link to="/admin/live-visitors">See live visitors & chat</Link></div>
    {needsInstall ? <p>On iPhone or iPad: open this site in Safari, tap Share → Add to Home Screen, then open the Ready app from your Home Screen and enable notifications here. Requires iOS 16.4 or later.</p>
      : !supported ? <p>Use a browser that supports push notifications over HTTPS to enable phone alerts.</p>
      : <div className="visitor-alert-actions"><span className={enabled ? 'visitor-alert-on' : ''}>{enabled ? 'On for this device' : 'Off for this device'}</span>
        <button type="button" disabled={busy || (!enabled && !setup)} onClick={enabled ? disable : enable}>{enabled ? 'Turn off' : 'Enable visitor notifications'}</button>
        {enabled && <button type="button" disabled={busy} onClick={test}>Send test notification</button>}
      </div>}
    {enabled && <p>Alerts continue while your admin session is valid, even with the app closed. Sign in again when your session expires. Logging out turns alerts off on this device.</p>}
    {message && <p role="status">{message}</p>}
  </section>;
}
