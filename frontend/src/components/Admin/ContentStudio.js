import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE_URL } from '../../apiConfig';
import './ContentStudio.css';

const empty = { title:'', caption:'', platform:'instagram', media_id:null, cover_id:null, scheduled_at:'' };
async function request(path, options={}) {
  const response=await fetch(`${API_BASE_URL}/api/content-studio${path}`,options);
  const body=response.status===204?null:await response.json();
  if(!response.ok) throw new Error(body?.error || 'Unable to complete this request.');
  return body;
}
const json = body => ({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

function MediaPreview({id,mime}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{
    setUrl('');
    if(!id) return undefined;
    let active=true,objectUrl;
    fetch(`${API_BASE_URL}/api/content-studio/media/${id}`).then(response=>{
      if(!response.ok) throw new Error('Preview unavailable'); return response.blob();
    }).then(blob=>{ if(active) {objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);} }).catch(()=>{});
    return ()=>{active=false;if(objectUrl) URL.revokeObjectURL(objectUrl);};
  },[id]);
  if(!url) return <div className="studio-media-empty">{id?'Loading preview…':'Add your next Ready moment'}</div>;
  return mime==='video/mp4'?<video className="studio-preview" src={url} controls playsInline preload="metadata"/>:<img className="studio-preview" src={url} alt="Post preview"/>;
}

export default function ContentStudio() {
  const [form,setForm]=useState(empty),[media,setMedia]=useState(null),[cover,setCover]=useState(null);
  const [posts,setPosts]=useState([]),[config,setConfig]=useState(null),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[filter,setFilter]=useState('all');
  const [editing,setEditing]=useState(null);
  const [showSetup,setShowSetup]=useState(false);
  const refresh=useCallback(async()=>{
    const [items,settings]=await Promise.all([request('/posts'),request('/config')]);setPosts(items);setConfig(settings);
  },[]);
  useEffect(()=>{
    refresh().catch(e=>setError(e.message));
    const timer=setInterval(()=>refresh().catch(()=>{}),30000);return ()=>clearInterval(timer);
  },[refresh]);
  useEffect(()=>{
    const url=new URL(window.location.href),status=url.searchParams.get('instagram');
    if(!status) return;
    if(status==='connected') setNotice('Instagram connected. You can publish from Content Studio.');
    else setError(status==='cancelled'?'Instagram connection was cancelled.':status==='expired'?'The connection link expired. Please try again.':'Instagram could not be connected. Check the Meta app setup and try again.');
    url.searchParams.delete('instagram');window.history.replaceState(null,'',url.pathname+url.search+url.hash);
  },[]);
  const connectInstagram=async()=>{
    if(!config?.instagramConnectReady){setShowSetup(true);return;}
    setBusy(true);setError('');
    try {
      // Use the callback's origin so its secure browser-binding cookie accompanies the return from Instagram.
      const origin=new URL(config.instagramCallback).origin;
      const response=await fetch(`${origin}/api/content-studio/instagram/connect`,{...json({}),credentials:'include',headers:{'Content-Type':'application/json',Authorization:`Bearer ${localStorage.getItem('internalAuthToken') || ''}`}});
      const result=await response.json();if(!response.ok) throw new Error(result.error || 'Unable to connect Instagram.');
      const target=new URL(result.url);
      const valid=config.instagramLoginProvider==='facebook'
        ? target.origin==='https://www.facebook.com' && /^\/v\d+\.\d+\/dialog\/oauth$/.test(target.pathname)
        : target.origin==='https://www.instagram.com' && target.pathname==='/oauth/authorize';
      if(!valid) throw new Error('Invalid Instagram connection link.');
      window.location.assign(target.toString());
    } catch(e){setError(e.message);setBusy(false);}
  };
  const run=async fn=>{
    setBusy(true);setError('');setNotice('');
    try {await fn();await refresh();} catch(e) {setError(e.message);} finally {setBusy(false);}
  };
  const change=(key,value)=>setForm(current=>({...current,[key]:value}));
  const upload=(file,isCover)=>run(async()=>{
    if(!file) return;
    if(file.size>50*1024*1024) throw new Error('Choose a file smaller than 50 MB.');
    if(file.type==='image/png' && (isCover || form.platform==='instagram')) {
      const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
      const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0);bitmap.close();
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.95));
      if(!blob) throw new Error('Unable to convert this image to JPEG.');
      file=new File([blob],file.name.replace(/\.png$/i,'.jpg'),{type:'image/jpeg'});
    }
    const data=new FormData();data.append('file',file);
    const asset=await request('/media',{method:'POST',body:data});
    if(isCover && asset.mime!=='image/jpeg') throw new Error('Use a JPEG cover.');
    if(isCover){setCover(asset);change('cover_id',asset.id);} else {setMedia(asset);change('media_id',asset.id);}
    setNotice(isCover?'Cover uploaded.':'Media uploaded. You can reuse it for both platforms.');
  });
  const save=e=>{
    e.preventDefault();run(async()=>{
      await request(editing?`/posts/${editing}`:'/posts',{...json({...form,scheduled_at:form.scheduled_at?new Date(form.scheduled_at).toISOString():null}),method:editing?'PUT':'POST'});
      setEditing(null);setForm(current=>({...empty,platform:current.platform,media_id:current.media_id,cover_id:current.cover_id}));
      setNotice('Draft saved. Choose Publish now or Schedule in the queue when you’re ready.');
    });
  };
  const action=(post,name,body={})=>run(async()=>{
    await request(`/posts/${post.id}/${name}`,json(body));
    setNotice(name==='queue'?(post.platform==='instagram'?'Instagram post queued. Publishing starts within a minute of its posting time.':'TikTok plan saved. Finish posting in TikTok.'):'Post updated.');
  });
  const download=(id,name)=>run(async()=>{
    const response=await fetch(`${API_BASE_URL}/api/content-studio/media/${id}`);
    if(!response.ok) throw new Error('Unable to download media.');
    const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  });
  const reuse=(post,edit=false)=>{
    setEditing(edit?post.id:null);
    const scheduled=edit&&post.scheduled_at?new Date(post.scheduled_at):null;
    const localDate=scheduled?new Date(scheduled.getTime()-scheduled.getTimezoneOffset()*60000).toISOString().slice(0,16):'';
    setForm({...empty,title:post.title,caption:post.caption,platform:edit?post.platform:post.platform==='instagram'?'tiktok':'instagram',media_id:post.media_id,cover_id:post.cover_id,scheduled_at:localDate});
    setMedia({id:post.media_id,mime:post.mime,name:post.media_name});setCover(post.cover_id?{id:post.cover_id,name:'Saved cover'}:null);
    setNotice(edit?'Editing this draft.':'Loaded for the other platform. Adjust your caption and save a new draft.');window.scrollTo({top:0,behavior:'smooth'});
  };
  return <main className="content-studio">
    <header className="studio-header"><div><span className="studio-eyebrow">READY BARTENDING</span><h1>Content Studio</h1><p>Turn your Ready moments into your next post.</p></div><button disabled={busy} onClick={()=>{setForm(empty);setMedia(null);setCover(null);setNotice('');setEditing(null);}}>New post</button></header>
    <div className="studio-connections"><span><b>Instagram</b> · {config?.instagramReady?config.instagramAccount:config?.instagramReconnect?'Reconnect needed':'Not connected'}</span><span><b>TikTok</b> · Download & post</span>
      {config?.canConnect && <button type="button" className="studio-primary" disabled={busy} onClick={connectInstagram}>{config.instagramReady?'Reconnect Instagram':'Connect Instagram'}</button>}
      {config?.canConnect && <button type="button" onClick={()=>setShowSetup(value=>!value)}>Connection setup</button>}
    </div>
    {!config?.instagramReady && <p className="studio-info">You can save drafts now. {config?.canConnect?'Connect your Instagram Business or Creator account to publish.':'Ask a full administrator to connect Instagram before publishing.'}</p>}
    {showSetup && config?.canConnect && <section className="studio-info" aria-label="Instagram connection setup">
      <h2>One-time Instagram setup</h2>
      <p>Create your app in <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer">Meta for Developers</a>, then add Instagram and choose API setup with {config.instagramLoginProvider==='facebook'?'Facebook':'Instagram'} login.</p>
      <p>In the Instagram business login settings, add this exact redirect URL:</p><code>{config.instagramCallback}</code>
      <p>{config.instagramLoginProvider==='facebook'?'Use the Meta app ID and app secret, a Facebook Login for Business configuration, and the Facebook Page ID linked to Ready Bartending’s Instagram professional account.':'Use the Instagram App ID and Instagram App Secret from that product. Add your Ready Bartending account as an Instagram tester if the app is in development, then accept its invitation in Instagram.'}</p>
      <p>Your server needs the app credentials configured once. After setup, return here and click Connect Instagram. You will sign in on {config.instagramLoginProvider==='facebook'?'Facebook':'Instagram'} and approve account access and publishing.</p>
      {config.instagramLoginProvider==='facebook' && <p>Facebook connections expire and require you to reconnect when access expires.</p>}
      <p>You will not need to copy access tokens or enter your Instagram password into this portal.</p>
    </section>}
    {error && <p role="alert" className="studio-error">{error}</p>}{notice && <p role="status" className="studio-notice">{notice}</p>}
    <section className="studio-composer"><div className="studio-preview-panel"><MediaPreview id={media?.id} mime={media?.mime}/></div>
      <form onSubmit={save}>
        <h2>{editing?'Edit your draft':'Create a post'}</h2>
        <label>Platform<select value={form.platform} onChange={e=>change('platform',e.target.value)} disabled={busy}><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select></label>
        <label>Post title<input required maxLength={120} value={form.title} onChange={e=>change('title',e.target.value)} placeholder="Mix N’ Sip · bridal crew" disabled={busy}/></label>
        <label>Photo or video<input type="file" accept="image/jpeg,image/png,video/mp4" disabled={busy} onChange={e=>{upload(e.target.files[0],false);e.target.value='';}}/></label>
        {media && <small>{media.name}</small>}
        <label>Caption<textarea rows={5} maxLength={2200} value={form.caption} onChange={e=>change('caption',e.target.value)} placeholder="Tell the story. Add your booking call to action." disabled={busy}/></label><small>{form.caption.length}/2,200</small>
        {media?.mime==='video/mp4' && <><label>Reel cover (optional)<input type="file" accept="image/jpeg,image/png" disabled={busy} onChange={e=>{upload(e.target.files[0],true);e.target.value='';}}/></label>{cover && <div className="studio-cover"><MediaPreview id={cover.id} mime="image/jpeg"/><button type="button" disabled={busy} onClick={()=>{setCover(null);change('cover_id',null);}}>Remove cover</button></div>}</>}
        <label>Posting time (optional)<input type="datetime-local" value={form.scheduled_at} onChange={e=>change('scheduled_at',e.target.value)} disabled={busy}/></label><small>Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. TikTok times are posting plans.</small>
        <button className="studio-primary" type="submit" disabled={busy||!form.media_id}>{busy?'Working…':'Save draft'}</button>
      </form></section>
    <section className="studio-queue"><div className="studio-queue-heading"><h2>Your content queue</h2><label>Show<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All platforms</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select></label></div>
      {!posts.length && <p>Save your first draft to start your queue.</p>}
      <div className="studio-posts">{posts.filter(p=>filter==='all'||p.platform===filter).map(post=><article key={post.id} className="studio-post">
        <div className="studio-post-meta"><b>{post.platform==='instagram'?'Instagram':'TikTok'}</b><span className={`studio-status studio-status-${post.status}`}>{post.status}</span></div><h3>{post.title}</h3><p className="studio-caption">{post.caption}</p>
        {post.scheduled_at && <small>{new Date(post.scheduled_at).toLocaleString()}</small>}{post.last_error && <p className="studio-error">{post.last_error}</p>}
        <div className="studio-actions"><button disabled={busy} onClick={()=>download(post.media_id,post.media_name)}>Download media</button>{post.cover_id && <button disabled={busy} onClick={()=>download(post.cover_id,'reel-cover.jpg')}>Download cover</button>}<button disabled={busy} onClick={()=>run(async()=>{await navigator.clipboard.writeText(post.caption);setNotice('Caption copied.');})}>Copy caption</button><button disabled={busy} onClick={()=>reuse(post)}>Reuse for {post.platform==='instagram'?'TikTok':'IG'}</button>
          {post.status==='draft' && <><button disabled={busy} onClick={()=>reuse(post,true)}>Edit draft</button><button className="studio-primary" disabled={busy||(post.platform==='instagram'&&(!config?.instagramReady||!config?.canPublish))} onClick={()=>action(post,'queue',{now:true})}>{post.platform==='instagram'?'Publish now':'Ready for TikTok'}</button>{post.scheduled_at && <button disabled={busy||(post.platform==='instagram'&&(!config?.instagramReady||!config?.canPublish))} onClick={()=>action(post,'queue')}>{post.platform==='instagram'?'Schedule':'Plan posting time'}</button>}<button disabled={busy} onClick={()=>run(async()=>{await request(`/posts/${post.id}`,{method:'DELETE'});setNotice('Draft deleted.');})}>Delete draft</button></>}
          {['scheduled','planned','ready'].includes(post.status) && <button disabled={busy} onClick={()=>action(post,'cancel')}>Return to draft</button>}
          {post.platform==='tiktok' && post.status==='ready' && <><a href="https://www.tiktok.com/upload" target="_blank" rel="noreferrer">Open TikTok</a><button disabled={busy} onClick={()=>action(post,'posted')}>I posted this</button></>}
        </div>
      </article>)}</div>
      <p className="studio-info">TikTok: download your video, copy your caption, then finish in TikTok to choose music, cover and posting settings. “I posted this” updates your queue only.</p>
    </section>
  </main>;
}
