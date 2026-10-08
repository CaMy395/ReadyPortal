import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import vm from 'node:vm';
import fs from 'node:fs';
import { createGigPush, gigNotification } from './gigPush.js';

function subscription(id) {
  const ecdh = crypto.createECDH('prime256v1');
  return { endpoint: `https://fcm.googleapis.com/fcm/send/${id}`, keys: { p256dh: ecdh.generateKeys().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
}
function fixture() {
  const queries = [], sent = [];
  const staff = subscription('staff'), student = subscription('student'), expired = subscription('expired');
  const rows = [ { role: 'user', subscription: staff, endpoint: staff.endpoint }, { role: 'student', subscription: student, endpoint: student.endpoint }, { role: 'user', subscription: expired, endpoint: expired.endpoint } ];
  const pool = { query: async (sql, params) => {
    queries.push([sql, params]);
    if (sql.startsWith('SELECT s.endpoint')) return { rows };
    return { rows: [] };
  } };
  const sender = { sendNotification: async (sub, payload, options) => {
    if (sub.endpoint.endsWith('/expired')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
    sent.push({ sub, payload: JSON.parse(payload), options });
  } };
  const service = createGigPush(pool, { initialize: async () => ({ public_key: 'public', private_key: 'private' }) }, 'test-secret', sender);
  return { service, queries, sent, staff };
}
test('new gigs notify eligible opted-in staff and remove expired devices', async () => {
  const { service, sent, queries } = fixture();
  assert.equal(await service.send({ id: 42, position: 'Bartender', date: '2026-10-12', time: '17:00:00', pay: 25, client_email: 'private@example.com' }), 1);
  assert.equal(sent[0].payload.url, '/user');
  assert.equal(sent[0].payload.body, 'Bartender · 2026-10-12 · 17:00 · $25/hr');
  assert.ok(!JSON.stringify(sent).includes('private@example.com'));
  assert.equal(sent[0].options.TTL, 86400);
  const sql = queries.find(([sql]) => sql.startsWith('SELECT s.endpoint'))[0];
  assert.match(sql, /u.is_active IS DISTINCT FROM false/);
  assert.match(sql, /s.auth_epoch=\$1/);
  assert.match(sql, /staff_gig_push_logouts/);
  assert.ok(!sql.includes('expires_at>NOW()')); // Device opt-in survives session expiry.
  assert.ok(queries.some(([sql]) => sql === 'DELETE FROM staff_gig_push_subscriptions WHERE endpoint=$1'));
});
test('students receive server gigs and test pushes use the student gigs page', async () => {
  const { service, sent } = fixture();
  assert.equal(await service.send({ id: 43, position: 'Server' }), 2);
  assert.equal(sent[1].payload.url, '/student/gigs');
  assert.equal(gigNotification({}, 'admin').url, '/admin/upcoming-gigs');
});
test('subscriptions bind to the authenticated user and logout prevents late saves', async () => {
  const { service, staff, queries } = fixture();
  await service.save(7, 'private-session', staff);
  const save = queries.find(([sql]) => sql.startsWith('INSERT INTO staff_gig_push_subscriptions'));
  assert.equal(save[1][1], 7);
  assert.notEqual(save[1][3], 'private-session');
  assert.match(save[0], /NOT EXISTS\(SELECT 1 FROM staff_gig_push_logouts/);
  await service.removeSession(7, 'private-session', 12345);
  const removed = queries.find(([sql]) => sql.includes('WHERE user_id=$1 AND session_hash=$2'));
  assert.deepEqual(removed[1], [7, save[1][3]]);
  await service.cleanup();
  const cleanup = queries.at(-1)[0];
  assert.match(cleanup, /DELETE FROM staff_gig_push_subscriptions s USING staff_gig_push_logouts/);
  assert.ok(cleanup.indexOf('DELETE FROM staff_gig_push_subscriptions') < cleanup.indexOf('DELETE FROM staff_gig_push_logouts'));
});
test('gig worker displays pushes and only opens known portal pages', async () => {
  const handlers = {}, shown = [], opened = [];
  vm.runInNewContext(fs.readFileSync(new URL('../../frontend/public/staff-gig-push-sw.js', import.meta.url), 'utf8'), {
    URL, clients: { matchAll: async () => [], openWindow: async url => opened.push(url) },
    self: { location: { origin: 'https://readybartending.com' }, addEventListener: (name, fn) => { handlers[name] = fn; },
      skipWaiting() {}, clients: { claim() {} }, registration: { showNotification: async (...args) => shown.push(args) } },
  });
  let pending;
  handlers.push({ data: { json: () => ({ title: 'New gig', url: '/student/gigs' }) }, waitUntil: p => { pending = p; } });
  await pending;
  assert.equal(shown[0][1].data.url, '/student/gigs');
  for (const url of ['/student/gigs', 'https://evil.test', '/admin/live-visitors?private=secret']) {
    handlers.notificationclick({ notification: { data: { url }, close() {} }, waitUntil: p => { pending = p; } });
    await pending;
  }
  assert.deepEqual(opened, ['https://readybartending.com/student/gigs', 'https://readybartending.com/user', 'https://readybartending.com/user']);
  assert.equal(handlers.fetch, undefined);
});
