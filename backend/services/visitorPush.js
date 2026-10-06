import webpush from 'web-push';
import crypto from 'node:crypto';

export function validSubscription(value) {
  try {
    const url = new URL(value.endpoint);
    const host = url.hostname;
    const provider = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(host)
      || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com');
    const key = value.keys?.p256dh;
    const auth = value.keys?.auth;
    return provider && url.protocol === 'https:' && !url.username && !url.password && !url.port
      && value.endpoint.length <= 2048 && typeof key === 'string' && typeof auth === 'string'
      && /^[\w-]{87}$/.test(key) && Buffer.from(key, 'base64url').length === 65
      && Buffer.from(key, 'base64url')[0] === 4 && /^[\w-]{22}$/.test(auth);
  } catch { return false; }
}

// Only page categories go into notifications; never payment/reset tokens or queries.
export function pageLabel(path) {
  if (typeof path !== 'string') return 'the website';
  const labels = {
    '/rb/home': 'the home page', '/rb/event-staffing-packages': 'event packages',
    '/rb/how-to-be-a-bartender': 'bartending classes', '/rb/crafts-cocktails': 'Crafts & Cocktails',
    '/rb/mix-n-sip': 'Mix & Sip', '/rb/client-scheduling': 'booking',
    '/rb/rentals-products': 'rentals', '/rb/weddings': 'weddings',
    '/rb/baby-showers': 'baby showers', '/rb/events': 'events', '/rb/apply': 'staff applications',
    '/rb/connect': 'the contact page', '/login': 'the login page',
  };
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  return (Object.hasOwn(labels, clean) ? labels[clean] : null) || (clean.startsWith('/admin/') ? 'the admin portal'
    : /^\/(user|gigs|student)\//.test(clean) ? 'the member portal' : 'the website');
}

export function createVisitorPush(pool, sender = webpush, authSecret = '') {
  const authEpoch = crypto.createHash('sha256').update(authSecret).digest('hex');
  let initialization;
  const initialize = () => {
    if (!initialization) {
      initialization = (async () => {
        await pool.query(`CREATE TABLE IF NOT EXISTS visitor_push_keys (
          id INTEGER PRIMARY KEY CHECK (id=1), public_key TEXT NOT NULL, private_key TEXT NOT NULL
        ); CREATE TABLE IF NOT EXISTS visitor_push_subscriptions (
          endpoint TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          subscription JSONB NOT NULL, session_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
          auth_epoch TEXT NOT NULL
        ); CREATE TABLE IF NOT EXISTS visitor_push_logouts (
          session_hash TEXT PRIMARY KEY, expires_at TIMESTAMPTZ NOT NULL
        ); CREATE TABLE IF NOT EXISTS visitor_push_visits (
          visitor_id UUID PRIMARY KEY, last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
        ); CREATE INDEX IF NOT EXISTS visitor_push_visits_seen ON visitor_push_visits(last_seen);`);
        const generated = sender.generateVAPIDKeys();
        // Database persistence keeps existing phone subscriptions valid after redeploys.
        await pool.query(`INSERT INTO visitor_push_keys(id,public_key,private_key) VALUES(1,$1,$2)
          ON CONFLICT(id) DO NOTHING`, [generated.publicKey, generated.privateKey]);
        const { rows } = await pool.query('SELECT public_key, private_key FROM visitor_push_keys WHERE id=1');
        return rows[0];
      })();
      initialization.catch(() => { initialization = undefined; });
    }
    return initialization;
  };
  const sessionHash = token => crypto.createHash('sha256').update(token).digest('hex');
  async function save(userId, identity, token, subscription) {
    await initialize();
    const stored = { endpoint: subscription.endpoint, keys: subscription.keys };
    await pool.query(`INSERT INTO visitor_push_subscriptions(endpoint,user_id,subscription,session_hash,expires_at,auth_epoch)
      VALUES($1,$2,$3,$4,to_timestamp($5),$6) ON CONFLICT(endpoint) DO UPDATE SET
      user_id=EXCLUDED.user_id, subscription=EXCLUDED.subscription, session_hash=EXCLUDED.session_hash,
      expires_at=EXCLUDED.expires_at, auth_epoch=EXCLUDED.auth_epoch`, [stored.endpoint, userId, JSON.stringify(stored), sessionHash(token), identity.exp, authEpoch]);
  }
  async function remove(userId, endpoint) {
    await initialize();
    await pool.query('DELETE FROM visitor_push_subscriptions WHERE user_id=$1 AND endpoint=$2', [userId, endpoint]);
  }
  async function removeSession(userId, token, exp) {
    await initialize();
    // Exclusion at delivery also prevents a late in-flight save from undoing logout.
    await pool.query(`INSERT INTO visitor_push_logouts(session_hash,expires_at) VALUES($1,to_timestamp($2))
      ON CONFLICT(session_hash) DO UPDATE SET expires_at=EXCLUDED.expires_at`, [sessionHash(token), exp]);
    await pool.query('DELETE FROM visitor_push_subscriptions WHERE user_id=$1 AND session_hash=$2', [userId, sessionHash(token)]);
  }
  async function isLoggedOut(token) {
    await initialize();
    const { rows } = await pool.query('SELECT 1 FROM visitor_push_logouts WHERE session_hash=$1 AND expires_at>NOW()', [sessionHash(token)]);
    return rows.length > 0;
  }
  async function send(payload, userId, endpoint) {
    const keys = await initialize();
    const result = await pool.query(`SELECT s.endpoint,s.subscription FROM visitor_push_subscriptions s
      JOIN users u ON u.id=s.user_id WHERE u.role='admin' AND u.is_active IS DISTINCT FROM false
      AND s.expires_at>NOW() AND ($1::integer IS NULL OR s.user_id=$1)
      AND ($2::text IS NULL OR s.endpoint=$2) AND s.auth_epoch=$3
      AND NOT EXISTS(SELECT 1 FROM visitor_push_logouts l WHERE l.session_hash=s.session_hash)`, [userId || null, endpoint || null, authEpoch]);
    let delivered = 0;
    // Bound outbound concurrency and remove expired provider subscriptions.
    for (let offset = 0; offset < result.rows.length; offset += 10) {
      await Promise.all(result.rows.slice(offset, offset + 10).map(async row => {
        if (!validSubscription(row.subscription)) return;
        try {
          await sender.sendNotification(row.subscription, JSON.stringify(payload), {
            TTL: 60, urgency: 'high', timeout: 10000,
            vapidDetails: { subject: 'https://readybartending.com', publicKey: keys.public_key, privateKey: keys.private_key },
          });
          delivered++;
        } catch (error) {
          if ([404,410].includes(error.statusCode)) await pool.query('DELETE FROM visitor_push_subscriptions WHERE endpoint=$1', [row.endpoint]);
          else console.error('Visitor push delivery failed:', error.statusCode || 'network error');
        }
      }));
    }
    return delivered;
  }
  async function recordVisit(visitorId) {
    await initialize();
    // A single atomic upsert deduplicates tabs, route changes and simultaneous requests.
    const { rows } = await pool.query(`INSERT INTO visitor_push_visits(visitor_id,last_seen) VALUES($1,NOW())
      ON CONFLICT(visitor_id) DO UPDATE SET last_seen=NOW()
      WHERE visitor_push_visits.last_seen < NOW() - INTERVAL '30 minutes'
      RETURNING visitor_id`, [visitorId]);
    if (!rows.length) {
      await pool.query('UPDATE visitor_push_visits SET last_seen=NOW() WHERE visitor_id=$1', [visitorId]);
    }
    return rows.length > 0;
  }
  async function cleanup() {
    await initialize();
    await pool.query(`DELETE FROM visitor_push_visits WHERE last_seen<NOW()-INTERVAL '1 day';
      DELETE FROM visitor_push_subscriptions WHERE expires_at<=NOW();
      DELETE FROM visitor_push_logouts WHERE expires_at<=NOW();`);
  }
  return { initialize, save, remove, removeSession, isLoggedOut, send, recordVisit, cleanup };
}
