import { API_BASE_URL } from './apiConfig';

const workerPath = '/visitor-push-sw.js';
let registrationPromise;
export function pushSupported() {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
export function isIPhoneBrowser() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
}
export function registerPushWorker() {
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register(workerPath, { scope: '/' }).then(async registration => {
      if (registration.active) return registration;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Notification setup timed out. Please try again.')), 15000);
        const worker = registration.installing || registration.waiting;
        if (!worker) { clearTimeout(timer); reject(new Error('Reload the portal to finish notification setup.')); return; }
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') { clearTimeout(timer); resolve(registration); }
          if (worker.state === 'redundant') { clearTimeout(timer); reject(new Error('Notification setup failed. Please try again.')); }
        });
      });
    });
    registrationPromise.catch(() => { registrationPromise = undefined; });
  }
  return registrationPromise;
}
export async function pushRequest(path, body, method = 'POST') {
  const response = await fetch(`${API_BASE_URL}/api/push${path}`, {
    method, headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to update visitor notifications.');
  return data;
}
export function applicationKey(key) {
  const base64 = key.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64 + '='.repeat((4 - base64.length % 4) % 4)), char => char.charCodeAt(0));
}
export async function disableVisitorPush({ logout = false } = {}) {
  if (!('serviceWorker' in navigator)) return;
  const token = localStorage.getItem('internalAuthToken');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  // Start server removal before asynchronous browser work, while the session still exists.
  const serverLogout = logout && token ? fetch(`${API_BASE_URL}/api/push/logout`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, keepalive: true, signal: controller.signal,
  }).catch(() => {}).finally(() => clearTimeout(timer)) : Promise.resolve().then(() => clearTimeout(timer));
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager?.getSubscription();
  try {
    if (!logout && subscription && token) await pushRequest('/subscription', { endpoint: subscription.endpoint }, 'DELETE');
  } finally {
    if (subscription) await subscription.unsubscribe();
    const notifications = await registration?.getNotifications();
    notifications?.forEach(notification => notification.close());
    await serverLogout;
  }
}
