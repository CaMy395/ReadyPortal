import express from 'express';
import { loadAccess } from '../services/adminAccess.js';

export const OAUTH_COOKIE = '__Secure-ready-instagram';
export const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/api/instagram/callback', maxAge: 10*60*1000 };
export default function instagramConnectionRouter(pool, connection) {
  const router = express.Router();
  router.get('/callback', async (req, res) => {
    res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    const finish = status => connection.settings.origin
      ? res.redirect(303, `${connection.settings.origin}/admin/content-studio?instagram=${status}`)
      : res.status(503).send('Instagram setup is incomplete.');
    const cookie = String(req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith(`${OAUTH_COOKIE}=`))?.slice(OAUTH_COOKIE.length+1);
    const { maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie(OAUTH_COOKIE, clearOptions);
    try {
      const userId = await connection.consume(req.query.state, cookie);
      if (!userId || !(await loadAccess(pool, userId))?.fullAdmin) return finish('expired');
      if (req.query.error) return finish('cancelled');
      await connection.connect(req.query.code, userId);
      return finish('connected');
    } catch { return finish('failed'); }
  });
  return router;
}
