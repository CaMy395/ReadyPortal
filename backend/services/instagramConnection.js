import crypto from 'node:crypto';

const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export function connectionSettings(env) {
  let origin;
  try { const url = new URL(env.CONTENT_STUDIO_PUBLIC_URL); if (url.protocol === 'https:' && !url.username && !url.password) origin = url.origin; } catch {}
  const key = /^[a-f0-9]{64}$/i.test(env.INSTAGRAM_TOKEN_ENCRYPTION_KEY || '') ? Buffer.from(env.INSTAGRAM_TOKEN_ENCRYPTION_KEY, 'hex') : null;
  const loginProvider = env.INSTAGRAM_LOGIN_PROVIDER || 'instagram';
  const facebook = loginProvider === 'facebook';
  return { origin, key, appId: env.INSTAGRAM_APP_ID, appSecret: env.INSTAGRAM_APP_SECRET,
    loginProvider, configId: env.FACEBOOK_LOGIN_CONFIG_ID, pageId: env.INSTAGRAM_FACEBOOK_PAGE_ID,
    version: env.INSTAGRAM_API_VERSION, callback: origin ? `${origin}/api/instagram/callback` : null,
    ready: Boolean(['instagram','facebook'].includes(loginProvider) && origin && key && env.INSTAGRAM_APP_ID && env.INSTAGRAM_APP_SECRET && (!facebook || (env.FACEBOOK_LOGIN_CONFIG_ID && env.INSTAGRAM_FACEBOOK_PAGE_ID)) && /^v\d+\.\d+$/.test(env.INSTAGRAM_API_VERSION || '')) };
}
export function encryptToken(token, key) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('ready-instagram-v1'));
  const data = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(part => part.toString('base64url')).join('.');
}
export function decryptToken(value, key) {
  const [iv, tag, data] = value.split('.').map(part => Buffer.from(part, 'base64url'));
  const cipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('ready-instagram-v1')); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}

export function createInstagramConnection(pool, { env = process.env, request = fetch } = {}) {
  const settings = connectionSettings(env);
  let initialized;
  const initialize = () => initialized ||= pool.query(`
    CREATE TABLE IF NOT EXISTS instagram_oauth_states (
      state_hash TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, user_id INTEGER NOT NULL REFERENCES users(id),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS instagram_connection (
      id INTEGER PRIMARY KEY CHECK(id=1), user_id TEXT NOT NULL, username TEXT NOT NULL,
      encrypted_token TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL,
      refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), connected_by INTEGER REFERENCES users(id)
    );
    ALTER TABLE instagram_connection ADD COLUMN IF NOT EXISTS login_provider TEXT NOT NULL DEFAULT 'instagram';`).catch(error => { initialized = null; throw error; });
  const provider = async (url, options = {}) => {
    const response = await request(url, { ...options, signal: AbortSignal.timeout(30000) });
    const body = await response.json();
    if (!response.ok || body.error || body.error_type) throw new Error('Instagram authorization failed. Please try connecting again.');
    return body;
  };
  async function start(userId) {
    if (!settings.ready) throw new Error('Complete the one-time Meta app setup first.');
    await initialize();
    const state = crypto.randomBytes(32).toString('hex'), browser = crypto.randomBytes(32).toString('hex');
    await pool.query('DELETE FROM instagram_oauth_states WHERE expires_at<NOW()');
    await pool.query('INSERT INTO instagram_oauth_states(state_hash,browser_hash,user_id,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL \'10 minutes\')', [digest(state), digest(browser), userId]);
    const facebook = settings.loginProvider === 'facebook';
    const url = new URL(facebook ? `https://www.facebook.com/${settings.version}/dialog/oauth` : 'https://www.instagram.com/oauth/authorize');
    url.search = new URLSearchParams(facebook ? {client_id:settings.appId,redirect_uri:settings.callback,response_type:'code',config_id:settings.configId,override_default_response_type:'true',state} : { client_id: settings.appId, redirect_uri: settings.callback,
      response_type: 'code', scope: 'instagram_business_basic,instagram_business_content_publish',
      enable_fb_login: '0', force_authentication: '1', state }).toString();
    return { url: url.toString(), browser };
  }
  async function consume(state, browser) {
    if (!/^[a-f0-9]{64}$/.test(state || '') || !/^[a-f0-9]{64}$/.test(browser || '')) return null;
    await initialize();
    const result = await pool.query('DELETE FROM instagram_oauth_states WHERE state_hash=$1 AND browser_hash=$2 AND expires_at>NOW() RETURNING user_id', [digest(state), digest(browser)]);
    return result.rows[0]?.user_id || null;
  }
  async function connect(code, userId) {
    if (!settings.ready || typeof code !== 'string' || !code || code.length > 4096) throw new Error('Invalid Instagram authorization.');
    if (settings.loginProvider === 'facebook') return connectFacebook(code,userId);
    const short = await provider('https://api.instagram.com/oauth/access_token', { method: 'POST',
      body: new URLSearchParams({ client_id: settings.appId, client_secret: settings.appSecret, grant_type: 'authorization_code', redirect_uri: settings.callback, code }) });
    if (!short.access_token) throw new Error('Instagram did not grant access.');
    const exchange = new URL('https://graph.instagram.com/access_token');
    exchange.search = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: settings.appSecret, access_token: short.access_token }).toString();
    const long = await provider(exchange.toString());
    if (!long.access_token || !Number.isFinite(long.expires_in) || long.expires_in <= 0) throw new Error('Instagram did not grant long-lived access.');
    const profile = await provider(`https://graph.instagram.com/${settings.version}/me?fields=user_id,username`, { headers: { Authorization: `Bearer ${long.access_token}` } });
    if (!profile.user_id || !profile.username) throw new Error('Use an Instagram Business or Creator account.');
    await save(profile,long,userId,'instagram');
  }
  async function connectFacebook(code,userId) {
    const base=`https://graph.facebook.com/${settings.version}`;
    const exchange=async params=>{const url=new URL(`${base}/oauth/access_token`);url.search=new URLSearchParams(params).toString();return provider(url.toString());};
    const short=await exchange({client_id:settings.appId,client_secret:settings.appSecret,redirect_uri:settings.callback,code});
    if (!short.access_token) throw new Error('Facebook did not grant access.');
    const long=await exchange({grant_type:'fb_exchange_token',client_id:settings.appId,client_secret:settings.appSecret,fb_exchange_token:short.access_token});
    if (!long.access_token || !Number.isFinite(long.expires_in) || long.expires_in<=0) throw new Error('Facebook did not grant long-lived access.');
    const proof=crypto.createHmac('sha256',settings.appSecret).update(long.access_token).digest('hex');
    const headers={Authorization:`Bearer ${long.access_token}`};
    const permissions=await provider(`${base}/me/permissions?appsecret_proof=${proof}`,{headers});
    const granted=new Set((permissions.data || []).filter(p=>p.status==='granted').map(p=>p.permission));
    if (!['instagram_basic','pages_show_list','pages_read_engagement','business_management'].every(p=>granted.has(p)) || !['instagram_content_publish','instagram_content_publishing'].some(p=>granted.has(p))) throw new Error('Grant the required Instagram publishing and Page permissions.');
    // Query the explicitly configured Page; never pick an arbitrary account from a user's Pages.
    const page=await provider(`${base}/${encodeURIComponent(settings.pageId)}?fields=id,instagram_business_account&appsecret_proof=${proof}`,{headers});
    if (String(page.id)!==String(settings.pageId) || !page.instagram_business_account?.id) throw new Error('Link the configured Facebook Page to an Instagram professional account.');
    const profile=await provider(`${base}/${encodeURIComponent(page.instagram_business_account.id)}?fields=id,username&appsecret_proof=${proof}`,{headers});
    if (!profile.id || !profile.username) throw new Error('Instagram account was not returned.');
    await save({user_id:profile.id,username:profile.username},long,userId,'facebook');
  }
  async function save(profile,long,userId,loginProvider) {
    // Keep existing queued posts tied to the account they were prepared for.
    const existing = await pool.query('SELECT user_id FROM instagram_connection WHERE id=1');
    if (existing.rows[0] && existing.rows[0].user_id !== String(profile.user_id)) throw new Error('Reconnect the same Instagram account. Account switching requires clearing the posting queue first.');
    await pool.query(`INSERT INTO instagram_connection(id,user_id,username,encrypted_token,expires_at,connected_by,login_provider)
      VALUES(1,$1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET user_id=$1,username=$2,encrypted_token=$3,expires_at=$4,connected_by=$5,login_provider=$6,refreshed_at=NOW()`,
      [String(profile.user_id), profile.username, encryptToken(long.access_token, settings.key), new Date(Date.now() + long.expires_in * 1000), userId,loginProvider]);
  }
  async function credentials() {
    await initialize();
    const { rows } = await pool.query('SELECT * FROM instagram_connection WHERE id=1');
    const row = rows[0];
    if (!row) return null;
    // An expired or unreadable saved connection must never fall back to old env credentials.
    if (!settings.key || new Date(row.expires_at) <= new Date()) return { ready: false, account: `@${row.username}`, reconnect: true };
    try {
      const token=decryptToken(row.encrypted_token,settings.key),facebook=row.login_provider==='facebook';
      if (facebook && (!settings.appSecret || settings.loginProvider!=='facebook')) return {ready:false,account:`@${row.username}`,reconnect:true};
      return { ready: true, userId: row.user_id, token, graphHost:facebook?'graph.facebook.com':'graph.instagram.com',
        ...(facebook?{appSecretProof:crypto.createHmac('sha256',settings.appSecret).update(token).digest('hex')}:{}),
        account: `@${row.username}`, expiresAt: row.expires_at, reconnect: false };
    }
    catch { return { ready: false, account: `@${row.username}`, reconnect: true }; }
  }
  async function refresh() {
    await initialize();
    if (!settings.ready) return;
    // Atomic timestamp claim prevents duplicate refreshes across workers and retries hourly.
    const { rows } = await pool.query(`UPDATE instagram_connection SET refreshed_at=NOW()
      WHERE id=1 AND login_provider='instagram' AND expires_at>NOW() AND expires_at<NOW()+INTERVAL '30 days'
      AND refreshed_at<NOW()-INTERVAL '24 hours' RETURNING *`);
    if (!rows[0]) return;
    const row = rows[0], token = decryptToken(row.encrypted_token, settings.key);
    const url = new URL('https://graph.instagram.com/refresh_access_token');
    url.search = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: token }).toString();
    const result = await provider(url.toString());
    if (!result.access_token || !Number.isFinite(result.expires_in) || result.expires_in <= 0) throw new Error('Reconnect Instagram to renew access.');
    await pool.query('UPDATE instagram_connection SET encrypted_token=$1,expires_at=$2 WHERE id=1 AND encrypted_token=$3',
      [encryptToken(result.access_token, settings.key), new Date(Date.now()+result.expires_in*1000), row.encrypted_token]);
  }
  return { settings, start, consume, connect, credentials, refresh };
}
