import express from 'express';
import multer from 'multer';
import { loadAccess, permits, verifyAccessToken } from '../services/adminAccess.js';
import { createContentStudio, MAX_MEDIA_BYTES, validatePost } from '../services/contentStudio.js';

export default function contentStudioRouter(pool, secret, service = createContentStudio(pool)) {
  const router = express.Router();
  const wrap = fn => async (req,res,next) => { try { await fn(req,res,next); } catch (error) { console.error('Content Studio:', error.code || error.name); res.status(503).json({error:'Content Studio is unavailable. Please try again.'}); } };
  router.use(wrap(async (req,res,next) => {
    res.set('Cache-Control','no-store');
    const identity = verifyAccessToken(req.headers.authorization,secret);
    if (!identity) return res.status(401).json({error:'Please sign in again.'});
    req.studioAccess = await loadAccess(pool,identity.sub);
    if (!permits(req.studioAccess,'social.manage')) return res.status(403).json({error:'Content Studio access is required.'});
    await service.initialize(); next();
  }));
  router.get('/config',(req,res) => { const c=service.config(); res.json({instagramReady:c.ready,instagramAccount:c.account,canPublish:req.studioAccess.fullAdmin,tiktokMode:'manual'}); });
  const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:MAX_MEDIA_BYTES,files:1,fields:0}}).single('file');
  router.post('/media',(req,res,next) => upload(req,res,error => error ? res.status(400).json({error:'Upload one JPEG, PNG or MP4 file up to 50 MB.'}) : next()),wrap(async (req,res) => {
    try { res.status(201).json(await service.saveAsset(req.file)); }
    catch(error) { if(error.message.startsWith('Use a')) return res.status(400).json({error:error.message}); throw error; }
  }));
  router.get('/media/:id',wrap(async (req,res) => {
    if(!/^\d+$/.test(req.params.id)) return res.sendStatus(400);
    const {rows}=await pool.query('SELECT name,mime,data FROM social_media_assets WHERE id=$1',[req.params.id]);
    if(!rows[0]) return res.sendStatus(404);
    res.type(rows[0].mime).send(rows[0].data);
  }));
  router.get('/posts',wrap(async (_req,res) => {
    const {rows}=await pool.query('SELECT p.*,m.name AS media_name,m.mime FROM social_posts p JOIN social_media_assets m ON m.id=p.media_id ORDER BY p.created_at DESC LIMIT 100'); res.json(rows);
  }));
  const savePost = wrap(async (req,res) => {
    if(req.params.id && !/^\d+$/.test(req.params.id)) return res.sendStatus(400);
    let post; try { post=validatePost(req.body); } catch(error) { return res.status(400).json({error:error.message}); }
    const {rows}=await pool.query('SELECT id,mime FROM social_media_assets WHERE id=ANY($1::int[])',[[post.mediaId,...(post.coverId?[post.coverId]:[])]]);
    const media=rows.find(a=>a.id===post.mediaId),cover=rows.find(a=>a.id===post.coverId);
    if(!media || (post.coverId && cover?.mime!=='image/jpeg')) return res.status(400).json({error:'Upload valid media and a JPEG cover.'});
    if(post.platform==='instagram' && media.mime==='image/png') return res.status(400).json({error:'Use a JPEG for Instagram photo posts.'});
    const args=[post.title,post.caption,post.platform,post.mediaId,post.coverId,post.scheduledAt];
    const result = req.params.id
      ? await pool.query("UPDATE social_posts SET title=$1,caption=$2,platform=$3,media_id=$4,cover_id=$5,scheduled_at=$6,updated_at=NOW() WHERE id=$7 AND status='draft' RETURNING *",[...args,req.params.id])
      : await pool.query('INSERT INTO social_posts(title,caption,platform,media_id,cover_id,scheduled_at) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',args);
    if(!result.rowCount) return res.status(409).json({error:'Only drafts can be edited.'});
    res.status(req.params.id?200:201).json(result.rows[0]);
  });
  router.post('/posts',savePost);
  router.put('/posts/:id',savePost);
  router.post('/posts/:id/queue',wrap(async (req,res) => {
    if(!/^\d+$/.test(req.params.id)) return res.sendStatus(400);
    const {rows}=await pool.query('SELECT * FROM social_posts WHERE id=$1',[req.params.id]); const post=rows[0];
    if(!post) return res.sendStatus(404);
    if(post.status!=='draft') return res.status(409).json({error:'Only drafts can be queued.'});
    if(post.platform==='instagram' && (!req.studioAccess.fullAdmin || !service.config().ready)) return res.status(403).json({error:'An administrator must configure Instagram before publishing.'});
    let when = req.body.now ? new Date() : new Date(post.scheduled_at);
    if(!req.body.now && (!post.scheduled_at || when.getTime()<=Date.now())) return res.status(400).json({error:'Choose a future time when saving the draft, or use Publish now.'});
    const status=post.platform==='instagram'?'scheduled':req.body.now?'ready':'planned';
    const result=await pool.query("UPDATE social_posts SET status=$2,scheduled_at=$3,publisher_id=$4,updated_at=NOW() WHERE id=$1 AND status='draft' RETURNING *",[post.id,status,when,req.studioAccess.userId]);
    if(!result.rowCount) return res.status(409).json({error:'This draft has already been queued.'});
    res.json(result.rows[0]);
  }));
  router.post('/posts/:id/cancel',wrap(async (req,res) => {
    if(!/^\d+$/.test(req.params.id)) return res.sendStatus(400);
    const result=await pool.query("UPDATE social_posts SET status='draft',scheduled_at=NULL,updated_at=NOW() WHERE id=$1 AND status IN ('scheduled','planned','ready') RETURNING *",[req.params.id]);
    if(!result.rowCount) return res.status(409).json({error:'This post cannot be cancelled.'}); res.json(result.rows[0]);
  }));
  router.post('/posts/:id/posted',wrap(async (req,res) => {
    if(!/^\d+$/.test(req.params.id)) return res.sendStatus(400);
    const result=await pool.query("UPDATE social_posts SET status='published',updated_at=NOW() WHERE id=$1 AND platform='tiktok' AND status='ready' RETURNING *",[req.params.id]);
    if(!result.rowCount) return res.status(409).json({error:'Only a ready TikTok post can be marked posted.'}); res.json(result.rows[0]);
  }));
  router.delete('/posts/:id',wrap(async (req,res) => {
    if(!/^\d+$/.test(req.params.id)) return res.sendStatus(400);
    const result=await pool.query("DELETE FROM social_posts WHERE id=$1 AND status='draft' RETURNING id",[req.params.id]);
    if(!result.rowCount) return res.status(409).json({error:'Only drafts can be deleted.'}); res.sendStatus(204);
  }));
  return router;
}

// Capability URLs allow Meta to fetch only a selected asset, without portal credentials.
export function socialMediaRouter(pool, service) {
  const router=express.Router();
  router.get('/:token',async(req,res)=>{
    if(!/^[a-f0-9]{48}$/.test(req.params.token)) return res.sendStatus(404);
    try {
      await service.initialize();
      const {rows}=await pool.query('SELECT mime,data FROM social_media_assets WHERE token=$1',[req.params.token]);
      if(!rows[0]) return res.sendStatus(404);
      const data=rows[0].data;
      res.set({'Cache-Control':'private, max-age=300','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'}).type(rows[0].mime);
      if(req.headers.range) {
        const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);
        const start=range?Number(range[1]):-1,end=range&&range[2]?Number(range[2]):data.length-1;
        if(!range || start<0 || start>=data.length || end<start) return res.status(416).set('Content-Range',`bytes */${data.length}`).end();
        const last=Math.min(end,data.length-1);
        return res.status(206).set('Content-Range',`bytes ${start}-${last}/${data.length}`).send(data.subarray(start,last+1));
      }
      res.send(data);
    } catch { res.sendStatus(503); }
  }); return router;
}
