import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chatRequest, mergeChatMessages } from '../../liveVisitorChat';
import './LiveVisitors.css';

const online = visitor => visitor && Date.now()-Date.parse(visitor.last_seen)<45000;
const label = visitor => visitor.display_name==='Anonymous visitor' ? `Anonymous visitor · ${visitor.visitor_id.slice(0,6)}` : visitor.display_name;
export default function LiveVisitors() {
  const [params,setParams]=useSearchParams();
  const selected=params.get('visitor') || '';
  const [visitors,setVisitors]=useState([]);
  const [thread,setThread]=useState(null);
  const [messages,setMessages]=useState([]);
  const [draft,setDraft]=useState('');
  const [error,setError]=useState('');
  const [listError,setListError]=useState('');
  const [busy,setBusy]=useState(false);
  const cursor=useRef('0');
  const pending=useRef(null);
  const bottom=useRef(null);
  const activeSelection=useRef(selected);
  activeSelection.current=selected;
  useEffect(() => {
    let stopped=false, running=false;
    const poll=async () => {
      if (running || document.visibilityState!=='visible') return;
      running=true;
      try {
        const data=await chatRequest('/admin/visitors');
        if (!stopped) { setVisitors(data.visitors); setListError(''); }
      } catch (problem) { if (!stopped) setListError(`${problem.message} Live status may be outdated.`); }
      finally { running=false; }
    };
    poll(); const timer=setInterval(poll,3000);
    document.addEventListener('visibilitychange',poll);
    return () => { stopped=true; clearInterval(timer); document.removeEventListener('visibilitychange',poll); };
  },[]);
  useEffect(() => {
    setThread(null); setMessages([]); setDraft(''); setBusy(false); setError(''); cursor.current='0'; pending.current=null;
    if (!selected) return;
    let stopped=false,running=false;
    const poll=async () => {
      if (running || document.visibilityState!=='visible') return;
      running=true;
      try {
        const data=await chatRequest(`/admin/visitors/${selected}/messages?after=${cursor.current}`);
        if (stopped) return;
        setThread(data.visitor); setMessages(current => mergeChatMessages(current,data.messages));
        if (data.messages.length) cursor.current=data.messages[data.messages.length-1].id;
        setError('');
      } catch (problem) { if (!stopped) setError(problem.message); }
      finally { running=false; }
    };
    poll(); const timer=setInterval(poll,3000);
    document.addEventListener('visibilitychange',poll);
    return () => { stopped=true; clearInterval(timer); document.removeEventListener('visibilitychange',poll); };
  },[selected]);
  useEffect(() => { bottom.current?.scrollIntoView?.({ block:'nearest' }); },[messages]);
  const send=async event => {
    event.preventDefault();
    const content=draft.trim(); if (!content || busy || !thread) return;
    const visitorId=selected;
    if (pending.current?.content!==content) pending.current={ content,messageId:crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const data=await chatRequest(`/admin/visitors/${visitorId}/messages`,pending.current);
      if (activeSelection.current!==visitorId) return;
      setMessages(current => mergeChatMessages(current,[data.message]));
      setThread(current => ({ ...current,team_active:true })); setDraft(''); pending.current=null;
    } catch (problem) { if (activeSelection.current===visitorId) setError(problem.message); }
    finally { if (activeSelection.current===visitorId) setBusy(false); }
  };
  const end=async () => {
    const visitorId=selected; setBusy(true);
    try {
      await chatRequest(`/admin/visitors/${visitorId}/end`,{});
      if (activeSelection.current===visitorId) setThread(current => ({ ...current,team_active:false }));
    } catch (problem) { if (activeSelection.current===visitorId) setError(problem.message); }
    finally { if (activeSelection.current===visitorId) setBusy(false); }
  };
  return <main className="live-visitors">
    <header><div><h1>Live visitors & chat</h1><p>Open a visitor to say hello or reply. Conversations update every few seconds.</p></div><span className="live-visitor-count">{visitors.filter(online).length} on site</span></header>
    {(error || listError) && <p role="status" className="live-chat-error">{error || listError}</p>}
    <div className="live-chat-layout">
      <aside aria-label="Site visitors">
        <h2>Visitors</h2>
        {!visitors.length && <p>No recent visitors yet.</p>}
        {visitors.map(visitor => <button type="button" className={selected===visitor.visitor_id ? 'selected' : ''} key={visitor.visitor_id} onClick={() => setParams({ visitor:visitor.visitor_id })}>
          <strong>{label(visitor)}</strong><span className={online(visitor) ? 'live-status online' : 'live-status'}>{online(visitor) ? 'On site now' : 'Away'} · {visitor.page_label}</span>
          {visitor.last_message && <span className="live-message-preview">{visitor.last_sender==='admin' ? 'Team: ' : 'Visitor: '}{visitor.last_message}</span>}
          {visitor.team_active && visitor.last_sender==='visitor' && <span className="live-waiting">Waiting for a reply</span>}
        </button>)}
      </aside>
      <section className="live-chat-thread" aria-label="Visitor conversation">
        {!selected ? <div className="live-chat-empty">Choose a visitor to start a conversation.</div> : !thread ? <div className="live-chat-empty">{error ? 'Conversation unavailable.' : 'Loading conversation…'}</div> : <>
          <div className="live-thread-heading"><div><h2>{label(thread)}</h2><p className={online(thread) ? 'live-status online' : 'live-status'}>{online(thread) ? 'On site now' : 'Away'} · {thread.page_label}</p></div>
            {thread.team_active && <button type="button" disabled={busy} onClick={end}>End live chat</button>}
          </div>
          <div className="live-thread-messages" aria-live="polite">
            {!messages.length && <p>Say hello. Your message opens the Ready chat on this visitor’s screen.</p>}
            {messages.map(message => <div key={message.id} className={`live-thread-message ${message.sender}`}><strong>{message.sender==='admin' ? `${message.sender_name} · Ready team` : 'Visitor'}</strong><p>{message.content}</p><time>{new Date(message.created_at).toLocaleTimeString([],{ hour:'numeric',minute:'2-digit' })}</time></div>)}
            <div ref={bottom} />
          </div>
          {!online(thread) && <p className="live-chat-away">This visitor is away. Your message will be waiting if they return in the same browser.</p>}
          <form onSubmit={send}><label htmlFor="live-visitor-message">Message this visitor</label><textarea id="live-visitor-message" rows={3} maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Hi! How can we help?" disabled={busy} />
            <button type="submit" disabled={busy || !draft.trim()}>{busy ? 'Sending…' : online(thread) ? 'Send message' : 'Send for their return'}</button>
          </form>
        </>}
      </section>
    </div>
  </main>;
}
