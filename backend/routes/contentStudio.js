import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { loadAccess, permits, verifyAccessToken } from '../services/adminAccess.js';
import { createContentStudio, MAX_MEDIA_BYTES, MEDIA_CHUNK_BYTES, MEDIA_LIMIT_MESSAGE, validatePost } from '../services/contentStudio.js';
import { OAUTH_COOKIE, cookieOptions } from './instagramConnection.js';

export default function contentStudioRouter(pool, secret, service = createContentStudio(pool), connection) {
  const router = express.Router();
  const wrap = fn => async (req,res,next) => { try { await fn(req,res,next); } catch (error) { console.error('Content Studio:', error.code || error.name); res.status(503).json({error:'Content Studio is unavailable. Please try again.'}); } };
  router.use(wrap(async (req,res,next) => {
    res.set('Cache-Control','no-store');
    const identity = verifyAccessToken(req.headers.authorization,secret);
    if (!identity) return res.status(401).json({error:'Please sign in again.'});
    req.studioAccess = await loadAccess(pool,identity.sub);
    if (!permits(req.studioAccess,'social.manage')) return res.status(403).json({error:'Content Studio access is required.'});
    await service.initialize(); await service.refreshConnection?.(); next();
  }));
  router.get('/config',(req,res) => { const c=service.config(); res.json({instagramReady:c.ready,instagramAccount:c.account,canPublish:req.studioAccess.fullAdmin,tiktokMode:'manual',
    canConnect:req.studioAccess.fullAdmin, instagramConnectReady:Boolean(connection?.settings.ready), instagramReconnect:Boolean(c.reconnect), instagramLoginProvider:connection?.settings.loginProvider || 'instagram',
    ...(req.studioAccess.fullAdmin ? {instagramCallback:connection?.settings.callback || 'https://www.readybartending.com/api/instagram/callback'} : {}) }); });
  router.post('/instagram/connect', wrap(async (req,res) => {
    if (!req.studioAccess.fullAdmin) return res.status(403).json({error:'Only a full administrator can connect Instagram.'});
    if (!connection?.settings.ready) return res.status(503).json({error:'Complete the one-time Meta app setup first.'});
    const result = await connection.start(req.studioAccess.userId);
    res.cookie(OAUTH_COOKIE,result.browser,cookieOptions);
    res.json({url:result.url});
  }));
  const storage={
    _handleFile(req,file,done) {
      const filePath=path.join(os.tmpdir(),`ready-studio-${crypto.randomBytes(24).toString('hex')}`);
      const output=createWriteStream(filePath,{flags:'wx',mode:0o600});
      const abort=()=>file.stream.destroy(new Error('Upload interrupted'));
      req.once('aborted',abort);
      pipeline(file.stream,output).then(()=>done(null,{path:filePath,size:output.bytesWritten}),async error=>{
        await unlink(filePath).catch(()=>{});done(error);
      }).finally(()=>req.off('aborted',abort));
      if(req.aborted) abort();
    },
    _removeFile(_req,file,done) {unlink(file.path).then(()=>done(),done);}
  };
  const upload = multer({storage,limits:{fileSize:MAX_MEDIA_BYTES,files:1,fields:0}}).single('file');
  let activeUploads=0;
  router.post('/media',async(req,res)=>{
    if(activeUploads>=2) return res.status(429).json({error:'Two uploads are already running. Please try again shortly.'});
    activeUploads++;
    try {
      await new Promise((resolve,reject)=>upload(req,res,error=>error?reject(error):resolve()));
      if(req.aborted) return;
      res.status(201).json(await service.saveAsset(req.file));
    } catch(error) {
      if(res.destroyed) return;
      if(error instanceof multer.MulterError || error.message===MEDIA_LIMIT_MESSAGE) res.status(400).json({error:MEDIA_LIMIT_MESSAGE});
      else {console.error('Content Studio upload:',error.code || error.name);res.status(503).json({error:'Upload could not be saved. Please try again.'});}
    } finally {
      if(req.file?.path) await unlink(req.file.path).catch(()=>{});
      activeUploads--;
    }
  });
  router.get('/media/:id',wrap(async (req,res) => {
    if(!/^\d+$/.test(req.params.id)) return res.sendStatus(400);
    const {rows}=await pool.query('SELECT id,mime,byte_size,COALESCE(byte_size,octet_length(data)) AS size FROM social_media_assets WHERE id=$1',[req.params.id]);
    if(!rows[0]) return res.sendStatus(404);
    try { await sendAsset(pool,rows[0],req,res); } catch { if(res.headersSent) res.destroy(); else res.sendStatus(503); }
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
      const {rows}=await pool.query('SELECT id,mime,byte_size,COALESCE(byte_size,octet_length(data)) AS size FROM social_media_assets WHERE token=$1',[req.params.token]);
      if(!rows[0]) return res.sendStatus(404);
      res.set('Cache-Control','private, max-age=300');
      await sendAsset(pool,rows[0],req,res);
    } catch { if(res.headersSent) res.destroy(); else res.sendStatus(503); }
  }); return router;
}

async function sendAsset(pool,asset,req,res) {
  const size=Number(asset.size);
  let start=0,end=size-1;
  res.set({'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'}).type(asset.mime);
  if(req.headers.range) {
    const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(range && (range[1] || range[2])) {
      if(!range[1]) start=Math.max(0,size-Number(range[2]));
      else {start=Number(range[1]);if(range[2]) end=Math.min(end,Number(range[2]));}
    } else start=-1;
    if(!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start<0 || start>=size || end<start)
      return res.status(416).set('Content-Range',`bytes */${size}`).end();
    res.status(206).set('Content-Range',`bytes ${start}-${end}/${size}`);
  }
  res.set('Content-Length',String(Math.max(0,end-start+1)));
  if(req.method==='HEAD') return res.end();
  async function* chunks() {
    for(let offset=start;offset<=end;) {
      if(res.destroyed) return;
      const sequence=Math.floor(offset/MEDIA_CHUNK_BYTES),within=offset%MEDIA_CHUNK_BYTES;
      const length=Math.min(MEDIA_CHUNK_BYTES-within,end-offset+1);
      // Legacy assets remain readable without ever loading their entire BYTEA.
      const {rows}=asset.byte_size==null
        ? await pool.query('SELECT substring(data FROM $2::int FOR $3::int) AS data FROM social_media_assets WHERE id=$1',[asset.id,offset+1,length])
        : await pool.query('SELECT substring(data FROM $3::int FOR $4::int) AS data FROM social_media_chunks WHERE asset_id=$1 AND sequence=$2',[asset.id,sequence,within+1,length]);
      const data=rows[0]?.data;
      if(!data || data.length!==length) throw new Error('Incomplete stored media');
      yield data;
      offset+=length;
    }
  }
  await pipeline(Readable.from(chunks()),res);
}
