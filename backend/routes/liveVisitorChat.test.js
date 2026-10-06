import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import liveVisitorChatRouter from './liveVisitorChat.js';
import { chatError } from '../services/liveVisitorChat.js';

const secret='live-chat-tests';
function token(sub,exp=Date.now()/1000+3600) {
  const payload=Buffer.from(JSON.stringify({ sub,role:'admin',exp })).toString('base64url');
  return `${payload}.${crypto.createHmac('sha256',secret).update(payload).digest('base64url')}`;
}
test('visitor chat is private, admins can greet visitors, and visitor replies send deep-linked pushes once',async t => {
  const threads=new Map(),sent=[];
  const users=new Map([[1,{ id:1,name:'Admin One',role:'admin',is_active:true }],[2,{ id:2,name:'Staff',role:'user',is_active:true }],[3,{ id:3,name:'Inactive',role:'admin',is_active:false }]]);
  const pool={ query:async (_sql,params) => ({ rows:users.has(params[0]) ? [users.get(params[0])] : [] }) };
  const service={
    session:async (id,key,_path,name) => {
      if (threads.has(id) && threads.get(id).key!==key) throw chatError(403,'Invalid visitor key');
      if (!threads.has(id)) threads.set(id,{ key,visitor:{ visitor_id:id,display_name:name,page_label:'weddings',team_active:false,online:true },messages:[] });
    },
    authorize:async (id,key) => { if (threads.get(id)?.key!==key) throw chatError(403,'Invalid visitor key'); },
    presence:async () => {},
    thread:async id => { if (!threads.has(id)) throw chatError(404,'No visitor'); return threads.get(id); },
    list:async () => Array.from(threads.values(),thread => thread.visitor),
    message:async (id,sender,senderName,content,messageId) => {
      const thread=threads.get(id);
      const existing=thread.messages.find(message => message.client_message_id===messageId);
      if (existing) return { message:existing,fresh:false };
      const message={ id:thread.messages.length+1,sender,sender_name:senderName,content,client_message_id:messageId };
      thread.messages.push(message); thread.visitor.team_active=true;
      return { message,fresh:true };
    },
    end:async id => { threads.get(id).visitor.team_active=false; },
  };
  const app=express(); app.use(express.json());
  app.use('/api/live-chat',liveVisitorChatRouter(pool,secret,{ service,push:{ send:async payload => sent.push(payload) },origins:['https://readybartending.com'] }));
  const server=await new Promise(resolve => { const s=app.listen(0,'127.0.0.1',() => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  async function call(path,{ body,auth,key,origin,method=body ? 'POST':'GET' }={}) {
    return fetch(`http://127.0.0.1:${server.address().port}/api/live-chat${path}`,{ method,
      headers:{ 'Content-Type':'application/json',...(auth ? { Authorization:`Bearer ${auth}` }:{}),...(key ? { 'X-Ready-Chat-Key':key }:{}),...(origin ? { Origin:origin }:{}) },
      ...(body ? { body:JSON.stringify(body) }:{}),
    });
  }
  const visitorId=crypto.randomUUID(),key=crypto.randomBytes(32).toString('hex');
  assert.equal((await call('/visitor/session',{ key,body:{ visitorId,path:'/rb/weddings',display_name:'Forged Admin',role:'admin' } })).status,200);
  assert.equal(threads.get(visitorId).visitor.display_name,'Anonymous visitor');
  assert.equal((await call(`/visitor/messages?visitorId=${visitorId}`)).status,400);
  assert.equal((await call(`/visitor/messages?visitorId=${visitorId}`,{ key:'a'.repeat(64) })).status,403);
  assert.equal((await call('/visitor/session',{ key:'a'.repeat(64),body:{ visitorId,path:'/' } })).status,403);
  assert.equal((await call(`/visitor/messages?visitorId=${crypto.randomUUID()}`,{ key })).status,403);
  assert.equal((await call(`/visitor/messages?visitorId=${visitorId}&after=bad`,{ key })).status,400);
  assert.equal((await call('/admin/visitors')).status,401);
  assert.equal((await call('/admin/visitors',{ auth:token(2) })).status,403);
  assert.equal((await call('/admin/visitors',{ auth:token(3) })).status,401);
  assert.equal((await call('/admin/visitors',{ auth:token(1,1) })).status,401);
  assert.equal((await call('/admin/visitors',{ auth:token(1),origin:'https://evil.test' })).status,403);
  const greeting=await call(`/admin/visitors/${visitorId}/messages`,{ auth:token(1),body:{ messageId:crypto.randomUUID(),content:'Hello! How can I help?',sender_name:'Spoofed',sender:'visitor' } });
  assert.equal(greeting.status,200);
  assert.equal((await greeting.json()).message.sender_name,'Admin One');
  const snapshot=await call(`/visitor/messages?visitorId=${visitorId}`,{ key });
  const data=await snapshot.json();
  assert.equal(data.visitor.team_active,true);
  assert.equal(data.messages[0].content,'Hello! How can I help?');
  const body={ visitorId,messageId:crypto.randomUUID(),content:'Could you help me book?',sender:'admin' };
  const response=await call('/visitor/messages',{ key,body });
  assert.equal(response.status,200);
  assert.equal((await response.json()).message.sender,'visitor');
  assert.equal(sent[0].url,`/admin/live-visitors?visitor=${visitorId}`);
  assert.equal(sent[0].body.includes(body.content),false);
  assert.equal((await call('/visitor/messages',{ key,body })).status,200);
  assert.equal(sent.length,1);
  assert.equal((await call('/visitor/messages',{ key,body:{ ...body,content:'x'.repeat(2001) } })).status,400);
  assert.equal((await call(`/admin/visitors/${visitorId}/end`,{ auth:token(1),body:{} })).status,200);
  assert.equal(threads.get(visitorId).visitor.team_active,false);
  users.get(1).role='user';
  assert.equal((await call(`/admin/visitors/${visitorId}/messages`,{ auth:token(1) })).status,403);
});
