import express from 'express';
import { verifyAccessToken } from '../services/adminAccess.js';
import { CHAT_KEY, VISITOR_ID, chatError, createLiveVisitorChat } from '../services/liveVisitorChat.js';

export default function liveVisitorChatRouter(pool, secret, { service = createLiveVisitorChat(pool), push, origins = [] } = {}) {
  const router = express.Router();
  const counters = new Map();
  const wrap = handler => async (req,res,next) => {
    try { await handler(req,res,next); }
    catch (error) {
      if (!error.status) console.error('Live visitor chat unavailable:', error.code || error.name);
      if (!res.headersSent) res.status(error.status || 503).json({ error: error.status ? error.message : 'Live chat is unavailable. Please try again.' });
    }
  };
  router.use((req,res,next) => {
    res.set('Cache-Control','no-store');
    if (req.headers.origin && !origins.includes(req.headers.origin)) return res.sendStatus(403);
    const now = Date.now();
    if (counters.size >= 10000) for (const [id,rate] of counters) if (rate.until<=now) counters.delete(id);
    const address = String(req.headers['x-forwarded-for'] || req.ip).split(',').pop().trim();
    const rate = counters.get(address) || { until: now+60000, reads: 0, sends: 0 };
    if (rate.until<=now) { rate.until=now+60000; rate.reads=0; rate.sends=0; }
    if (!counters.has(address) && counters.size>=10000) return res.sendStatus(429);
    counters.set(address,rate);
    rate.reads++;
    if (req.path.endsWith('/messages') && req.method==='POST') rate.sends++;
    if (rate.reads>600 || rate.sends>30) return res.status(429).json({ error: 'Please wait a moment before sending more messages.' });
    next();
  });
  async function account(header) {
    const identity = verifyAccessToken(header,secret);
    if (!identity) return null;
    const { rows } = await pool.query('SELECT id,role,is_active,name,username FROM users WHERE id=$1', [identity.sub]);
    return rows[0]?.is_active!==false ? rows[0] : null;
  }
  const name = user => user ? String(user.name || user.username || 'Signed-in visitor').replace(/[\r\n]/g,' ').slice(0,80) : 'Anonymous visitor';
  router.use('/visitor',wrap(async (req,res,next) => {
    const id = req.body?.visitorId || req.query.visitorId;
    const key = req.headers['x-ready-chat-key'];
    if (!VISITOR_ID.test(id || '') || typeof key!=='string' || !CHAT_KEY.test(key)) throw chatError(400,'Invalid visitor session.');
    req.visitorId=id; req.visitorKey=key;
    if (req.path!=='/session') await service.authorize(id,key);
    next();
  }));
  router.post('/visitor/session',wrap(async (req,res) => {
    await service.session(req.visitorId,req.visitorKey,req.body.path,name(await account(req.headers.authorization)));
    res.json({ ready: true });
  }));
  router.post('/visitor/presence',wrap(async (req,res) => {
    await service.presence(req.visitorId,req.visitorKey,req.body.path,name(await account(req.headers.authorization)));
    res.sendStatus(204);
  }));
  const cursor = req => {
    const after=String(req.query.after || '0');
    if (!/^\d{1,18}$/.test(after)) throw chatError(400,'Invalid message cursor.');
    return after;
  };
  router.get('/visitor/messages',wrap(async (req,res) => res.json(await service.thread(req.visitorId,cursor(req)))));
  const messageInput = req => {
    const content = typeof req.body?.content==='string' ? req.body.content.trim() : '';
    if (!content || content.length>2000 || !VISITOR_ID.test(req.body.messageId || '')) throw chatError(400,'Enter a message of up to 2,000 characters.');
    return content;
  };
  router.post('/visitor/messages',wrap(async (req,res) => {
    const content=messageInput(req);
    const snapshot=await service.thread(req.visitorId);
    const result=await service.message(req.visitorId,'visitor',snapshot.visitor.display_name,content,req.body.messageId);
    res.json(result);
    if (result.fresh && push) await push.send({ title: 'New message from a site visitor',
      body: `${snapshot.visitor.display_name} sent a message. Tap to reply.`,
      tag: `chat-${req.visitorId}-${result.message.id}`, url: `/admin/live-visitors?visitor=${req.visitorId}` });
  }));
  router.use('/admin',wrap(async (req,res,next) => {
    const user=await account(req.headers.authorization);
    if (!user) throw chatError(401,'Please sign in again.');
    if (user.role!=='admin') throw chatError(403,'Admin access is required.');
    req.chatAdmin=user; next();
  }));
  router.get('/admin/visitors',wrap(async (_req,res) => res.json({ visitors: await service.list() })));
  router.use('/admin/visitors/:visitorId',wrap(async (req,res,next) => {
    if (!VISITOR_ID.test(req.params.visitorId)) throw chatError(400,'Invalid visitor.');
    req.chatVisitorId=req.params.visitorId; next();
  }));
  router.get('/admin/visitors/:visitorId/messages',wrap(async (req,res) => res.json(await service.thread(req.chatVisitorId,cursor(req)))));
  router.post('/admin/visitors/:visitorId/messages',wrap(async (req,res) => {
    const content=messageInput(req);
    await service.thread(req.chatVisitorId); // Missing visitors fail without creating a thread.
    res.json(await service.message(req.chatVisitorId,'admin',name(req.chatAdmin),content,req.body.messageId));
  }));
  router.post('/admin/visitors/:visitorId/end',wrap(async (req,res) => {
    await service.end(req.chatVisitorId); res.json({ ended: true });
  }));
  return router;
}
