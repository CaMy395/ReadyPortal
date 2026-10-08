import crypto from 'node:crypto';
import { open } from 'node:fs/promises';

export const MAX_MEDIA_BYTES = 1_000_000_000;
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MEDIA_CHUNK_BYTES = 1024 * 1024;
export const MEDIA_LIMIT_MESSAGE = 'Use a JPEG or PNG up to 50 MB, or an MP4 video up to 1 GB.';
export function mediaType(buffer) {
  if (buffer?.subarray(0, 3).equals(Buffer.from([255, 216, 255]))) return 'image/jpeg';
  if (buffer?.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (buffer?.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp' && !/avif|heic|mif1/.test(buffer.toString('ascii', 8, 12))) return 'video/mp4';
  return null;
}
export function validatePost(body, now = Date.now()) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const caption = typeof body.caption === 'string' ? body.caption : '';
  if (!title || title.length > 120) throw new Error('Enter a title of up to 120 characters.');
  if (caption.length > 2200) throw new Error('Captions can contain up to 2,200 characters.');
  if (!['instagram', 'tiktok'].includes(body.platform)) throw new Error('Choose Instagram or TikTok.');
  if (!Number.isSafeInteger(body.media_id) || body.media_id < 1) throw new Error('Upload a photo or video first.');
  if (body.cover_id != null && (!Number.isSafeInteger(body.cover_id) || body.cover_id < 1)) throw new Error('Invalid cover.');
  const scheduledAt = body.scheduled_at ? new Date(body.scheduled_at) : null;
  if (scheduledAt && (!Number.isFinite(scheduledAt.getTime()) || scheduledAt.getTime() <= now)) throw new Error('Choose a future posting time.');
  return { title, caption, platform: body.platform, mediaId: body.media_id, coverId: body.cover_id || null, scheduledAt };
}

export function instagramConfig(env = process.env) {
  let origin;
  try { const u = new URL(env.CONTENT_STUDIO_PUBLIC_URL); if (u.protocol === 'https:' && !u.username && !u.password) origin = u.origin; } catch {}
  return { ready: Boolean(origin && env.INSTAGRAM_USER_ID && env.INSTAGRAM_ACCESS_TOKEN && /^v\d+\.\d+$/.test(env.INSTAGRAM_API_VERSION || '')),
    origin, account: env.INSTAGRAM_ACCOUNT_LABEL || 'Ready Instagram', version: env.INSTAGRAM_API_VERSION,
    userId: env.INSTAGRAM_USER_ID, token: env.INSTAGRAM_ACCESS_TOKEN };
}

export function createContentStudio(pool, { env = process.env, request = fetch, connectionProvider } = {}) {
  let savedConnection;
  const refreshConnection = async () => { if (connectionProvider) savedConnection = await connectionProvider(); };
  let initialized;
  const initialize = () => {
    if (!initialized) initialized = pool.query(`
      CREATE TABLE IF NOT EXISTS social_media_assets (
        id SERIAL PRIMARY KEY, token TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        mime TEXT NOT NULL, data BYTEA NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      ALTER TABLE social_media_assets ADD COLUMN IF NOT EXISTS byte_size BIGINT;
      CREATE TABLE IF NOT EXISTS social_media_chunks (
        asset_id INTEGER NOT NULL REFERENCES social_media_assets(id) ON DELETE CASCADE,
        sequence INTEGER NOT NULL, data BYTEA NOT NULL,
        PRIMARY KEY (asset_id, sequence)
      );
      CREATE TABLE IF NOT EXISTS social_posts (
        id SERIAL PRIMARY KEY, title TEXT NOT NULL, caption TEXT NOT NULL DEFAULT '',
        platform TEXT NOT NULL CHECK (platform IN ('instagram','tiktok')),
        media_id INTEGER NOT NULL REFERENCES social_media_assets(id),
        cover_id INTEGER REFERENCES social_media_assets(id),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','planned','ready','scheduled','processing','publishing','published','failed','review')),
        scheduled_at TIMESTAMPTZ, publisher_id INTEGER REFERENCES users(id),
        container_id TEXT, remote_id TEXT, last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS social_posts_due ON social_posts(status, scheduled_at);`).catch(error => { initialized = null; throw error; });
    return initialized;
  };
  const config = () => {
    const base = instagramConfig(env);
    return savedConnection ? { ...base, ...savedConnection, ready: Boolean(savedConnection.ready && base.origin && /^v\d+\.\d+$/.test(base.version || '')) } : base;
  };
  const graph = async (resource, body) => {
    const c = config();
    const host=c.graphHost==='graph.facebook.com'?'graph.facebook.com':'graph.instagram.com';
    const url=new URL(`https://${host}/${c.version}/${resource}`);
    if (host==='graph.facebook.com' && c.appSecretProof) url.searchParams.set('appsecret_proof',c.appSecretProof);
    const response = await request(url.toString(), {
      method: body ? 'POST' : 'GET', headers: { Authorization: `Bearer ${c.token}`, ...(body ? { 'Content-Type':'application/x-www-form-urlencoded' } : {}) },
      ...(body ? { body: new URLSearchParams(body) } : {}), signal: AbortSignal.timeout(30000),
    });
    const result = await response.json();
    // Never propagate provider messages that could include tokens or asset URLs.
    if (!response.ok || result.error) throw new Error(`Instagram request failed (${response.status}). Check account permissions and media format.`);
    return result;
  };
  const publicUrl = token => `${config().origin}/api/social-media/${token}`;
  async function tick() {
    await initialize();
    await refreshConnection();
    const client = await pool.connect();
    let locked = false;
    try {
      locked = (await client.query('SELECT pg_try_advisory_lock(7340192) AS locked')).rows[0].locked;
      if (!locked) return;
      await client.query("UPDATE social_posts SET status='ready',updated_at=NOW() WHERE platform='tiktok' AND status='planned' AND scheduled_at<=NOW()");
      if (!config().ready) return;
      // An interrupted create/publish can have succeeded remotely. Never retry blindly.
      await client.query(`UPDATE social_posts SET status='review',last_error='Check Instagram before creating another post.',updated_at=NOW()
        WHERE (status='publishing' OR (status='processing' AND container_id IS NULL)) AND updated_at<NOW()-INTERVAL '15 minutes'`);
      const due = await client.query(`UPDATE social_posts SET status='processing',updated_at=NOW()
        WHERE id IN (SELECT id FROM social_posts WHERE platform='instagram' AND status='scheduled' AND scheduled_at<=NOW() ORDER BY scheduled_at LIMIT 3) RETURNING id`);
      const active = await client.query(`SELECT p.*,m.token AS media_token,m.mime,c.token AS cover_token FROM social_posts p
        JOIN social_media_assets m ON m.id=p.media_id LEFT JOIN social_media_assets c ON c.id=p.cover_id
        WHERE p.platform='instagram' AND p.status='processing' AND (p.container_id IS NOT NULL OR p.id=ANY($1::int[])) ORDER BY p.id LIMIT 10`, [due.rows.map(p => p.id)]);
      for (const post of active.rows) {
        let publishing = false, creating = false;
        try {
          const owner = await client.query("SELECT id FROM users WHERE id=$1 AND role='admin' AND is_active IS DISTINCT FROM false AND admin_role_limited=false", [post.publisher_id]);
          if (!owner.rowCount) throw new Error('Publishing administrator no longer has access.');
          if (!post.container_id) {
            const body = { caption: post.caption };
            if (post.mime === 'video/mp4') { body.media_type = 'REELS'; body.video_url = publicUrl(post.media_token); body.share_to_feed = 'true'; if (post.cover_token) body.cover_url = publicUrl(post.cover_token); }
            else body.image_url = publicUrl(post.media_token);
            creating = true;
            const container = await graph(`${config().userId}/media`, body);
            if (!container.id) throw new Error('Instagram did not return a media container.');
            post.container_id = container.id;
            await client.query('UPDATE social_posts SET container_id=$2,updated_at=NOW() WHERE id=$1', [post.id, container.id]);
          }
          const state = await graph(`${post.container_id}?fields=status_code`);
          if (state.status_code === 'IN_PROGRESS') continue;
          if (state.status_code !== 'FINISHED') throw new Error('Instagram media processing failed or expired.');
          await client.query("UPDATE social_posts SET status='publishing',updated_at=NOW() WHERE id=$1", [post.id]);
          publishing = true;
          const result = await graph(`${config().userId}/media_publish`, { creation_id: post.container_id });
          if (!result.id) throw new Error('Instagram did not return a published post ID.');
          await client.query("UPDATE social_posts SET status='published',remote_id=$2,last_error=NULL,updated_at=NOW() WHERE id=$1", [post.id,result.id]);
        } catch (error) {
          const uncertain = publishing || (creating && !post.container_id);
          await client.query('UPDATE social_posts SET status=$2,last_error=$3,updated_at=NOW() WHERE id=$1', [post.id, uncertain ? 'review' : 'failed', uncertain ? 'Check Instagram before creating another post. The publishing result is uncertain.' : error.message]);
        }
      }
    } finally { try { if (locked) await client.query('SELECT pg_advisory_unlock(7340192)'); } finally { client.release(); } }
  }
  return { initialize, config, tick, refreshConnection, async saveAsset(file) {
    if (!file?.path) throw new Error(MEDIA_LIMIT_MESSAGE);
    const source = await open(file.path, 'r');
    let client;
    try {
      const header = Buffer.alloc(16);
      await source.read(header,0,header.length,0);
      const size = (await source.stat()).size, mime = mediaType(header);
      if (!mime || size > (mime === 'video/mp4' ? MAX_MEDIA_BYTES : MAX_IMAGE_BYTES)) throw new Error(MEDIA_LIMIT_MESSAGE);
      await initialize();
      client = await pool.connect();
      await client.query('BEGIN');
      const result = await client.query('INSERT INTO social_media_assets(token,name,mime,data,byte_size) VALUES($1,$2,$3,$4,$5) RETURNING id,name,mime',
        [crypto.randomBytes(24).toString('hex'), String(file.originalname || 'media').replace(/[\r\n]/g,'').slice(0,160),mime,Buffer.alloc(0),size]);
      const asset = result.rows[0];
      for (let position=0,sequence=0;position<size;sequence++) {
        const chunk = Buffer.alloc(Math.min(MEDIA_CHUNK_BYTES,size-position));
        let filled=0;
        while (filled<chunk.length) {
          const {bytesRead}=await source.read(chunk,filled,chunk.length-filled,position+filled);
          if (!bytesRead) throw new Error('Incomplete media upload');
          filled+=bytesRead;
        }
        await client.query('INSERT INTO social_media_chunks(asset_id,sequence,data) VALUES($1,$2,$3)',[asset.id,sequence,chunk]);
        position+=filled;
      }
      await client.query('COMMIT');
      return asset;
    } catch(error) {
      if (client) await client.query('ROLLBACK').catch(()=>{});
      throw error;
    } finally { client?.release(); await source.close(); }
  } };
}
