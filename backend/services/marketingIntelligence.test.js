import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { marketingAttribution, reportedSource, validMarketingEventDate } from './marketingAttribution.js';
import { reportingPeriods, summarize } from './marketingReporting.js';
import { discoveryPages, discoverySitemap, renderDiscovery } from './publicDiscovery.js';
import { permits, sectionPermissions } from './adminAccess.js';

test('attribution validates fields and keeps the reported answer separate', () => {
  assert.equal(reportedSource('Friend'), 'Friend or personal referral');
  assert.deepEqual(marketingAttribution({
    utm_source: 'chatgpt.com', utm_term: 'private@example.com', referringDomain: 'www.google.com',
    landingPage: '/rb/weddings', wantsPublicReview: true, detectedSource: 'Facebook',
  }), {
    utm_source: 'chatgpt.com', referringDomain: 'www.google.com', landingPage: '/rb/weddings', detectedSource: 'ChatGPT',
  });
  assert.equal(marketingAttribution({ landingPage: '/rb/feedback/private', referringDomain: 'https://example.com' }), null);
  assert.equal(marketingAttribution({ referringDomain: 'chatgpt.com.example.com' }).detectedSource, undefined);
  assert.equal(validMarketingEventDate('2026-02-30'), null);
  assert.equal(validMarketingEventDate('2026-11-25'), '2026-11-25');
});

test('equal-length comparison and count each AI inquiry only once', () => {
  assert.deepEqual(reportingPeriods('2026-11-01', '2026-11-30'), {
    start: '2026-11-01', end: '2026-11-30', previousStart: '2026-10-02', previousEnd: '2026-10-31',
  });
  assert.equal(reportingPeriods('2026-02-30', '2026-03-01'), null);
  const summary = summarize({
    inquiries: [{ service: 'Rentals', source: 'ChatGPT', detected: 'Gemini', count: 3, converted: 1 }],
    revenue: [{ source: null, detected: null, amount: 12.34 }], quotes: 1, bookings: 1, scans: [], engagement: [],
  });
  assert.equal(summary.aiInquiries, 3);
  assert.ok(Math.abs(summary.conversionRate - 100 / 3) < 1e-10);
  assert.deepEqual(summary.paidRevenueBySource, [['Unattributed', 12.34]]);
  assert.equal(summarize({ inquiries: [], revenue: [], scans: [], engagement: [] }).conversionRate, null);
});

test('public HTML contains crawlable content and escapes managed input', async () => {
  const template = await readFile(new URL('../../frontend/public/index.html', import.meta.url), 'utf8');
  for (const route of Object.keys(discoveryPages)) {
    const html = renderDiscovery(template, route);
    assert.match(html, /<div id="root"><main/);
    assert.match(html, /application\/ld\+json/);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes('https://www.readybartending.com' + route));
  }
  const html = renderDiscovery(template, '/rb/weddings', {
    seo: { seo_title: '<script>unsafe</script>', canonical_url: 'https://readybartending.com/rb/weddings%0A', noindex: true },
    sections: [{ title: '<unsafe>', button_link: 'javascript:void(0)', button_text: 'Bad link' }],
  });
  assert.match(html, /&lt;script&gt;unsafe/);
  assert.match(html, /noindex,nofollow/);
  assert.match(html, /href="https:\/\/www.readybartending.com\/rb\/weddings"/);
  assert.doesNotMatch(html, /javascript:void/);
  assert.doesNotMatch(discoverySitemap(Object.keys(discoveryPages)), /\/admin|intake-form|feedback/);
});

test('marketing API access is explicit and independent of site and finance access', () => {
  const required = sectionPermissions('/api/admin/marketing/sync/google-reviews', 'POST');
  assert.deepEqual(required, ['marketing.view']);
  assert.equal(permits({ fullAdmin: false, roles: [{ permissions: ['site.manage', 'finance.manage'] }] }, required[0]), false);
  assert.equal(permits({ fullAdmin: false, roles: [{ permissions: ['marketing.view'] }] }, required[0]), true);
});
