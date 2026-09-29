import axios from 'axios';

// Existing screens use both fetch and axios. Attach the signed session only
// to this application's API, never to third-party links or upload targets.
const api = new URL(process.env.REACT_APP_API_URL || 'http://localhost:3001', window.location.origin);
function isApi(input) {
  try {
    const url = new URL(input, window.location.href);
    return url.origin === api.origin && (api.pathname === '/' || url.pathname === api.pathname || url.pathname.startsWith(`${api.pathname.replace(/\/$/, '')}/`));
  } catch { return false; }
}
const originalFetch = window.fetch.bind(window);
window.fetch = (input, options = {}) => {
  const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
  const token = localStorage.getItem('internalAuthToken');
  if (token && isApi(url)) {
    const headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined));
    headers.set('Authorization', `Bearer ${token}`);
    return originalFetch(input, { ...options, headers });
  }
  return originalFetch(input, options);
};
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('internalAuthToken');
  const url = config.baseURL ? new URL(config.url, config.baseURL).href : config.url;
  if (token && isApi(url)) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function accessRequest(path, options) {
  const response = await fetch(`${api.href.replace(/\/$/, '')}/api/access${path}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to complete request.');
  return data;
}
