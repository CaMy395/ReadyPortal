// Hosted builds use their own origin unless a separate API is configured.
export const API_BASE_URL = (process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : window.location.origin)).replace(/\/$/, '');
