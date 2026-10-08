import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import gigPushRouter from './gigPush.js';

test('staff push endpoints verify signed identity, active role, ownership and logout', async t => {
  const secret = 'gig-push-test';
  const token = (sub, exp = Date.now()/1000+3600) => {
    const payload = Buffer.from(JSON.stringify({ sub, role: 'user', exp })).toString('base64url');
    return `${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`;
  };
  const users = new Map([[1, { role: 'user', is_active: true }], [2, { role: 'student', is_active: true }], [3, { role: 'user', is_active: false }], [4, { role: 'client', is_active: true }]]);
  const saved = [], sent = [], removed = [];
  const loggedOut = new Set();
  const service = {
    initialize: async () => ({ public_key: 'public' }), isLoggedOut: async token => loggedOut.has(token),
    subscribed: async (id) => id === 1, save: async (...args) => saved.push(args), remove: async (...args) => removed.push(args),
    removeSession: async (id, token) => { removed.push([id, token]); loggedOut.add(token); },
    send: async (...args) => { sent.push(args); return 1; },
  };
  const pool = { query: async (_sql, params) => ({ rows: users.has(params[0]) ? [users.get(params[0])] : [] }) };
  const app = express(); app.use(express.json());
  app.use('/api/gig-push', gigPushRouter(pool, secret, { service, origins: ['https://readybartending.com'] }));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  async function call(path, { authorization, body, method = body ? 'POST' : 'GET', origin } = {}) {
    return fetch(`http://127.0.0.1:${server.address().port}/api/gig-push${path}`, { method,
      headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: `Bearer ${authorization}` } : {}), ...(origin ? { Origin: origin } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  assert.equal((await call('/config')).status, 401);
  assert.equal((await call('/config', { authorization: token(1, 1) })).status, 401);
  for (const id of [3,4,5]) assert.equal((await call('/config', { authorization: token(id) })).status, 403);
  assert.equal((await call('/config', { authorization: token(1), origin: 'https://evil.test' })).status, 403);
  for (const id of [1,2]) assert.equal((await call('/config', { authorization: token(id) })).status, 200);
  const ecdh = crypto.createECDH('prime256v1');
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: { p256dh: ecdh.generateKeys().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
  assert.equal((await call('/subscription', { authorization: token(1), body: { subscription: { ...subscription, endpoint: 'https://evil.test' } } })).status, 400);
  assert.equal((await call('/subscription', { authorization: token(1), body: { subscription, userId: 2 } })).status, 200);
  assert.equal(saved[0][0], 1);
  assert.equal((await call('/test', { authorization: token(1), body: { endpoint: subscription.endpoint, userId: 2 } })).status, 200);
  assert.deepEqual(sent[0][1], { userId: 1, endpoint: subscription.endpoint, test: true });
  assert.equal((await call('/subscription', { authorization: token(1), method: 'DELETE', body: { endpoint: subscription.endpoint } })).status, 200);
  assert.deepEqual(removed[0], [1, subscription.endpoint]);
  const auth = token(1);
  assert.equal((await call('/logout', { authorization: auth, method: 'POST' })).status, 204);
  assert.equal((await call('/subscription', { authorization: auth, body: { subscription } })).status, 401);
});
