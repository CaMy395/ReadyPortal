import { readFile } from 'node:fs/promises';
import { discoveryPages } from './publicDiscovery.js';

const sources = JSON.parse(await readFile(new URL('../../frontend/src/data/discoverySources.json', import.meta.url), 'utf8'));
const publicPaths = new Set([...Object.keys(discoveryPages), '/', '/intake-form', '/bartending-course',
  '/bartending-classes', '/mix-n-sip', '/craft-cocktails', '/rb/rental-inquiry']);
const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'];
export const aiSources = new Set(['ChatGPT', 'Gemini', 'Microsoft Copilot', 'Perplexity', 'Siri', 'Alexa']);
const aliases = new Map([
  ['google', 'Google Search'], ['friend', 'Friend or personal referral'],
  ['returning', 'Returning customer'], ['advertisement', 'Paid advertisement'], ['tik tok', 'TikTok'],
  ...sources.map(source => [source.toLowerCase(), source]),
]);
const hostSources = new Map([
  ['chatgpt.com', 'ChatGPT'], ['chat.openai.com', 'ChatGPT'], ['gemini.google.com', 'Gemini'],
  ['copilot.microsoft.com', 'Microsoft Copilot'], ['perplexity.ai', 'Perplexity'],
  ['maps.apple.com', 'Apple Maps'], ['maps.google.com', 'Google Maps'], ['google.com', 'Google Search'],
  ['bing.com', 'Bing'], ['instagram.com', 'Instagram'], ['tiktok.com', 'TikTok'],
  ['facebook.com', 'Facebook'], ['thebash.com', 'The Bash'], ['eventective.com', 'Eventective'],
  ['airbnb.com', 'Experience marketplaces'], ['viator.com', 'Experience marketplaces'],
]);

export function reportedSource(value) {
  if (typeof value !== 'string') return null;
  return aliases.get(value.trim().toLowerCase()) || null;
}

function fromHost(host) {
  for (const [domain, source] of hostSources) {
    if (host === domain || host.endsWith('.' + domain)) return source;
  }
  return null;
}

export function marketingAttribution(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const result = {};
  for (const key of utmKeys) {
    if (typeof input[key] === 'string' && /^[a-z0-9 ._~-]{1,100}$/i.test(input[key])) result[key] = input[key];
  }
  if (publicPaths.has(input.landingPage) || (typeof input.landingPage === 'string' &&
      input.landingPage.length <= 160 && /^\/rb\/events\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.landingPage))) {
    result.landingPage = input.landingPage;
  }
  if (typeof input.referringDomain === 'string' && input.referringDomain.length <= 253 &&
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(input.referringDomain)) {
    const domain = input.referringDomain.toLowerCase();
    if (!/(^|\.)readybartending\.com$/.test(domain)) result.referringDomain = domain;
  }
  const source = (result.utm_source || '').trim().toLowerCase();
  const paid = /^(cpc|ppc|paid([_-](search|social))?|display|cpm)$/.test((result.utm_medium || '').toLowerCase());
  const detected = paid ? 'Paid advertisement' : reportedSource(source) || fromHost(source) || fromHost(result.referringDomain || '');
  if (detected) result.detectedSource = detected;
  return Object.keys(result).length ? result : null;
}

export const marketingEventId = value => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;

export function validMarketingEventDate(value) {
  if (typeof value !== 'string' || !/^[2-9]\d{3}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : null;
}
