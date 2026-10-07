import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import crypto from 'node:crypto';
import router, { socialMediaRouter } from '../routes/contentStudio.js';
import { createContentStudio, instagramConfig, mediaType, validatePost } from './contentStudio.js';

test('validates dates, captions and real media signatures',()=>{
  const input={title:'Mix N’ Sip',caption:'Cheers',platform:'instagram',media_id:1};
  assert.equal(validatePost(input).title,'Mix N’ Sip');
  for(const patch of [{media_id:'1'},{platform:'snapchat'},{caption:'x'.repeat(2201)},{scheduled_at:'bad'},{scheduled_at:'2020-01-01'}]) assert.throws(()=>validatePost({...input,...patch}));
  assert.equal(mediaType(Buffer.from([255,216,255,224])),'image/jpeg');
  assert.equal(mediaType(Buffer.from('not media')),null);
  assert.equal(mediaType(Buffer.from('0000ftypisom0000')),'video/mp4');
  assert.equal(instagramConfig({}).ready,false);
  assert.equal(instagramConfig({CONTENT_STUDIO_PUBLIC_URL:'http://localhost',INSTAGRAM_USER_ID:'1',INSTAGRAM_ACCESS_TOKEN:'test',INSTAGRAM_API_VERSION:'v25.0'}).ready,false);
});

test('staff may prepare drafts but cannot publish Instagram; unauthenticated requests are rejected',async t=>{
  const secret='test-secret';
  const token=id=>{const payload=Buffer.from(JSON.stringify({sub:id,exp:Date.now()/1000+60})).toString('base64url');return `${payload}.${crypto.createHmac('sha256',secret).update(payload).digest('base64url')}`;};
  let queued=false;
  const pool={query:async(sql,args)=>{
    if(sql.startsWith('ALTER TABLE')) return {rows:[]};
    if(sql.startsWith('SELECT id, role')) return {rows:[{id:args[0],role:args[0]===1?'admin':'user',is_active:true,admin_role_limited:false}]};
    if(sql.includes('JOIN user_admin_access_roles')) return {rows:[{permissions:['social.manage'],locations:[]}]};
    if(sql==='SELECT * FROM social_posts WHERE id=$1') return {rows:[{id:1,platform:'instagram',status:queued?'scheduled':'draft'}]};
    if(sql.startsWith('UPDATE social_posts')) {queued=true;return {rows:[{id:1,status:'scheduled'}],rowCount:1};}
    throw new Error(`Unexpected query: ${sql}`);
  }};
  const app=express();app.use(express.json());app.use('/api/content-studio',router(pool,secret,{initialize:async()=>{},config:()=>({ready:true,account:'Ready'})}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/api/content-studio`;
  const call=(path,id,body)=>fetch(url+path,{method:body?'POST':'GET',headers:{...(id?{Authorization:`Bearer ${token(id)}`} : {}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.equal((await call('/config')).status,401);
  const staff=await (await call('/config',2)).json();assert.equal(staff.canPublish,false);assert.equal(staff.instagramReady,true);
  assert.equal((await call('/posts/1/queue',2,{now:true})).status,403);assert.equal(queued,false);
  assert.equal((await call('/posts/1/queue',1,{now:true})).status,200);assert.equal(queued,true);
  assert.equal((await call('/posts/1/queue',1,{now:true})).status,409);
});

function workerFixture({state='FINISHED',throwPublish=false,throwCreate=false,authorized=true,lock=true,existingContainer=null,configured=true}={}) {
  const calls=[],updates=[];
  let status='scheduled',container=existingContainer;
  const post={id:1,publisher_id:1,mime:'video/mp4',caption:'Cheers',media_token:'a'.repeat(48),cover_token:'b'.repeat(48)};
  const query=async(sql,args=[])=>{
    updates.push({sql,args});
    if(sql.includes('pg_try_advisory_lock')) return {rows:[{locked:lock}]};
    if(sql.startsWith("UPDATE social_posts SET status='processing'")) {status='processing';return {rows:[{id:1}]};}
    if(sql.startsWith('SELECT p.*')) return {rows:[{...post,status,container_id:container}]};
    if(sql.startsWith('SELECT id FROM users')) return {rowCount:authorized?1:0,rows:authorized?[{id:1}]:[]};
    if(sql.startsWith('UPDATE social_posts SET container_id')) container=args[1];
    if(sql.startsWith("UPDATE social_posts SET status='published'")) status='published';
    if(sql.startsWith('UPDATE social_posts SET status=$2')) status=args[1];
    return {rows:[],rowCount:1};
  };
  let released=false;
  const pool={query,connect:async()=>({query,release:()=>{released=true;}})};
  const env=configured?{CONTENT_STUDIO_PUBLIC_URL:'https://ready.example',INSTAGRAM_USER_ID:'account',INSTAGRAM_ACCESS_TOKEN:'secret',INSTAGRAM_API_VERSION:'v25.0'}:{};
  const request=async(url,options)=>{
    calls.push({url,options});
    if(url.endsWith('/media_publish')) {if(throwPublish) throw new Error('Timeout');return {ok:true,json:async()=>({id:'published-id'})};}
    if(url.includes('?fields=')) return {ok:true,json:async()=>({status_code:state})};
    if(throwCreate) throw new Error('Timeout');
    return {ok:true,json:async()=>({id:'container-id'})};
  };
  return {service:createContentStudio(pool,{env,request}),calls,updates,status:()=>status,released:()=>released};
}
test('Instagram worker publishes once using server-only credentials and the stored cover',async()=>{
  const f=workerFixture();await f.service.tick();assert.equal(f.status(),'published');assert.equal(f.calls.length,3);
  const params=f.calls[0].options.body;
  assert.equal(params.get('media_type'),'REELS');assert.equal(params.get('cover_url'),'https://ready.example/api/social-media/'+'b'.repeat(48));
  assert.equal(params.get('access_token'),null);assert.ok(f.calls.every(c=>!c.url.includes('secret')));assert.equal(f.released(),true);
});
test('processing media is polled without creating a second container',async()=>{
  const f=workerFixture({state:'IN_PROGRESS',existingContainer:'existing'});await f.service.tick();assert.equal(f.calls.length,1);assert.equal(f.status(),'processing');
});
test('uncertain publish results require review instead of automatic retry',async()=>{
  const f=workerFixture({throwPublish:true});await f.service.tick();assert.equal(f.status(),'review');assert.equal(f.calls.filter(c=>c.url.endsWith('/media_publish')).length,1);
});
test('unconfigured or locked workers never call Instagram',async()=>{
  for(const options of [{configured:false},{lock:false}]) {const f=workerFixture(options);await f.service.tick();assert.equal(f.calls.length,0);assert.equal(f.released(),true);}
});

test('revoking publishing access stops provider calls and fails the queued post',async()=>{
  const f=workerFixture({authorized:false});await f.service.tick();
  assert.equal(f.calls.length,0);assert.equal(f.status(),'failed');
});

test('uncertain container creation requires review without automatic recreation',async()=>{
  const f=workerFixture({throwCreate:true});await f.service.tick();
  assert.equal(f.calls.length,1);assert.equal(f.status(),'review');
});

test('media share links support video ranges and reject unknown or malformed links',async t=>{
  const token='a'.repeat(48),data=Buffer.from('0123456789');
  const pool={query:async(_sql,args)=>({rows:args[0]===token?[{mime:'video/mp4',data}]:[]})};
  const app=express();app.use('/api/social-media',socialMediaRouter(pool,{initialize:async()=>{}}));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  t.after(()=>new Promise(resolve=>server.close(resolve)));
  const url=`http://127.0.0.1:${server.address().port}/api/social-media/`;
  const partial=await fetch(url+token,{headers:{Range:'bytes=2-5'}});
  assert.equal(partial.status,206);assert.equal(partial.headers.get('content-range'),'bytes 2-5/10');assert.equal(await partial.text(),'2345');
  const whole=await fetch(url+token);assert.equal(whole.status,200);assert.equal(await whole.text(),'0123456789');
  assert.equal((await fetch(url+token,{headers:{Range:'bytes=20-30'}})).status,416);
  assert.equal((await fetch(url+token,{headers:{Range:'bytes=1-2,4-5'}})).status,416);
  assert.equal((await fetch(url+'b'.repeat(48))).status,404);
  assert.equal((await fetch(url+'invalid')).status,404);
});
