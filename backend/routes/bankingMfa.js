import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import { verifyAccessToken, loadAccess } from '../services/adminAccess.js';
import { encryptionKey, seal, unseal, base32, verifyTotp, recoveryCodes, recoveryHash, digest, ensureMfa, hasMfaSession } from '../services/bankingMfa.js';

export default function bankingMfaRouter(pool, authSecret) {
  const router = express.Router();
  router.use(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const identity = verifyAccessToken(req.headers.authorization, authSecret);
      if (!identity) return res.status(401).json({ error: 'Please sign in again.' });
      const access = await loadAccess(pool, identity.sub);
      if (!access?.fullAdmin) return res.status(403).json({ error: 'Administrator access required.' });
      req.mfaUser = identity.sub;
      await ensureMfa(pool);
      next();
    } catch { res.status(503).json({ error: 'Banking verification is temporarily unavailable.' }); }
  });
  router.get('/status', async (req, res) => {
    try {
      let configured = true;
      try { encryptionKey(); } catch { configured = false; }
      const { rows } = await pool.query('SELECT secret IS NOT NULL AS enabled FROM banking_mfa WHERE user_id=$1', [req.mfaUser]);
      res.json({ configured, enabled: Boolean(rows[0]?.enabled), verified: await hasMfaSession(pool, req, req.mfaUser) });
    } catch { res.status(503).json({ error: 'Unable to check banking verification.' }); }
  });
  // Serialize attempts per account, including setup/password attempts. Limits
  // persist across restarts and cannot be bypassed with concurrent requests.
  for (const action of ['setup', 'confirm', 'verify', 'reset']) {
    router.post(`/${action}`, async (req, res) => {
      let db;
      try {
        try { encryptionKey(); } catch {
          return res.status(503).json({ error: 'Banking MFA needs its permanent encryption key configured on the server.' });
        }
        db = await pool.connect();
        await db.query('BEGIN');
        await db.query('INSERT INTO banking_mfa(user_id) VALUES($1) ON CONFLICT DO NOTHING', [req.mfaUser]);
        const { rows: [state] } = await db.query('SELECT * FROM banking_mfa WHERE user_id=$1 FOR UPDATE', [req.mfaUser]);
        if (state.locked_until && new Date(state.locked_until) > new Date()) {
          await db.query('ROLLBACK');
          return res.status(429).json({ error: 'Too many attempts. Wait 15 minutes and try again.' });
        }
        if (state.locked_until) state.failures = 0;
        const fail = async message => {
          const count = state.failures + 1;
          await db.query("UPDATE banking_mfa SET failures=$2, locked_until=CASE WHEN $2>=5 THEN NOW()+INTERVAL '15 minutes' ELSE NULL END WHERE user_id=$1", [req.mfaUser, count]);
          await db.query('COMMIT');
          return res.status(400).json({ error: message });
        };
        if (action === 'setup' || action === 'reset') {
          const user = (await db.query('SELECT password, email FROM users WHERE id=$1', [req.mfaUser])).rows[0];
          if (typeof req.body.password !== 'string' || req.body.password.length > 1024 || !await bcrypt.compare(req.body.password, user.password)) {
            return await fail('Incorrect password.');
          }
          if (action === 'setup' && state.secret) {
            await db.query('ROLLBACK');
            return res.status(409).json({ error: 'Authenticator already enabled. Verify with a code or use recovery.' });
          }
          if (action === 'reset') {
            const hash = recoveryHash(req.body.recoveryCode);
            if (!state.secret || !state.recovery_hashes.includes(hash)) return await fail('Invalid or already used recovery code.');
            await db.query('DELETE FROM banking_mfa_sessions WHERE user_id=$1', [req.mfaUser]);
            await db.query("UPDATE banking_mfa SET secret=NULL, last_step=-1, recovery_hashes='{}' WHERE user_id=$1", [req.mfaUser]);
          }
          const secret = crypto.randomBytes(20);
          const encoded = base32(secret);
          const uri = `otpauth://totp/${encodeURIComponent(`Ready Bartending:${user.email || req.mfaUser}`)}?secret=${encoded}&issuer=Ready%20Bartending&algorithm=SHA1&digits=6&period=30`;
          const qr = await QRCode.toDataURL(uri);
          await db.query("UPDATE banking_mfa SET pending_secret=$2, pending_until=NOW()+INTERVAL '10 minutes', failures=0, locked_until=NULL WHERE user_id=$1", [req.mfaUser, seal(secret, req.mfaUser)]);
          await db.query('COMMIT');
          return res.json({ secret: encoded, qr });
        }
        let codes;
        if (action === 'confirm') {
          if (state.secret || !state.pending_secret || new Date(state.pending_until) <= new Date()) return await fail('Setup expired. Start setup again.');
          const step = verifyTotp(unseal(state.pending_secret, req.mfaUser), req.body.code);
          if (step === null) return await fail('Incorrect code. Check the current code in your authenticator.');
          codes = recoveryCodes();
          await db.query("UPDATE banking_mfa SET secret=pending_secret, pending_secret=NULL, pending_until=NULL, last_step=$2, recovery_hashes=$3 WHERE user_id=$1", [req.mfaUser, step, codes.map(recoveryHash)]);
        } else {
          if (!state.secret) return await fail('Set up your authenticator first.');
          if (req.body.recoveryCode) {
            const hash = recoveryHash(req.body.recoveryCode);
            if (!state.recovery_hashes.includes(hash)) return await fail('Invalid or already used recovery code.');
            await db.query('UPDATE banking_mfa SET recovery_hashes=array_remove(recovery_hashes,$2) WHERE user_id=$1', [req.mfaUser, hash]);
          } else {
            const step = verifyTotp(unseal(state.secret, req.mfaUser), req.body.code, state.last_step);
            if (step === null) return await fail('Incorrect or already used code. Wait for the next code and try again.');
            await db.query('UPDATE banking_mfa SET last_step=$2 WHERE user_id=$1', [req.mfaUser, step]);
          }
        }
        await db.query('UPDATE banking_mfa SET failures=0, locked_until=NULL WHERE user_id=$1', [req.mfaUser]);
        await db.query('DELETE FROM banking_mfa_sessions WHERE expires_at<=NOW() OR user_id=$1', [req.mfaUser]);
        const token = crypto.randomBytes(32).toString('hex');
        await db.query("INSERT INTO banking_mfa_sessions(token_hash,user_id,login_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '30 minutes')", [digest(token), req.mfaUser, digest(req.headers.authorization || '')]);
        await db.query('COMMIT');
        res.json({ token, expiresAt: Date.now() + 30 * 60 * 1000, ...(codes ? { recoveryCodes: codes } : {}) });
      } catch {
        if (db) await db.query('ROLLBACK').catch(() => {});
        res.status(503).json({ error: 'Unable to verify banking access. Please try again.' });
      } finally { db?.release(); }
    });
  }
  return router;
}
