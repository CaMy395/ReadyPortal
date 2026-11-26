import { Router } from 'express';
import { createGoogleMarketing } from '../services/googleMarketing.js';
import { loadMarketingReport, reportingPeriods } from '../services/marketingReporting.js';
import { permits } from '../services/adminAccess.js';

export default function marketingRouter(pool) {
  const router = Router();
  const google = createGoogleMarketing(pool);
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!permits(req.adminAccess, 'marketing.view')) return res.sendStatus(403);
    req.periods = reportingPeriods(req.query.start, req.query.end);
    if (!req.periods) return res.status(400).json({ error: 'Select a valid date range of up to 366 days.' });
    return next();
  });
  const handle = callback => async (req, res) => {
    try { await callback(req, res); }
    catch (error) {
      console.error('Marketing Intelligence:', error.code || error.name);
      res.status(503).json({ error: 'Marketing data is temporarily unavailable.' });
    }
  };
  router.get('/', handle(async (req, res) => {
    const [report, connections] = await Promise.all([
      loadMarketingReport(pool, req.periods),
      google.status(req.periods),
    ]);
    res.json({ ...report, connections, periods: req.periods, canSync: Boolean(req.adminAccess.fullAdmin) });
  }));
  router.post('/sync/:provider', handle(async (req, res) => {
    if (!req.adminAccess.fullAdmin) return res.sendStatus(403);
    const result = await google.sync(req.params.provider, req.periods);
    if (!result) return res.sendStatus(404);
    return res.json(result);
  }));
  return router;
}
