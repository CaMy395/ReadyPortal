import { readFile } from 'node:fs/promises';

export const discoveryPages = JSON.parse(await readFile(new URL('../../frontend/src/data/publicDiscovery.json', import.meta.url), 'utf8'));
const origin = 'https://www.readybartending.com';
const image = 'https://res.cloudinary.com/dtuqponwy/image/upload/photo_qsegmu.jpg';
const business = {
  '@type': 'LocalBusiness', '@id': origin + '/rb/home#business', name: 'Ready Bartending LLC',
  url: origin + '/rb/home', image, areaServed: ['Miami', 'South Florida'],
  sameAs: ['https://www.instagram.com/readybartending/', 'https://www.google.com/maps/search/?api=1&query=Ready%20Bartending&query_place_id=ChIJdRhZttKgFQwRZRzUXtpzUIU'],
};

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);

function safeLink(value, fallback) {
  if (!value) return fallback;
  try {
    const url = new URL(value, origin);
    if (url.protocol !== 'https:') return fallback;
    if (url.hostname === 'readybartending.com') url.hostname = 'www.readybartending.com';
    return url.href;
  } catch { /* Use the fallback for invalid editor input. */ }
  return fallback;
}

export function discoveryCanonical(path, value) {
  const cleaned = typeof value === 'string' ? value.trim().replace(/(?:%(?:0a|0d|09|20))+$/i, '') : null;
  return safeLink(cleaned, origin + path);
}

export function renderDiscovery(template, path, { seo = {}, sections = [], events = [], event = null } = {}) {
  if (event) path = '/rb/events/' + event.slug;
  const page = event ? {
    heading: event.title, description: event.description || event.subtitle || 'A Ready Bartending experience in South Florida.',
    related: ['events', 'mix-n-sip'], cta: path + '#root', ctaLabel: 'See ticket options',
  } : discoveryPages[path];
  if (!page) return template;
  const title = seo.seo_title || page.heading + ' | Ready Bartending';
  const description = seo.seo_description || page.description;
  const canonical = discoveryCanonical(path, seo.canonical_url);
  const robots = seo.noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large';
  const schema = event ? {
    '@type': 'Event', name: event.title, url: canonical, description,
    startDate: event.event_date, organizer: { '@id': business['@id'] },
    location: { '@type': 'Place', name: event.location_name || 'Miami', address: {
      '@type': 'PostalAddress', streetAddress: event.address_line1 || undefined,
      addressLocality: event.city || 'Miami', addressRegion: event.state || 'FL', addressCountry: 'US',
    } },
  } : path === '/rb/home' ? business : page.cta ? {
    '@type': 'Service', name: page.heading, description: page.description,
    url: canonical, areaServed: business.areaServed, provider: { '@id': business['@id'] },
  } : { '@type': 'WebPage', name: title, description, url: canonical };
  const structured = JSON.stringify({ '@context': 'https://schema.org', ...schema }).replace(/</g, '\\u003c');
  const meta = (attribute, name, content) => '<meta data-discovery-head ' + attribute + '="' + name + '" content="' + escape(content) + '">';
  const head = [
    '<title data-discovery-head>' + escape(title) + '</title>',
    meta('name', 'description', description), meta('name', 'robots', robots),
    '<link data-discovery-head rel="canonical" href="' + escape(canonical) + '">',
    meta('property', 'og:type', 'website'), meta('property', 'og:url', canonical),
    meta('property', 'og:title', seo.og_title || title),
    meta('property', 'og:description', seo.og_description || description),
    meta('property', 'og:image', safeLink(seo.og_image_url, image)),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', seo.og_title || title),
    meta('name', 'twitter:description', seo.og_description || description),
    meta('name', 'twitter:image', safeLink(seo.og_image_url, image)),
    '<script data-discovery-head type="application/ld+json">' + structured + '</script>',
  ].join('\n');
  const content = sections.map(section => {
    const link = safeLink(section.button_link);
    const list = Array.isArray(section.content_json) && /rentals|items|highlights|services|packages/.test(section.section_key || '')
      ? section.content_json.slice(0, 50).map(item =>
        '<li>' + escape(item?.title || item?.name || '') + (item?.description ? ' — ' + escape(item.description) : '') + '</li>'
      ).filter(item => item !== '<li></li>').join('') : '';
    return '<section><h2>' + escape(section.title) + '</h2><p>' + escape(section.subtitle) +
      '</p><p>' + escape(section.body) + '</p>' + (link && section.button_text ?
        '<a href="' + escape(link) + '">' + escape(section.button_text) + '</a>' : '') + (list ? '<ul>' + list + '</ul>' : '') + '</section>';
  }).join('');
  const points = page.points?.map(point => '<li>' + escape(point) + '</li>').join('');
  const serviceDetails = points ? '<h2>Plan your experience</h2><ul>' + points + '</ul>' : '';
  const faq = (page.faqs || []).map(([question, answer]) =>
    '<details><summary>' + escape(question) + '</summary><p>' + escape(answer) + '</p></details>').join('');
  const related = page.related.map(slug => {
    const url = '/rb/' + slug;
    return '<li><a href="' + url + '">' + escape(discoveryPages[url].heading) + '</a></li>';
  }).join('');
  const listing = events.length ? '<h2>Upcoming events</h2><ul>' + events.map(item =>
    '<li><a href="/rb/events/' + escape(item.slug) + '">' + escape(item.title) + '</a> · ' +
    escape(item.event_date) + '</li>').join('') + '</ul>' : '';
  const eventDetails = event ? '<p>' + escape([event.event_date, event.location_name, event.city].filter(Boolean).join(' · ')) +
    '</p><noscript><p>Enable JavaScript to see session availability and reserve tickets.</p></noscript>' : '';
  const cta = page.cta && !event ? '<p><a href="' + escape(page.cta.startsWith('/') ? page.cta : '/rb/' + page.cta) +
    '">' + escape(page.ctaLabel) + '</a></p>' : '';
  const body = '<main style="max-width:70ch;margin:2rem auto;padding:0 1rem;background:white;color:#222;line-height:1.6">' +
    '<a href="/rb/home">Ready Bartending LLC</a><h1>' + escape(page.heading) + '</h1><p>' +
    escape(page.description) + '</p>' + cta + serviceDetails + content + listing + eventDetails + faq + '<h2>Related services</h2><ul>' + related + '</ul></main>';
  return template.replace(/<title>Ready Bartending Portal<\/title>/, () => head)
    .replace('<div id="root"></div>', () => '<div id="root">' + body + '</div>');
}

export async function getDiscoveryContent(pool, path) {
  const { rows } = await pool.query(`
    SELECT page.is_active, to_jsonb(seo) AS seo, COALESCE((
      SELECT jsonb_agg(section ORDER BY section.sort_order, section.id)
      FROM site_page_sections section
      WHERE section.page_key = page.page_key AND section.is_visible = true
    ), '[]'::jsonb) AS sections
    FROM site_pages page LEFT JOIN site_page_seo seo USING (page_key)
    WHERE page.route = $1 LIMIT 1`, [path]);
  if (rows[0]?.is_active === false) return { seo: { noindex: true }, sections: [] };
  return { seo: rows[0]?.seo || {}, sections: rows[0]?.sections || [] };
}

export function discoverySitemap(paths) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    paths.map(path => '<url><loc>' + origin + path + '</loc></url>').join('') + '</urlset>';
}

export async function getPublishedEvents(pool, slug = null) {
  if (slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return [];
  const { rows } = await pool.query(`
    SELECT slug, title, subtitle, description, event_date::text, location_name, address_line1, city, state
    FROM events WHERE status = 'published' AND event_date >= CURRENT_DATE
      AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND ($1::text IS NULL OR slug = $1)
    ORDER BY event_date LIMIT 250`, [slug]);
  return rows;
}
