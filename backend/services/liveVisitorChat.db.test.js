import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import pg from 'pg';
import dotenv from 'dotenv';
import { createLiveVisitorChat } from './liveVisitorChat.js';

test('PostgreSQL live presence, private visitor keys, idempotent delivery and handover', { skip:process.env.RUN_VISITOR_PUSH_DB_TEST!=='1' },async () => {
  assert.notEqual(process.env.NODE_ENV,'production');
  dotenv.config({ path:'.env' });
  const client=new pg.Client({ user:process.env.DB_USER,host:process.env.DB_HOST,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,port:Number(process.env.DB_PORT || 5432),connectionTimeoutMillis:5000 });
  const schema=`live_chat_test_${crypto.randomBytes(8).toString('hex')}`;
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query(`CREATE SCHEMA ${schema}`);
    await client.query(`SET LOCAL search_path TO ${schema}`);
    const chat=createLiveVisitorChat(client);
    const id=crypto.randomUUID(),key=crypto.randomBytes(32).toString('hex');
    await chat.session(id,key,'/rb/weddings?secret=token','Anonymous visitor');
    await chat.authorize(id,key);
    await assert.rejects(chat.authorize(id,'a'.repeat(64)),{ status:403 });
    await assert.rejects(chat.session(id,'a'.repeat(64),'/rb/home','Spoofed visitor'),{ status:403 });
    const initial=await chat.thread(id);
    assert.equal(initial.visitor.online,true);
    assert.equal(initial.visitor.page_label,'weddings');
    assert.equal(initial.visitor.team_active,false);
    assert.deepEqual(initial.messages,[]);
    const messageId=crypto.randomUUID();
    const greeting=await chat.message(id,'admin','Ready team','Hello!',messageId);
    assert.equal(greeting.fresh,true);
    assert.equal((await chat.message(id,'admin','Ready team','Hello!',messageId)).fresh,false);
    let thread=await chat.thread(id);
    assert.equal(thread.messages.length,1);
    assert.equal(thread.visitor.team_active,true);
    const reply=await chat.message(id,'visitor','Anonymous visitor','Thank you',crypto.randomUUID());
    assert.equal((await chat.thread(id,greeting.message.id)).messages[0].id,reply.message.id);
    await chat.end(id);
    await chat.message(id,'admin','Ready team','Hello!',messageId); // A retry never reopens a closed thread.
    assert.equal((await chat.thread(id)).visitor.team_active,false);
    await client.query("UPDATE live_chat_visitors SET last_seen=NOW()-INTERVAL '46 seconds' WHERE visitor_id=$1",[id]);
    assert.equal((await chat.thread(id)).visitor.online,false);
    await chat.presence(id,key,'/rb/client-save-card?private=secret','Verified user');
    thread=await chat.thread(id);
    assert.equal(thread.visitor.online,true);
    assert.equal(thread.visitor.page_label,'the website');
    assert.equal(thread.visitor.display_name,'Verified user');
    const listed=await chat.list();
    assert.equal(listed[0].last_message,'Thank you');
    assert.equal(listed[0].last_sender,'visitor');
    assert.equal(Object.hasOwn(listed[0],'key_hash'),false);
    await client.query("UPDATE live_chat_messages SET created_at=NOW()-INTERVAL '31 days'");
    await chat.cleanup();
    assert.equal((await chat.thread(id)).messages.length,0);
    await client.query("UPDATE live_chat_visitors SET last_seen=NOW()-INTERVAL '31 days',updated_at=NOW()-INTERVAL '31 days'");
    await chat.cleanup();
    await assert.rejects(chat.thread(id),{ status:404 });
  } finally { await client.query('ROLLBACK'); await client.end(); }
});
