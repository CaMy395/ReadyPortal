import express from 'express';
import { verifyAccessToken } from '../services/adminAccess.js';
import { createVisitorPush, validSubscription, pageLabel } from '../services/visitorPush.js';

export default function visitorPushRouter(pool, secret, { service = createVisitorPush(pool, undefined, secret), origins = [] } = {}) {
  const router = express.Router();
  const rates = new Map();
  const wrap = handler => async (req, res, next) => {
    try { await handler(req, res, next); }
    catch (error) {
      console.error('Visitor notifications unavailable:', error.code || error.name);
      if (!res.headersSent) res.status(503).json({ error: 'Visitor notifications are unavailable. Try again shortly.' });
    }
  };
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.headers.origin && !origins.includes(req.headers.origin)) return res.sendStatus(403);
    next();
  });
  router.post('/visit', wrap(async (req, res) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.body.visitorId || '')) {
      return res.status(400).json({ error: 'Invalid visitor session.' });
    }
    const now = Date.now();
    // Render's last proxy address is used only for a short-lived abuse counter, never stored.
    const address = String(req.headers['x-forwarded-for'] || req.ip).split(',').pop().trim();
    if (rates.size >= 10000) for (const [key, value] of rates) if (value.until <= now) rates.delete(key);
    const rate = rates.get(address) || { count: 0, until: now + 60000 };
    if (rate.until <= now) { rate.count = 0; rate.until = now + 60000; }
    rate.count++;
    if (!rates.has(address) && rates.size >= 10000) return res.sendStatus(429);
    rates.set(address, rate);
    if (rate.count > 60) return res.sendStatus(429);
    if (/bot|crawler|spider|headless/i.test(req.headers['user-agent'] || '')) return res.sendStatus(204);
    const fresh = await service.recordVisit(req.body.visitorId);
    if (!fresh) return res.sendStatus(204);
    const identity = verifyAccessToken(req.headers.authorization, secret);
    let visitor = 'Anonymous visitor';
    if (identity) {
      const { rows } = await pool.query('SELECT name,username FROM users WHERE id=$1 AND is_active IS DISTINCT FROM false', [identity.sub]);
      if (rows[0]) visitor = String(rows[0].name || rows[0].username || 'A signed-in visitor').replace(/[\r\n]/g, ' ').slice(0,80);
    }
    res.sendStatus(202);
    // Push can finish after the visitor response without slowing the public website.
    await service.send({ title: 'Someone is on the Ready site', body: `${visitor} opened ${pageLabel(req.body.path)}.`,
      tag: `visit-${req.body.visitorId}-${now}`, url: `/admin/live-visitors?visitor=${req.body.visitorId}` });
  }));

  router.use(wrap(async (req, res, next) => {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const identity = verifyAccessToken(req.headers.authorization, secret);
    if (!identity) return res.status(401).json({ error: 'Please sign in again.' });
    const { rows } = await pool.query('SELECT id,role,is_active FROM users WHERE id=$1', [identity.sub]);
    if (rows[0]?.role !== 'admin' || rows[0]?.is_active === false) return res.status(403).json({ error: 'Admin access is required.' });
    if (req.path !== '/logout' && await service.isLoggedOut(token)) return res.status(401).json({ error: 'Please sign in again to enable notifications.' });
    req.pushIdentity = identity;
    req.pushToken = token;
    next();
  }));
  router.get('/config', wrap(async (_req, res) => {
    const keys = await service.initialize();
    res.json({ publicKey: keys.public_key });
  }));
  router.post('/subscription', wrap(async (req, res) => {
    if (!validSubscription(req.body.subscription)) return res.status(400).json({ error: 'Invalid push subscription.' });
    await service.save(req.pushIdentity.sub, req.pushIdentity, req.pushToken, req.body.subscription);
    res.json({ enabled: true });
  }));
  router.delete('/subscription', wrap(async (req, res) => {
    if (typeof req.body.endpoint !== 'string') return res.sendStatus(400);
    await service.remove(req.pushIdentity.sub, req.body.endpoint);
    res.json({ enabled: false });
  }));
  router.post('/logout', wrap(async (req, res) => {
    await service.removeSession(req.pushIdentity.sub, req.pushToken, req.pushIdentity.exp);
    res.sendStatus(204);
  }));
  router.post('/test', wrap(async (req, res) => {
    if (typeof req.body.endpoint !== 'string') return res.sendStatus(400);
    const delivered = await service.send({ title: 'Ready visitor alerts are on',
      body: 'This phone will receive notifications when someone visits the site while you are signed in.',
      tag: 'ready-visitor-test', url: '/admin/dashboard' }, req.pushIdentity.sub, req.body.endpoint);
    if (!delivered) return res.status(502).json({ error: 'The test could not be delivered. Try enabling notifications again.' });
    res.json({ sent: true });
  }));
  return router;
}
