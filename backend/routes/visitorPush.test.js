import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import visitorPushRouter from './visitorPush.js';
import { createVisitorPush, validSubscription, pageLabel } from '../services/visitorPush.js';

const secret = 'visitor-tests-only';
function token(sub, exp = Date.now() / 1000 + 3600) {
  const payload = Buffer.from(JSON.stringify({ sub, role: 'admin', exp })).toString('base64url');
  return `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
function subscription(endpoint = 'https://fcm.googleapis.com/fcm/send/test') {
  const ecdh = crypto.createECDH('prime256v1');
  return { endpoint, keys: { p256dh: ecdh.generateKeys().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
}
test('push subscriptions reject arbitrary outbound hosts, credentials, bad keys and lookalike hosts', () => {
  assert.equal(validSubscription(subscription()), true);
  for (const endpoint of ['https://127.0.0.1/push', 'http://fcm.googleapis.com/push', 'https://fcm.googleapis.com.evil.test/push', 'https://evilpush.apple.com/push', 'https://user@fcm.googleapis.com/push', 'https://fcm.googleapis.com:444/push']) {
    assert.equal(validSubscription(subscription(endpoint)), false, endpoint);
  }
  assert.equal(validSubscription({ endpoint: 'https://fcm.googleapis.com/push', keys: { p256dh: 'abc', auth: 'abc' } }), false);
  assert.equal(pageLabel('/rb/client-save-card?token=secret'), 'the website');
  assert.equal(pageLabel('/reset-password/secret-token'), 'the website');
  assert.equal(pageLabel('/rb/events/private-booking-slug'), 'the website');
  assert.equal(pageLabel('/rb/weddings?email=private'), 'weddings');
});

test('anonymous visits notify, duplicates do not, and push settings require a current admin', async t => {
  const sent = [], saved = [], removed = [];
  const seen = new Set();
  const roles = new Map([[1, { id: 1, role: 'admin', is_active: true }], [2, { id: 2, role: 'user', is_active: true }], [3, { id: 3, role: 'admin', is_active: false }]]);
  const pool = { query: async (sql, params) => ({ rows: sql.includes('SELECT name,username') ? [{ name: 'Real Name' }] : roles.has(params[0]) ? [roles.get(params[0])] : [] }) };
  const service = {
    initialize: async () => ({ public_key: 'public-only' }),
    isLoggedOut: async () => false,
    recordVisit: async id => { if (seen.has(id)) return false; seen.add(id); return true; },
    send: async (...args) => { sent.push(args); return 1; },
    save: async (...args) => saved.push(args), remove: async (...args) => removed.push(args),
    removeSession: async (...args) => removed.push(args),
  };
  const app = express(); app.use(express.json());
  app.use('/api/push', visitorPushRouter(pool, secret, { service, origins: ['https://readybartending.com'] }));
  const server = await new Promise(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const call = (path, { body, authorization, method = body ? 'POST' : 'GET', origin } = {}) => fetch(`http://127.0.0.1:${server.address().port}/api/push${path}`, {
    method, headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}), ...(origin ? { Origin: origin } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  assert.equal((await call('/config')).status, 401);
  assert.equal((await call('/config', { authorization: token(2) })).status, 403);
  assert.equal((await call('/config', { authorization: token(3) })).status, 403);
  assert.equal((await call('/config', { authorization: token(1, 1) })).status, 401);
  const config = await call('/config', { authorization: token(1) });
  assert.deepEqual(await config.json(), { publicKey: 'public-only' });
  assert.equal((await call('/subscription', { authorization: token(1), body: { subscription: subscription('https://evil.test') } })).status, 400);
  assert.equal((await call('/subscription', { authorization: token(1), body: { subscription: subscription(), userId: 2 } })).status, 200);
  assert.equal(saved[0][0], 1);
  const visitorId = crypto.randomUUID();
  const visit = { visitorId, path: '/rb/weddings?private=secret', name: 'Spoofed name', userId: 1 };
  assert.equal((await call('/visit', { body: visit, origin: 'https://evil.test' })).status, 403);
  assert.equal((await call('/visit', { body: { visitorId: 'bad' } })).status, 400);
  assert.equal((await call('/visit', { body: visit })).status, 202);
  assert.equal(sent[0][0].body, 'Anonymous visitor opened weddings.');
  assert.equal((await call('/visit', { body: visit })).status, 204);
  assert.equal(sent.length, 1);
  assert.equal((await call('/visit', { body: { ...visit, visitorId: crypto.randomUUID() }, authorization: token(1) })).status, 202);
  assert.equal(sent[1][0].body, 'Real Name opened weddings.');
  assert.equal((await call('/test', { authorization: token(1), body: { endpoint: subscription().endpoint } })).status, 200);
  assert.equal(sent[2][1], 1);
  assert.equal((await call('/logout', { method: 'POST', authorization: token(1) })).status, 204);
  assert.equal(removed[0][0], 1);
  roles.get(1).role = 'user';
  assert.equal((await call('/config', { authorization: token(1) })).status, 403);
});

test('delivery uses current active admin sessions, removes expired endpoints, and reports provider failures', async () => {
  const sent = [], queries = [];
  const subs = [subscription(), subscription('https://web.push.apple.com/test')];
  const pool = { query: async (sql, params) => {
    queries.push([sql, params]);
    if (sql.startsWith('SELECT public_key')) return { rows: [{ public_key: 'public', private_key: 'private' }] };
    if (sql.startsWith('SELECT s.endpoint')) return { rows: subs.map(s => ({ endpoint: s.endpoint, subscription: s })) };
    return { rows: [] };
  } };
  const sender = { generateVAPIDKeys: () => ({ publicKey: 'public', privateKey: 'private' }),
    sendNotification: async (s, payload, options) => {
      sent.push({ s, payload, options });
      if (s.endpoint.includes('apple')) throw Object.assign(new Error('Gone'), { statusCode: 410 });
    } };
  const service = createVisitorPush(pool, sender);
  assert.equal(await service.send({ title: 'Test' }, 1, subs[0].endpoint), 1);
  const recipient = queries.find(([sql]) => sql.startsWith('SELECT s.endpoint'));
  assert.match(recipient[0], /u.role='admin'/);
  assert.match(recipient[0], /s.expires_at>NOW\(\)/);
  assert.match(recipient[0], /u.is_active IS DISTINCT FROM false/);
  assert.deepEqual(recipient[1].slice(0,2), [1, subs[0].endpoint]);
  assert.match(recipient[0], /s.auth_epoch=\$3/);
  assert.match(recipient[0], /NOT EXISTS\(SELECT 1 FROM visitor_push_logouts/);
  assert.deepEqual(queries.find(([sql]) => sql === 'DELETE FROM visitor_push_subscriptions WHERE endpoint=$1')[1], [subs[1].endpoint]);
  assert.equal(sent[0].options.TTL, 60);
  await service.save(1, { exp: 12345 }, 'secret-session', subs[0]);
  const save = queries.find(([sql]) => sql.startsWith('INSERT INTO visitor_push_subscriptions'));
  assert.equal(save[1][4], 12345);
  assert.notEqual(save[1][3], 'secret-session');
});
