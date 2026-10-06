import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

test('service worker displays background pushes and opens the protected admin page on tap', async () => {
  const handlers = {}, shown = [], opened = [];
  const context = {
    URL, clients: { matchAll: async () => [], openWindow: async url => opened.push(url) },
    self: { location: { origin: 'https://readybartending.com' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      skipWaiting: async () => {}, clients: { claim: async () => {} },
      registration: { showNotification: async (...args) => shown.push(args) },
    },
  };
  vm.runInNewContext(fs.readFileSync(new URL('../../frontend/public/visitor-push-sw.js', import.meta.url), 'utf8'), context);
  let pending;
  handlers.push({ data: { json: () => ({ title: 'Someone is on the Ready site', body: 'Anonymous visitor opened weddings.', tag: 'visit-123', url: 'https://evil.test' }) }, waitUntil: task => { pending = task; } });
  await pending;
  assert.equal(shown[0][0], 'Someone is on the Ready site');
  assert.equal(shown[0][1].body, 'Anonymous visitor opened weddings.');
  assert.equal(shown[0][1].data.url, '/admin/dashboard');
  let closed = false;
  handlers.notificationclick({ notification: { close: () => { closed = true; } }, waitUntil: task => { pending = task; } });
  await pending;
  assert.equal(closed, true);
  assert.deepEqual(opened, ['https://readybartending.com/admin/dashboard']);
  handlers.push({ data: { json: () => { throw new Error('Bad payload'); } }, waitUntil: task => { pending = task; } });
  await pending;
  assert.equal(shown[1][0], 'Ready Bartending');
  assert.equal(handlers.fetch, undefined); // Never intercept or cache private app requests.
  const thread='/admin/live-visitors?visitor=12345678-1234-4234-8234-123456789012';
  handlers.push({ data:{ json:() => ({ title:'Visitor',url:thread }) },waitUntil:task => { pending=task; } });
  await pending;
  assert.equal(shown[2][1].data.url,thread);
  handlers.notificationclick({ notification:{ data:{ url:thread },close:() => {} },waitUntil:task => { pending=task; } });
  await pending;
  assert.equal(opened[1],`https://readybartending.com${thread}`);
});
