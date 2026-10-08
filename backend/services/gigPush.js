import crypto from 'node:crypto';
import webpush from 'web-push';
import { validSubscription } from './visitorPush.js';
import { canClaimMainGig } from '../../frontend/src/utils/gigEligibility.mjs';

export function gigNotification(gig, role = 'user') {
  const date = String(gig.date instanceof Date ? gig.date.toISOString() : gig.date || '').slice(0, 10);
  return {
    title: 'New Ready gig available',
    body: [gig.position || gig.event_type || 'New gig', date, String(gig.time || '').slice(0, 5), gig.pay != null ? `$${gig.pay}/hr` : null].filter(Boolean).join(' · '),
    tag: `ready-gig-${gig.id}`,
    url: role === 'student' ? '/student/gigs' : role === 'admin' ? '/admin/upcoming-gigs' : '/user',
  };
}

export function createGigPush(pool, keyProvider, secret, sender = webpush) {
  const epoch = crypto.createHash('sha256').update(secret).digest('hex');
  const hash = token => crypto.createHash('sha256').update(token).digest('hex');
  let initialization;
  function initialize() {
    if (!initialization) {
      initialization = (async () => {
        await pool.query(`CREATE TABLE IF NOT EXISTS staff_gig_push_subscriptions (
          endpoint TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          subscription JSONB NOT NULL, session_hash TEXT NOT NULL, auth_epoch TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        ); CREATE TABLE IF NOT EXISTS staff_gig_push_logouts (
          session_hash TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL
        );`);
        return keyProvider.initialize();
      })().catch(error => { initialization = undefined; throw error; });
    }
    return initialization;
  }
  async function save(userId, token, subscription) {
    await initialize();
    // Preserve explicit device opt-in beyond the short portal session. Delivery
    // still checks the account's current role, active status and logout revocation.
    const stored = { endpoint: subscription.endpoint, keys: subscription.keys };
    await pool.query(`INSERT INTO staff_gig_push_subscriptions(endpoint,user_id,subscription,session_hash,auth_epoch)
      SELECT $1,$2,$3,$4,$5 WHERE NOT EXISTS(SELECT 1 FROM staff_gig_push_logouts WHERE session_hash=$4)
      ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id, subscription=EXCLUDED.subscription,
      session_hash=EXCLUDED.session_hash, auth_epoch=EXCLUDED.auth_epoch, updated_at=NOW()`,
    [stored.endpoint, userId, JSON.stringify(stored), hash(token), epoch]);
  }
  async function remove(userId, endpoint) {
    await initialize();
    await pool.query('DELETE FROM staff_gig_push_subscriptions WHERE user_id=$1 AND endpoint=$2', [userId, endpoint]);
  }
  async function removeSession(userId, token, exp) {
    await initialize();
    await pool.query(`INSERT INTO staff_gig_push_logouts(session_hash,expires_at) VALUES($1,to_timestamp($2))
      ON CONFLICT(session_hash) DO UPDATE SET expires_at=EXCLUDED.expires_at`, [hash(token), exp]);
    await pool.query('DELETE FROM staff_gig_push_subscriptions WHERE user_id=$1 AND session_hash=$2', [userId, hash(token)]);
  }
  async function isLoggedOut(token) {
    await initialize();
    const { rows } = await pool.query('SELECT 1 FROM staff_gig_push_logouts WHERE session_hash=$1 AND expires_at>NOW()', [hash(token)]);
    return rows.length > 0;
  }
  async function subscribed(userId, endpoint) {
    await initialize();
    const { rows } = await pool.query(`SELECT 1 FROM staff_gig_push_subscriptions s
      WHERE s.user_id=$1 AND s.endpoint=$2 AND s.auth_epoch=$3
      AND NOT EXISTS(SELECT 1 FROM staff_gig_push_logouts l WHERE l.session_hash=s.session_hash)`, [userId, endpoint, epoch]);
    return rows.length > 0;
  }
  async function send(gig, { userId = null, endpoint = null, test = false } = {}) {
    const keys = await initialize();
    const { rows } = await pool.query(`SELECT s.endpoint,s.subscription,u.role FROM staff_gig_push_subscriptions s
      JOIN users u ON u.id=s.user_id WHERE u.role IN ('user','student','admin') AND u.is_active IS DISTINCT FROM false
      AND s.auth_epoch=$1 AND ($2::integer IS NULL OR s.user_id=$2) AND ($3::text IS NULL OR s.endpoint=$3)
      AND NOT EXISTS(SELECT 1 FROM staff_gig_push_logouts l WHERE l.session_hash=s.session_hash)`, [epoch, userId, endpoint]);
    let delivered = 0;
    for (let offset = 0; offset < rows.length; offset += 10) {
      await Promise.all(rows.slice(offset, offset + 10).map(async row => {
        if (!validSubscription(row.subscription) || (!test && !canClaimMainGig(row.role, gig.position))) return;
        const payload = test ? { title: 'Ready gig alerts are on', body: 'You will receive an alert when a new gig is posted.', tag: 'ready-gig-test', url: gigNotification({}, row.role).url } : gigNotification(gig, row.role);
        try {
          await sender.sendNotification(row.subscription, JSON.stringify(payload), {
            TTL: 24 * 60 * 60, urgency: 'high', timeout: 10000,
            vapidDetails: { subject: 'https://readybartending.com', publicKey: keys.public_key, privateKey: keys.private_key },
          });
          delivered++;
        } catch (error) {
          if ([404,410].includes(error.statusCode)) await pool.query('DELETE FROM staff_gig_push_subscriptions WHERE endpoint=$1', [row.endpoint]);
          else console.error('Staff gig push failed:', error.statusCode || 'network error');
        }
      }));
    }
    return delivered;
  }
  async function cleanup() {
    await initialize();
    // Remove any save that raced logout before expiring its revocation marker.
    await pool.query(`DELETE FROM staff_gig_push_subscriptions s USING staff_gig_push_logouts l
      WHERE s.session_hash=l.session_hash;
      DELETE FROM staff_gig_push_logouts WHERE expires_at<=NOW()`);
  }
  return { initialize, save, remove, removeSession, isLoggedOut, subscribed, send, cleanup };
}
