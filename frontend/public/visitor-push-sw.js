/* Push notifications only: no caching of admin, banking, or public pages. */
/* global self, clients */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
function adminDestination(value) {
  return typeof value === 'string' && /^\/admin\/live-visitors\?visitor=[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value : '/admin/dashboard';
}
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Still display a visible notification. */ }
  event.waitUntil(self.registration.showNotification(payload.title || 'Ready Bartending', {
    body: payload.body || 'You have a new Ready notification.',
    icon: '/RB_Logo_192.png', badge: '/RB_Logo_192.png',
    tag: payload.tag || 'ready-visitor', data: { url: adminDestination(payload.url) },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL(adminDestination(event.notification.data?.url), self.location.origin).href;
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const window of windows) {
      if (new URL(window.url).origin === self.location.origin) {
        await window.navigate(url); return window.focus();
      }
    }
    return clients.openWindow(url);
  })());
});
