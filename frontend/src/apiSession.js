import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

// Existing screens use both fetch and axios. Attach the signed session only
// to this application's API, never to third-party links or upload targets.
const api = new URL(API_BASE_URL, window.location.origin);
export const SESSION_EXPIRED_EVENT = 'ready:session-expired';
function handleUnauthorized(status, url, requestToken) {
  if (status !== 401 || !isApi(url) || new URL(url, window.location.href).pathname === '/login') return;
  // An old in-flight request must not invalidate a newly signed-in session.
  if (localStorage.getItem('internalAuthToken') !== requestToken) return;
  window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
}
function isApi(input) {
  try {
    const url = new URL(input, window.location.href);
    return url.origin === api.origin && (api.pathname === '/' || url.pathname === api.pathname || url.pathname.startsWith(`${api.pathname.replace(/\/$/, '')}/`));
  } catch { return false; }
}
const originalFetch = window.fetch.bind(window);
async function checkBankingMfa(response, url) {
  if (response.status === 403 && isApi(url) && new URL(url, window.location.href).pathname.startsWith('/api/plaid/')) {
    const body = await response.clone().json().catch(() => ({}));
    if (body.code === 'MFA_REQUIRED') {
      sessionStorage.removeItem('readyBankingMfa');
      window.dispatchEvent(new Event('ready:banking-mfa-required'));
    }
  }
  return response;
}
window.fetch = (input, options = {}) => {
  const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
  const token = localStorage.getItem('internalAuthToken');
  if (token && isApi(url)) {
    const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    const mfa = sessionStorage.getItem('readyBankingMfa');
    if (mfa) headers.set('X-Ready-MFA', mfa);
    return originalFetch(input, { ...options, headers }).then(response => {
      handleUnauthorized(response.status, url, token);
      return checkBankingMfa(response, url);
    });
  }
  return originalFetch(input, options).then(response => {
    handleUnauthorized(response.status, url, token);
    return response;
  });
};
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('internalAuthToken');
  const url = config.baseURL ? new URL(config.url, config.baseURL).href : config.url;
  if (token && isApi(url)) {
    config.headers.Authorization = `Bearer ${token}`;
    const mfa = sessionStorage.getItem('readyBankingMfa');
    if (mfa) config.headers['X-Ready-MFA'] = mfa;
  }
  config.readySessionToken = token;
  return config;
});
axios.interceptors.response.use(response => response, error => {
  const config = error.config || {};
  const url = config.baseURL ? new URL(config.url, config.baseURL).href : config.url;
  if (url) handleUnauthorized(error.response?.status, url, config.readySessionToken);
  return Promise.reject(error);
});

export async function accessRequest(path, options) {
  const response = await fetch(`${api.href.replace(/\/$/, '')}/api/access${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to complete request.');
  return data;
}
