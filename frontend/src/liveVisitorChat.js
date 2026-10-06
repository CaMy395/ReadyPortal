import { API_BASE_URL } from './apiConfig';

let fallbackIdentity;
let sessionPromise;
export function getVisitorIdentity() {
  const create = () => ({ visitorId: crypto.randomUUID(), key: Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2,'0')).join('') });
  try {
    let visitorId=localStorage.getItem('readyVisitorId');
    let key=localStorage.getItem('readyVisitorChatKey');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(visitorId || '') || !/^[\da-f]{64}$/i.test(key || '')) {
      const identity=create(); visitorId=identity.visitorId; key=identity.key;
      localStorage.setItem('readyVisitorId',visitorId); localStorage.setItem('readyVisitorChatKey',key);
    }
    return { visitorId,key };
  } catch {
    if (!fallbackIdentity) fallbackIdentity=create();
    return fallbackIdentity;
  }
}
export async function chatRequest(path, body, { visitor = false, method = body ? 'POST' : 'GET' } = {}) {
  const identity=visitor ? getVisitorIdentity() : null;
  const response=await fetch(`${API_BASE_URL}/api/live-chat${path}`, {
    method, headers: { 'Content-Type':'application/json', ...(identity ? { 'X-Ready-Chat-Key':identity.key } : {}) },
    ...(body ? { body:JSON.stringify({ ...body, ...(identity ? { visitorId:identity.visitorId } : {}) }) } : {}),
  });
  const data=response.status===204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (visitor && response.status===403) sessionPromise=undefined;
    throw new Error(data.error || 'Unable to connect to live chat. Please try again.');
  }
  return data;
}
export function ensureVisitorSession(path = window.location.pathname) {
  if (!sessionPromise) {
    sessionPromise=chatRequest('/visitor/session',{ path },{ visitor:true });
    sessionPromise.catch(() => { sessionPromise=undefined; });
  }
  return sessionPromise;
}
export function mergeChatMessages(current,incoming) {
  if (!incoming.length) return current;
  const merged=new Map(current.map(message => [String(message.id),message]));
  incoming.forEach(message => merged.set(String(message.id),message));
  return Array.from(merged.values()).sort((a,b) => Number(a.id)-Number(b.id)).slice(-200);
}
export function visitorMessagesPath(after = '0') {
  return `/visitor/messages?visitorId=${getVisitorIdentity().visitorId}&after=${encodeURIComponent(after)}`;
}
