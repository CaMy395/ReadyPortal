import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { totp, verifyTotp, base32, seal, unseal, encryptionKey, recoveryCodes, recoveryHash, hasMfaSession, requireBankingMfa } from './bankingMfa.js';

test('TOTP matches the six official RFC 6238 SHA-1 vectors', () => {
  const secret = Buffer.from('12345678901234567890');
  for (const [time, expected] of [[59,'94287082'], [1111111109,'07081804'], [1111111111,'14050471'], [1234567890,'89005924'], [2000000000,'69279037'], [20000000000,'65353130']]) {
    assert.equal(totp(secret, Math.floor(time / 30), 8), expected);
  }
  assert.equal(base32(secret), 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
});
test('verification rejects replays, invalid lengths, wrong codes and expired codes', () => {
  const secret = Buffer.from('12345678901234567890');
  assert.equal(verifyTotp(secret, '287082', -1, 59000), 1);
  assert.equal(verifyTotp(secret, '287082', 1, 59000), null);
  assert.equal(verifyTotp(secret, '94287082', -1, 59000), null);
  assert.equal(verifyTotp(secret, '000000', -1, 59000), null);
  assert.equal(verifyTotp(secret, '287082', -1, 120000), null);
});
test('encrypted seeds are bound to their account and reject tampering or wrong keys', () => {
  const key = crypto.randomBytes(32), secret = crypto.randomBytes(20);
  const stored = seal(secret, 1, key);
  assert.deepEqual(unseal(stored, 1, key), secret);
  assert.throws(() => unseal(stored, 2, key));
  assert.throws(() => unseal(stored, 1, crypto.randomBytes(32)));
  const damaged = Buffer.from(stored, 'base64'); damaged[30] ^= 1;
  assert.throws(() => unseal(damaged.toString('base64'), 1, key));
  assert.throws(() => encryptionKey({}));
});
test('recovery codes contain independent randomness and normalize formatting', () => {
  const codes = recoveryCodes();
  assert.equal(new Set(codes).size, 10);
  assert.match(codes[0], /^[a-f0-9]{5}(-[a-f0-9]{5}){3}$/);
  assert.equal(recoveryHash(codes[0]), recoveryHash(codes[0].toUpperCase().replaceAll('-', ' ')));
});
test('banking guard rejects direct API calls with only a password session', async () => {
  const pool = { query: async () => ({ rowCount: 0 }) };
  const req = { path: '/create-link-token', headers: { authorization: 'Bearer login' }, adminAccess: { fullAdmin: true, userId: 1 } };
  const res = { set() {}, status(n) { this.statusCode = n; return this; }, json(body) { this.body = body; } };
  let allowed = false;
  await requireBankingMfa(pool)(req, res, () => { allowed = true; });
  assert.equal(allowed, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'MFA_REQUIRED');
});
test('MFA proof is looked up using both the account and current login', async () => {
  const calls = [];
  const pool = { query: async (...args) => { calls.push(args); return { rowCount: 0 }; } };
  assert.equal(await hasMfaSession(pool, { headers: { 'x-ready-mfa': 'a'.repeat(64), authorization: 'Bearer new-login' } }, 7), false);
  assert.equal(calls[0][1][1], 7);
  assert.match(calls[0][0], /s.expires_at>NOW\(\)/);
  assert.match(calls[0][0], /s.login_hash=\$3/);
});
