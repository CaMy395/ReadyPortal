import { API_BASE_URL } from './apiConfig';

export const gigWorkerScope = '/staff-gig-notifications/';
let registrationPromise;
export function registerGigWorker() {
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register('/staff-gig-push-sw.js', { scope: gigWorkerScope }).then(registration => {
      if (registration.active) return registration;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Gig notification setup timed out. Reload and try again.')), 15000);
        const worker = registration.installing || registration.waiting;
        if (!worker) { clearTimeout(timer); reject(new Error('Reload to finish notification setup.')); return; }
        const changed = () => {
          if (worker.state === 'activated') { clearTimeout(timer); resolve(registration); }
          if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('Notification setup failed. Try again.')); }
        };
        worker.addEventListener('statechange', changed);
        changed();
      });
    });
    registrationPromise.catch(() => { registrationPromise = undefined; });
  }
  return registrationPromise;
}
export async function gigPushRequest(path, body, method = 'POST') {
  const response = await fetch(`${API_BASE_URL}/api/gig-push${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to update gig notifications.');
  return data;
}
export async function disableGigPush({ logout = false } = {}) {
  if (!('serviceWorker' in navigator)) return;
  const token = localStorage.getItem('internalAuthToken');
  // Capture identity immediately; App clears it while browser cleanup runs.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  const serverLogout = logout && token ? fetch(`${API_BASE_URL}/api/gig-push/logout`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true, signal: controller.signal,
  }).catch(() => {}).finally(() => clearTimeout(timer)) : Promise.resolve().then(() => clearTimeout(timer));
  try {
    const registration = await navigator.serviceWorker.getRegistration(gigWorkerScope);
    const subscription = await registration?.pushManager?.getSubscription();
    if (!logout && subscription && token) await gigPushRequest('/subscription', { endpoint: subscription.endpoint }, 'DELETE');
    if (subscription) await subscription.unsubscribe();
    (await registration?.getNotifications())?.forEach(notification => notification.close());
  } finally { await serverLogout; }
}
