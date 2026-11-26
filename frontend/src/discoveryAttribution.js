import routes from "./data/publicDiscovery.json";

const key = "rb-discovery-attribution";
const publicPaths = new Set([...Object.keys(routes), "/", "/intake-form", "/bartending-course",
  "/bartending-classes", "/mix-n-sip", "/craft-cocktails", "/rb/rental-inquiry"]);
const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id"];

export function getDiscoveryAttribution() {
  const path = window.location.pathname.replace(/\/$/, "") || "/";
  const query = new URLSearchParams(window.location.search);
  const attribution = {};
  if (publicPaths.has(path) || /^\/rb\/events\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) attribution.landingPage = path;
  for (const name of utmKeys) {
    const value = query.get(name);
    if (value && /^[a-z0-9 ._~-]{1,100}$/i.test(value)) attribution[name] = value;
  }
  if (document.referrer) {
    try {
      const ref = new URL(document.referrer);
      if (ref.origin !== window.location.origin) attribution.referringDomain = ref.hostname;
    } catch { /* Ignore malformed referrers. */ }
  }
  try {
    const existing = sessionStorage.getItem(key);
    if (existing && !utmKeys.some(name => attribution[name])) return JSON.parse(existing);
    if (attribution.landingPage) sessionStorage.setItem(key, JSON.stringify(attribution));
  } catch { /* Forms also work with browser storage disabled. */ }
  return attribution;
}
