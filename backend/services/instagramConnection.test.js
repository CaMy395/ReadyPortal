import test from 'node:test';
import assert from 'node:assert/strict';
import { connectionSettings, encryptToken, decryptToken, createInstagramConnection } from './instagramConnection.js';
import express from 'express';
import callbackRouter from '../routes/instagramConnection.js';

const env = { CONTENT_STUDIO_PUBLIC_URL:'https://ready.example', INSTAGRAM_APP_ID:'app', INSTAGRAM_APP_SECRET:'app-secret', INSTAGRAM_API_VERSION:'v25.0', INSTAGRAM_TOKEN_ENCRYPTION_KEY:'a'.repeat(64) };
test('setup requires server credentials and authenticated encryption detects tampering', () => {
  assert.equal(connectionSettings({}).ready,false);
  assert.equal(connectionSettings(env).ready,true);
  const key=Buffer.from(env.INSTAGRAM_TOKEN_ENCRYPTION_KEY,'hex'), encrypted=encryptToken('private-token',key);
  assert.ok(!encrypted.includes('private-token'));assert.equal(decryptToken(encrypted,key),'private-token');
  assert.throws(()=>decryptToken(encrypted,Buffer.alloc(32)));
});
test('OAuth state is browser-bound, expiring and consumed only once; tokens stay encrypted', async () => {
  let stateRow,connectionRow;const calls=[];
  const pool={query:async(sql,args=[])=>{
    sql=sql.trimStart();
    if(sql.startsWith('CREATE') || sql.startsWith('DELETE FROM instagram_oauth_states WHERE expires_at')) return {rows:[]};
    if(sql.startsWith('INSERT INTO instagram_oauth_states')) {stateRow={state:args[0],browser:args[1],user:args[2]};return {rows:[]};}
    if(sql.startsWith('DELETE FROM instagram_oauth_states WHERE state_hash')) {
      if(!stateRow || args[0]!==stateRow.state || args[1]!==stateRow.browser) return {rows:[]};
      const id=stateRow.user;stateRow=null;return {rows:[{user_id:id}]};
    }
    if(sql.startsWith('SELECT user_id')) return {rows:connectionRow?[connectionRow]:[]};
    if(sql.startsWith('INSERT INTO instagram_connection')) {connectionRow={user_id:args[0],username:args[1],encrypted_token:args[2],expires_at:args[3]};return {rows:[]};}
    if(sql.startsWith('SELECT * FROM instagram_connection')) return {rows:connectionRow?[connectionRow]:[]};
    throw new Error('Unexpected query');
  }};
  const results=[{access_token:'short'},{access_token:'long-private',expires_in:5184000},{user_id:'42',username:'ready'}];
  const connection=createInstagramConnection(pool,{env,request:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>results.shift()};}});
  const start=await connection.start(1),url=new URL(start.url),state=url.searchParams.get('state');
  assert.equal(url.origin,'https://www.instagram.com');assert.equal(url.searchParams.get('redirect_uri'),'https://ready.example/api/instagram/callback');
  assert.match(url.searchParams.get('scope'),/instagram_business_content_publish/);
  assert.equal(await connection.consume(state,'b'.repeat(64)),null);
  assert.equal(await connection.consume(state,start.browser),1);
  assert.equal(await connection.consume(state,start.browser),null);
  await connection.connect('code',1);
  assert.ok(!connectionRow.encrypted_token.includes('long-private'));
  const creds=await connection.credentials();assert.equal(creds.token,'long-private');assert.equal(creds.account,'@ready');
  connectionRow.expires_at=new Date(0);assert.equal((await connection.credentials()).ready,false);
  assert.equal(calls[0].options.body.get('client_secret'),'app-secret');
});
test('callback rejects revoked admin access and redirects only a generic result', async t => {
  let connected=false;
  const pool={query:async sql=>sql.startsWith('SELECT id, role')?{rows:[{id:1,role:'user',is_active:true}]}:{rows:[]}};
  const connection={settings:{origin:'https://ready.example'},consume:async()=>1,connect:async()=>{connected=true;}};
  const app=express();app.use('/api/instagram',callbackRouter(pool,connection));
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
  const response=await fetch(`http://127.0.0.1:${server.address().port}/api/instagram/callback?state=state&code=secret`,{redirect:'manual'});
  assert.equal(response.status,303);assert.equal(response.headers.get('location'),'https://ready.example/admin/content-studio?instagram=expired');
  assert.equal(connected,false);assert.match(response.headers.get('set-cookie'),/HttpOnly/);assert.match(response.headers.get('set-cookie'),/Secure/);
});

test('Facebook login binds a configured Page, verifies publishing access, and encrypts the saved token',async()=>{
  const fbEnv={...env,INSTAGRAM_LOGIN_PROVIDER:'facebook',FACEBOOK_LOGIN_CONFIG_ID:'config',INSTAGRAM_FACEBOOK_PAGE_ID:'page'};
  assert.equal(connectionSettings({...fbEnv,INSTAGRAM_FACEBOOK_PAGE_ID:''}).ready,false);
  let row;const calls=[];
  const pool={query:async(sql,args=[])=>{
    if(sql.startsWith('SELECT user_id')) return {rows:[]};
    if(sql.startsWith('INSERT INTO instagram_connection')) row={user_id:args[0],username:args[1],encrypted_token:args[2],expires_at:args[3],login_provider:args[5]};
    if(sql.startsWith('SELECT *')) return {rows:row?[row]:[]};
    return {rows:[]};
  }};
  const permissions=['instagram_basic','instagram_content_publishing','pages_show_list','pages_read_engagement','business_management'];
  const responses=()=>[{access_token:'short'},{access_token:'long-private',expires_in:5184000},{data:permissions.map(permission=>({permission,status:'granted'}))},{id:'page',instagram_business_account:{id:'42'}},{id:'42',username:'ready'}];
  let results=responses();
  const connection=createInstagramConnection(pool,{env:fbEnv,request:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>results.shift()};}});
  const start=await connection.start(1),auth=new URL(start.url);
  assert.equal(auth.origin,'https://www.facebook.com');assert.equal(auth.pathname,'/v25.0/dialog/oauth');assert.equal(auth.searchParams.get('config_id'),'config');
  await connection.connect('code',1);
  const creds=await connection.credentials();assert.equal(creds.userId,'42');assert.equal(creds.graphHost,'graph.facebook.com');assert.equal(creds.token,'long-private');assert.equal(row.login_provider,'facebook');
  assert.ok(!row.encrypted_token.includes('long-private'));assert.match(creds.appSecretProof,/^[a-f0-9]{64}$/);
  assert.ok(calls.slice(2).every(call=>call.options.headers.Authorization==='Bearer long-private' && !call.url.includes('long-private')));
  row=undefined;results=responses();results[3]={id:'different',instagram_business_account:{id:'99'}};
  await assert.rejects(()=>connection.connect('code',1),/configured Facebook Page/);assert.equal(row,undefined);
  results=responses();results[2].data=results[2].data.filter(p=>p.permission!=='instagram_content_publishing');
  await assert.rejects(()=>connection.connect('code',1),/required Instagram publishing/);assert.equal(row,undefined);
});
