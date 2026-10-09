/* global self, clients */
/* A separate registration keeps staff gig alerts independent of visitor alerts. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
function gigDestination(value) {
  return ['/user', '/user/your-gigs', '/student/gigs', '/student/mygigs', '/admin/upcoming-gigs'].includes(value) ? value : '/user';
}
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Always show a visible notification. */ }
  event.waitUntil(self.registration.showNotification(payload.title || 'Ready gig alert', {
    body: payload.body || 'A new gig is available. Open the portal to see the details.',
    icon: '/RB_Logo_192.png', badge: '/RB_Logo_192.png',
    tag: payload.tag || 'ready-gig', data: { url: gigDestination(payload.url) },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL(gigDestination(event.notification.data?.url), self.location.origin).href;
    for (const window of await clients.matchAll({ type: 'window', includeUncontrolled: true })) {
      if (new URL(window.url).origin === self.location.origin) {
        await window.navigate(url);
        return window.focus();
      }
    }
    return clients.openWindow(url);
  })());
});
