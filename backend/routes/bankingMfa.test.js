import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import pg from 'pg';
import dotenv from 'dotenv';
import bankingMfaRouter from './bankingMfa.js';
import { accessBoundary } from '../services/adminAccess.js';
import { requireBankingMfa, unseal, totp } from '../services/bankingMfa.js';

// Opt-in test uses a disposable schema on the DEVELOPMENT database only.
test('banking MFA enrollment, verification, recovery and API enforcement', { skip: process.env.RUN_MFA_DB_TEST !== '1' }, async () => {
  assert.notEqual(process.env.NODE_ENV, 'production');
  dotenv.config({ path: '.env' });
  const schema = `mfa_test_${crypto.randomBytes(8).toString('hex')}`;
  const config = { user: process.env.DB_USER, host: process.env.DB_HOST, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, port: Number(process.env.DB_PORT || 5432) };
  const admin = new pg.Pool(config);
  let pool, server;
  const previousKey = process.env.MFA_ENCRYPTION_KEY;
  process.env.MFA_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    pool = new pg.Pool({ ...config, options: `-c search_path=${schema}` });
    await pool.query('CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT, password TEXT, role TEXT, is_active BOOLEAN DEFAULT true)');
    await pool.query('INSERT INTO users(id,email,password,role) VALUES(1,$1,$2,$3),(2,$1,$2,$4)', ['test@example.invalid', await bcrypt.hash('test-password', 4), 'admin', 'user']);
    const secret = crypto.randomBytes(32).toString('hex');
    function login(sub, nonce = '') {
      const payload = Buffer.from(JSON.stringify({ sub, role: sub === 1 ? 'admin' : 'user', exp: Date.now() / 1000 + 3600, nonce })).toString('base64url');
      return `Bearer ${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`;
    }
    const auth = login(1);
    const app = express(); app.use(express.json());
    app.use(accessBoundary(pool, secret));
    app.use('/api/mfa', bankingMfaRouter(pool, secret));
    app.use('/api/plaid', requireBankingMfa(pool));
    app.get('/api/plaid/items', (_req, res) => res.json({ banking: true }));
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
    const origin = `http://127.0.0.1:${server.address().port}`;
    async function call(path, body, proof, authorization = auth) {
      const response = await fetch(`${origin}${path}`, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Authorization: authorization, ...(proof ? { 'X-Ready-MFA': proof } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    }
    assert.equal((await call('/api/mfa/status', null, null, login(2))).status, 403);
    assert.equal((await call('/api/plaid/items')).status, 403);
    assert.equal((await call('/api/mfa/setup', { password: 'wrong' })).status, 400);
    const setup = await call('/api/mfa/setup', { password: 'test-password' });
    assert.equal(setup.status, 200); assert.match(setup.body.secret, /^[A-Z2-7]{32}$/);
    assert.equal((await call('/api/plaid/items')).status, 403);
    const state = (await pool.query('SELECT * FROM banking_mfa WHERE user_id=1')).rows[0];
    const seed = unseal(state.pending_secret, 1);
    const code = totp(seed, Math.floor(Date.now() / 30000));
    const enrolled = await call('/api/mfa/confirm', { code });
    assert.equal(enrolled.status, 200); assert.equal(enrolled.body.recoveryCodes.length, 10);
    assert.equal((await call('/api/plaid/items', null, enrolled.body.token)).status, 200);
    assert.equal((await call('/api/plaid/items', null, enrolled.body.token, login(1, 'new-login'))).status, 403);
    assert.equal((await call('/api/mfa/verify', { code })).status, 400);
    assert.equal((await call('/api/mfa/setup', { password: 'test-password' })).status, 409);
    const recoveryCode = enrolled.body.recoveryCodes[0];
    const concurrent = await Promise.all([call('/api/mfa/verify', { recoveryCode }), call('/api/mfa/verify', { recoveryCode })]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 400]);
    const valid = concurrent.find(r => r.status === 200).body.token;
    await pool.query("UPDATE banking_mfa_sessions SET expires_at=NOW()-INTERVAL '1 second'");
    assert.equal((await call('/api/plaid/items', null, valid)).status, 403);
    for (let i = 0; i < 5; i++) await call('/api/mfa/verify', { code: 'invalid' });
    assert.equal((await call('/api/mfa/verify', { recoveryCode: enrolled.body.recoveryCodes[1] })).status, 429);
    await pool.query("UPDATE banking_mfa SET locked_until=NOW()-INTERVAL '1 second'");
    const replacement = await call('/api/mfa/reset', { password: 'test-password', recoveryCode: enrolled.body.recoveryCodes[1] });
    assert.equal(replacement.status, 200);
    assert.equal((await call('/api/mfa/verify', { recoveryCode: enrolled.body.recoveryCodes[2] })).status, 400);
    assert.equal((await call('/api/plaid/items', null, valid)).status, 403);
    await pool.query("UPDATE banking_mfa SET pending_until=NOW()-INTERVAL '1 second'");
    assert.equal((await call('/api/mfa/confirm', { code })).status, 400);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (pool) await pool.end();
    assert.match(schema, /^mfa_test_[a-f0-9]{16}$/);
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
    if (previousKey === undefined) delete process.env.MFA_ENCRYPTION_KEY; else process.env.MFA_ENCRYPTION_KEY = previousKey;
  }
});
