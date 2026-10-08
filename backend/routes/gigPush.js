import express from 'express';
import { verifyAccessToken } from '../services/adminAccess.js';
import { validSubscription } from '../services/visitorPush.js';

export default function gigPushRouter(pool, secret, { service, origins = [] }) {
  const router = express.Router();
  const wrap = handler => async (req, res, next) => {
    try { await handler(req, res, next); }
    catch (error) {
      console.error('Staff gig notifications unavailable:', error.code || error.name);
      if (!res.headersSent) res.status(503).json({ error: 'Gig notifications are unavailable. Try again shortly.' });
    }
  };
  router.use(wrap(async (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (req.headers.origin && !origins.includes(req.headers.origin)) return res.sendStatus(403);
    const identity = verifyAccessToken(req.headers.authorization, secret);
    if (!identity) return res.status(401).json({ error: 'Please sign in again.' });
    const { rows } = await pool.query('SELECT id,role,is_active FROM users WHERE id=$1', [identity.sub]);
    if (!['user','student','admin'].includes(rows[0]?.role) || rows[0]?.is_active === false) return res.status(403).json({ error: 'An active staff account is required.' });
    const token = String(req.headers.authorization).replace(/^Bearer\s+/i, '');
    if (req.path !== '/logout' && await service.isLoggedOut(token)) return res.status(401).json({ error: 'Please sign in again to enable gig alerts.' });
    req.gigPushIdentity = identity;
    req.gigPushToken = token;
    next();
  }));
  router.get('/config', wrap(async (_req, res) => {
    const keys = await service.initialize();
    res.json({ publicKey: keys.public_key });
  }));
  router.post('/status', wrap(async (req, res) => {
    if (typeof req.body.endpoint !== 'string') return res.sendStatus(400);
    res.json({ enabled: await service.subscribed(req.gigPushIdentity.sub, req.body.endpoint) });
  }));
  router.post('/subscription', wrap(async (req, res) => {
    if (!validSubscription(req.body.subscription)) return res.status(400).json({ error: 'Invalid push subscription.' });
    await service.save(req.gigPushIdentity.sub, req.gigPushToken, req.body.subscription);
    res.json({ enabled: true });
  }));
  router.delete('/subscription', wrap(async (req, res) => {
    if (typeof req.body.endpoint !== 'string') return res.sendStatus(400);
    await service.remove(req.gigPushIdentity.sub, req.body.endpoint);
    res.json({ enabled: false });
  }));
  router.post('/logout', wrap(async (req, res) => {
    await service.removeSession(req.gigPushIdentity.sub, req.gigPushToken, req.gigPushIdentity.exp);
    res.sendStatus(204);
  }));
  router.post('/test', wrap(async (req, res) => {
    if (typeof req.body.endpoint !== 'string') return res.sendStatus(400);
    const delivered = await service.send({}, { userId: req.gigPushIdentity.sub, endpoint: req.body.endpoint, test: true });
    if (!delivered) return res.status(502).json({ error: 'The test could not be delivered. Enable gig notifications and try again.' });
    res.json({ sent: true });
  }));
  return router;
}
