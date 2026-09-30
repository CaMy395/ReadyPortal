import crypto from 'node:crypto';
import { permits } from './adminAccess.js';

export const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export function encryptionKey(env = process.env) {
  if (!/^[a-f0-9]{64}$/i.test(env.MFA_ENCRYPTION_KEY || '')) {
    throw new Error('MFA_ENCRYPTION_KEY must be a permanent 64-character hexadecimal key.');
  }
  return Buffer.from(env.MFA_ENCRYPTION_KEY, 'hex');
}
export function seal(secret, userId, key = encryptionKey()) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(String(userId)));
  const encrypted = Buffer.concat([cipher.update(secret), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function unseal(value, userId, key = encryptionKey()) {
  const bytes = Buffer.from(value, 'base64');
  const cipher = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  cipher.setAAD(Buffer.from(String(userId)));
  cipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]);
}
export function base32(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) { bits -= 5; output += alphabet[(value >>> bits) & 31]; }
  }
  if (bits) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}
// RFC 6238 / RFC 4226; SHA-1, six digits, 30-second steps.
export function totp(secret, step, digits = 6) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = crypto.createHmac('sha1', secret).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  return String((mac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).padStart(digits, '0');
}
export function verifyTotp(secret, code, lastStep = -1, now = Date.now()) {
  if (!/^\d{6}$/.test(String(code))) return null;
  const current = Math.floor(now / 30000);
  for (const step of [current, current - 1, current + 1]) {
    if (step > Number(lastStep) && crypto.timingSafeEqual(Buffer.from(totp(secret, step)), Buffer.from(String(code)))) return step;
  }
  return null;
}
export const recoveryHash = code => digest(String(code || '').replace(/[\s-]/g, '').toLowerCase());
export function recoveryCodes() {
  return Array.from({ length: 10 }, () => crypto.randomBytes(10).toString('hex').match(/.{1,5}/g).join('-'));
}
const schemas = new WeakMap();
export function ensureMfa(pool) {
  if (!schemas.has(pool)) {
    const promise = pool.query(`CREATE TABLE IF NOT EXISTS banking_mfa (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      secret TEXT, pending_secret TEXT, pending_until TIMESTAMPTZ,
      last_step BIGINT NOT NULL DEFAULT -1, recovery_hashes TEXT[] NOT NULL DEFAULT '{}',
      failures INTEGER NOT NULL DEFAULT 0, locked_until TIMESTAMPTZ
    ); CREATE TABLE IF NOT EXISTS banking_mfa_sessions (
      token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      login_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL
    );`);
    schemas.set(pool, promise);
    promise.catch(() => schemas.delete(pool));
  }
  return schemas.get(pool);
}
export async function hasMfaSession(pool, req, userId) {
  const token = req.headers['x-ready-mfa'];
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
  const result = await pool.query(`SELECT 1 FROM banking_mfa_sessions s
    JOIN banking_mfa m ON m.user_id=s.user_id WHERE s.token_hash=$1 AND s.user_id=$2
    AND s.login_hash=$3 AND s.expires_at>NOW() AND m.secret IS NOT NULL`,
  [digest(token), userId, digest(req.headers.authorization || '')]);
  return result.rowCount > 0;
}
export function requireBankingMfa(pool) {
  return async (req, res, next) => {
    if (req.path === '/webhook') return next();
    res.set('Cache-Control', 'no-store');
    try {
      await ensureMfa(pool);
      if (!permits(req.adminAccess, 'finance.manage') || !await hasMfaSession(pool, req, req.adminAccess.userId)) {
        return res.status(403).json({ code: 'MFA_REQUIRED', error: 'Verify your authenticator code before accessing banking.' });
      }
      next();
    } catch { res.status(503).json({ error: 'Banking verification is temporarily unavailable.' }); }
  };
}
