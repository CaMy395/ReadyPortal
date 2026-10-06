import crypto from 'node:crypto';
import { pageLabel } from './visitorPush.js';

export const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CHAT_KEY = /^[0-9a-f]{64}$/i;
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
export function chatError(status, message) { return Object.assign(new Error(message), { status }); }

export function createLiveVisitorChat(pool) {
  let initialization;
  function initialize() {
    if (!initialization) {
      initialization = pool.query(`CREATE TABLE IF NOT EXISTS live_chat_visitors (
        visitor_id UUID PRIMARY KEY, key_hash TEXT NOT NULL, display_name TEXT NOT NULL DEFAULT 'Anonymous visitor',
        page_label TEXT NOT NULL DEFAULT 'the website', last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        team_active BOOLEAN NOT NULL DEFAULT false, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      ); CREATE TABLE IF NOT EXISTS live_chat_messages (
        id BIGSERIAL PRIMARY KEY, visitor_id UUID NOT NULL REFERENCES live_chat_visitors(visitor_id) ON DELETE CASCADE,
        client_message_id UUID NOT NULL, sender TEXT NOT NULL CHECK(sender IN ('visitor','admin')),
        sender_name TEXT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(visitor_id,client_message_id)
      ); CREATE INDEX IF NOT EXISTS live_chat_message_thread ON live_chat_messages(visitor_id,id);
      CREATE INDEX IF NOT EXISTS live_chat_visitor_seen ON live_chat_visitors(last_seen);`);
      initialization.catch(() => { initialization = undefined; });
    }
    return initialization;
  }
  async function session(id, key, path, name) {
    await initialize();
    const { rows } = await pool.query(`INSERT INTO live_chat_visitors(visitor_id,key_hash,page_label,display_name)
      VALUES($1,$2,$3,$4) ON CONFLICT(visitor_id) DO UPDATE SET last_seen=NOW(),
      page_label=EXCLUDED.page_label,display_name=EXCLUDED.display_name
      WHERE live_chat_visitors.key_hash=EXCLUDED.key_hash RETURNING visitor_id`, [id,digest(key),pageLabel(path),name]);
    if (!rows.length) throw chatError(403, 'This visitor session is unavailable.');
  }
  async function authorize(id, key) {
    await initialize();
    const { rows } = await pool.query('SELECT visitor_id FROM live_chat_visitors WHERE visitor_id=$1 AND key_hash=$2', [id,digest(key)]);
    if (!rows.length) throw chatError(403, 'This visitor session is unavailable.');
  }
  async function presence(id, key, path, name) {
    await initialize();
    const { rowCount } = await pool.query(`UPDATE live_chat_visitors SET last_seen=NOW(),page_label=$3,display_name=$4
      WHERE visitor_id=$1 AND key_hash=$2`, [id,digest(key),pageLabel(path),name]);
    if (!rowCount) throw chatError(403, 'This visitor session is unavailable.');
  }
  async function thread(id, after = '0') {
    await initialize();
    const { rows } = await pool.query(`SELECT visitor_id,display_name,page_label,team_active,last_seen,
      last_seen>NOW()-INTERVAL '45 seconds' AS online FROM live_chat_visitors WHERE visitor_id=$1`, [id]);
    if (!rows.length) throw chatError(404, 'This visitor is no longer available.');
    const messages = await pool.query(`SELECT * FROM (SELECT id,sender,sender_name,content,created_at,client_message_id
      FROM live_chat_messages WHERE visitor_id=$1 AND id>$2 ORDER BY id DESC LIMIT 200) recent ORDER BY id`, [id,after]);
    return { visitor: rows[0], messages: messages.rows };
  }
  async function list() {
    await initialize();
    const { rows } = await pool.query(`SELECT v.visitor_id,v.display_name,v.page_label,v.last_seen,v.team_active,
      v.last_seen>NOW()-INTERVAL '45 seconds' AS online,m.content AS last_message,m.sender AS last_sender,m.created_at AS last_message_at
      FROM live_chat_visitors v LEFT JOIN LATERAL (SELECT content,sender,created_at FROM live_chat_messages
        WHERE visitor_id=v.visitor_id ORDER BY id DESC LIMIT 1) m ON true
      WHERE v.last_seen>NOW()-INTERVAL '1 day' OR v.updated_at>NOW()-INTERVAL '7 days'
      ORDER BY (v.last_seen>NOW()-INTERVAL '45 seconds') DESC,v.updated_at DESC,v.last_seen DESC LIMIT 100`);
    return rows;
  }
  async function message(id, sender, senderName, content, messageId) {
    await initialize();
    const { rows } = await pool.query(`WITH inserted AS (
      INSERT INTO live_chat_messages(visitor_id,client_message_id,sender,sender_name,content)
      SELECT $1,$2,$3,$4,$5 FROM live_chat_visitors WHERE visitor_id=$1
      ON CONFLICT(visitor_id,client_message_id) DO NOTHING RETURNING *
    ), activated AS (
      UPDATE live_chat_visitors SET team_active=true,updated_at=NOW() WHERE visitor_id=$1 AND EXISTS(SELECT 1 FROM inserted)
    ) SELECT id,sender,sender_name,content,created_at,client_message_id FROM inserted`, [id,messageId,sender,senderName,content]);
    if (rows.length) return { message: rows[0], fresh: true };
    const prior = await pool.query(`SELECT id,sender,sender_name,content,created_at,client_message_id FROM live_chat_messages
      WHERE visitor_id=$1 AND client_message_id=$2 AND sender=$3`, [id,messageId,sender]);
    if (!prior.rows.length) throw chatError(409, 'The conversation changed. Refresh and try again.');
    return { message: prior.rows[0], fresh: false };
  }
  async function end(id) {
    await initialize();
    const { rowCount } = await pool.query('UPDATE live_chat_visitors SET team_active=false,updated_at=NOW() WHERE visitor_id=$1', [id]);
    if (!rowCount) throw chatError(404, 'This visitor is no longer available.');
  }
  async function cleanup() {
    await initialize();
    await pool.query(`DELETE FROM live_chat_messages WHERE created_at<NOW()-INTERVAL '30 days';
      DELETE FROM live_chat_visitors WHERE last_seen<NOW()-INTERVAL '30 days' AND updated_at<NOW()-INTERVAL '30 days'`);
  }
  return { initialize, session, authorize, presence, thread, list, message, end, cleanup };
}
