import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { createVisitorPush } from './visitorPush.js';

// All fixtures and tables are rolled back, even if a check fails.
test('PostgreSQL visit deduplication, restart persistence, revocation, expiry and logout', { skip: process.env.RUN_VISITOR_PUSH_DB_TEST !== '1' }, async () => {
  assert.notEqual(process.env.NODE_ENV, 'production');
  dotenv.config({ path: '.env' });
  const client = new pg.Client({ user: process.env.DB_USER, host: process.env.DB_HOST,
    database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: Number(process.env.DB_PORT || 5432), connectionTimeoutMillis: 5000 });
  const schema = `push_test_${crypto.randomBytes(8).toString('hex')}`;
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    await client.query('CREATE TABLE users(id INTEGER PRIMARY KEY,role TEXT,is_active BOOLEAN DEFAULT true)');
    await client.query("INSERT INTO users VALUES(1,'admin',true),(2,'user',true),(3,'admin',false)");
    const sender = { generateVAPIDKeys: () => ({ publicKey: 'fixed-public', privateKey: 'fixed-private' }), sendNotification: async () => {} };
    const push = createVisitorPush(client, sender, 'auth-epoch');
    const id = crypto.randomUUID();
    assert.equal(await push.recordVisit(id), true);
    assert.equal(await push.recordVisit(id), false);
    await client.query("UPDATE visitor_push_visits SET last_seen=NOW()-INTERVAL '31 minutes' WHERE visitor_id=$1", [id]);
    assert.equal(await push.recordVisit(id), true);
    assert.deepEqual(await Promise.all([push.recordVisit(id), push.recordVisit(id)]), [false,false]);
    assert.equal((await createVisitorPush(client, sender, 'auth-epoch').initialize()).public_key, 'fixed-public');
    const ecdh = crypto.createECDH('prime256v1');
    const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: {
      p256dh: ecdh.generateKeys().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url'),
    } };
    const future = Date.now()/1000+3600;
    await push.save(1, { exp: future }, 'session-one', sub);
    assert.equal(await push.send({ title: 'Test' }), 1);
    assert.equal(await createVisitorPush(client, sender, 'changed-auth-secret').send({ title: 'Test' }), 0);
    await push.removeSession(1, 'session-one', future);
    assert.equal(await push.isLoggedOut('session-one'), true);
    await push.save(1, { exp: future }, 'session-one', sub); // A stale in-flight request cannot restore alerts.
    assert.equal(await push.send({ title: 'Test' }), 0);
    await push.save(1, { exp: future }, 'session-two', sub);
    assert.equal(await push.send({ title: 'Test' }), 1);
    await client.query("UPDATE users SET role='user' WHERE id=1");
    assert.equal(await push.send({ title: 'Test' }), 0);
    await client.query("UPDATE users SET role='admin',is_active=false WHERE id=1");
    assert.equal(await push.send({ title: 'Test' }), 0);
    await client.query('UPDATE users SET is_active=true WHERE id=1');
    await push.save(1, { exp: 1 }, 'expired-session', sub);
    assert.equal(await push.send({ title: 'Test' }), 0);
    await push.cleanup();
    assert.equal((await client.query('SELECT * FROM visitor_push_subscriptions')).rows.length, 0);
  } finally {
    await client.query('ROLLBACK');
    await client.end();
  }
});
