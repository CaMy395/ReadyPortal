import { readFile } from 'node:fs/promises';
import { Router } from 'express';
import {
  discoveryCanonical, discoveryPages, discoverySitemap, getDiscoveryContent, getPublishedEvents, renderDiscovery,
} from '../services/publicDiscovery.js';

export default function publicDiscoveryRouter(pool, indexPath) {
  const router = Router();
  router.get('/', (req, res) => {
    const queryIndex = req.originalUrl.indexOf('?');
    return res.redirect(301, '/rb/home' + (queryIndex < 0 ? '' : req.originalUrl.slice(queryIndex)));
  });

  router.get('/sitemap.xml', async (_req, res) => {
    try {
      const [{ rows }, events] = await Promise.all([
        pool.query(`SELECT page.route, page.is_active, seo.noindex, seo.canonical_url
          FROM site_pages page LEFT JOIN site_page_seo seo USING (page_key)`),
        getPublishedEvents(pool),
      ]);
      const excluded = new Set(rows.filter(row => row.is_active === false || row.noindex ||
        discoveryCanonical(row.route, row.canonical_url).replace(/\/$/, '') !== discoveryCanonical(row.route)
      ).map(row => row.route));
      const paths = Object.keys(discoveryPages).filter(route => !excluded.has(route));
      res.type('xml').send(discoverySitemap([...paths, ...events.map(event => '/rb/events/' + event.slug)]));
    } catch (error) {
      console.error('Discovery sitemap unavailable:', error.code || error.name);
      res.sendStatus(503);
    }
  });

  router.get(Object.keys(discoveryPages), async (req, res, next) => {
    const pathname = req.path.replace(/\/$/, '').toLowerCase();
    let content;
    try {
      content = await getDiscoveryContent(pool, pathname);
      if (pathname === '/rb/events') content.events = await getPublishedEvents(pool);
    } catch (error) {
      console.error('Discovery content unavailable:', error.code || error.name);
      res.set('X-Robots-Tag', 'noindex');
    }
    try {
      res.type('html').send(renderDiscovery(await readFile(indexPath, 'utf8'), pathname, content));
    } catch (error) { next(error); }
  });

  router.get('/rb/events/:slug', async (req, res, next) => {
    try {
      const [event] = await getPublishedEvents(pool, req.params.slug);
      if (!event) return next();
      return res.type('html').send(renderDiscovery(await readFile(indexPath, 'utf8'), req.path, { event }));
    } catch (error) {
      console.error('Discovery event unavailable:', error.code || error.name);
      return next();
    }
  });
  return router;
}
