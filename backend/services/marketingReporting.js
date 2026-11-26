import { aiSources, reportedSource } from './marketingAttribution.js';

const day = 86400000;
const iso = time => new Date(time).toISOString().slice(0, 10);
const parse = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && iso(Date.parse(value)) === value ? Date.parse(value) : NaN;

export function reportingPeriods(start, end) {
  const from = parse(start);
  const to = parse(end);
  const days = (to - from) / day + 1;
  if (!(days >= 1 && days <= 366) || from < Date.UTC(2000, 0, 1)) return null;
  return { start, end, previousStart: iso(from - days * day), previousEnd: iso(from - day) };
}

const reportSql = `
WITH periods AS (
  SELECT 'current' AS period, $1::date AS starts, $2::date AS ends
  UNION ALL SELECT 'previous', $3::date, $1::date
), inquiries AS (
  SELECT 'staffing:' || id AS key, 'Event bartending' AS service,
    created_at, lower(trim(email)) AS email, event_date, how_heard AS source, marketing_attribution AS attribution
    FROM intake_forms
  UNION ALL SELECT 'crafts:' || id, 'Crafts & Cocktails', created_at, lower(trim(email)), marketing_event_date,
    how_heard, marketing_attribution FROM craft_cocktails
  UNION ALL SELECT 'mix:' || id, 'Mix N’ Sip', created_at, lower(trim(email)), marketing_event_date,
    how_heard, marketing_attribution FROM mix_n_sip
  UNION ALL SELECT 'course:' || id, 'Bartending course', created_at, lower(trim(email)), marketing_event_date,
    referral, marketing_attribution FROM bartending_course_inquiries
    WHERE course_id IS NOT NULL OR NULLIF(trim(referral), '') IS NOT NULL OR marketing_attribution IS NOT NULL
  UNION ALL SELECT 'class:' || id, 'Bartending classes', created_at, lower(trim(email)), preferred_date,
    referral, marketing_attribution FROM bartending_classes_inquiries
  UNION ALL SELECT 'rental:' || id, 'Rentals', created_at, lower(trim(email)), event_date,
    how_heard, marketing_attribution FROM rental_inquiries
), quotes_with_client AS (
  SELECT q.id, q.date AS created_at, q.event_date, lower(trim(coalesce(nullif(q.client_email, ''), c.email))) AS email,
    lower(q.status) IN ('confirmed', 'deposit paid', 'paid') AS confirmed
  FROM quotes q LEFT JOIN clients c ON c.id = q.client_id
), appointments_with_client AS (
  SELECT a.id, a.created_at, a.date AS event_date, lower(trim(c.email)) AS email,
    CASE
      WHEN a.title ~* 'mix n.? *sip' THEN 'Mix N’ Sip'
      WHEN a.title ~* 'crafts.*cocktails' THEN 'Crafts & Cocktails'
      WHEN a.title ~* 'bartending course|responsible alcohol' THEN 'Bartending course'
      WHEN a.title ~* 'bartending class' THEN 'Bartending classes'
    END AS service,
    (lower(coalesce(a.status, '')) NOT IN ('cancelled', 'canceled') AND
     (lower(a.status) IN ('confirmed', 'finalized') OR a.paid IS TRUE)) AS confirmed
  FROM appointments a JOIN clients c ON c.id = a.client_id
  WHERE a.title !~* 'interview|audition|training session|course session|^(personal|blocked|unavailable)'
), sales AS (
  SELECT 'quote' AS kind, id, created_at::timestamp, event_date, email, NULL::text AS service, confirmed
    FROM quotes_with_client
  UNION ALL SELECT 'appointment', id, created_at, event_date, email, service, confirmed
    FROM appointments_with_client
  UNION ALL SELECT 'ticket', id, created_at, NULL, NULL, NULL, payment_status = 'paid'
    FROM event_orders
), linked AS (
  SELECT sales.*, candidate.inquiry_key
  FROM sales
  LEFT JOIN LATERAL (
    SELECT CASE WHEN count(*) = 1 THEN min(inquiry.key) END AS inquiry_key
    FROM inquiries inquiry
    WHERE sales.email <> '' AND inquiry.email = sales.email AND inquiry.event_date = sales.event_date
      AND inquiry.created_at::date <= sales.created_at::date
      AND ((sales.kind = 'quote' AND inquiry.service IN ('Event bartending','Rentals'))
        OR (sales.kind = 'appointment' AND inquiry.service = sales.service))
  ) candidate ON true
), revenue AS (
  SELECT 'quote' AS kind, quote_id AS id, payment_date AS received, amount FROM quote_payments
  UNION ALL
    SELECT 'appointment', appointment_id, coalesce(paid_at, created_at)::date,
      coalesce(service_amount, amount) FROM profits
    WHERE appointment_id IS NOT NULL AND quote_id IS NULL AND lower(category) = 'income'
      AND coalesce(service_amount, amount) > 0
  UNION ALL
    SELECT 'ticket', orders.id, coalesce(ledger.paid_date, orders.updated_at::date), orders.amount_paid
    FROM event_orders orders
    LEFT JOIN LATERAL (SELECT min(coalesce(paid_at, created_at)::date) AS paid_date
      FROM profits WHERE processor_txn_id = orders.square_order_id AND lower(category) = 'event') ledger ON true
    WHERE orders.payment_status = 'paid'
), converted AS (
  SELECT DISTINCT inquiry_key FROM linked WHERE confirmed AND inquiry_key IS NOT NULL
)
SELECT p.period,
  (SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) FROM (
    SELECT i.service, i.source, i.attribution->>'detectedSource' AS detected, COUNT(*)::int AS count,
      COUNT(converted.inquiry_key)::int AS converted
    FROM inquiries i LEFT JOIN converted ON converted.inquiry_key = i.key
    WHERE i.created_at >= p.starts AND i.created_at < p.ends GROUP BY 1,2,3
  ) value) AS inquiries,
  (SELECT count(*)::int FROM linked WHERE kind = 'quote' AND created_at >= p.starts AND created_at < p.ends) AS quotes,
  (SELECT count(*)::int FROM (
    SELECT coalesce(inquiry_key, kind || ':' || id) AS booking_key, min(created_at) AS first_recorded
    FROM linked WHERE confirmed GROUP BY 1
  ) bookings WHERE first_recorded >= p.starts AND first_recorded < p.ends) AS bookings,
  (SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) FROM (
    SELECT coalesce(i.source, ticket.marketing_reported_source) AS source,
      coalesce(i.attribution, ticket.marketing_attribution)->>'detectedSource' AS detected,
      SUM(revenue.amount)::numeric(14,2) AS amount
    FROM revenue LEFT JOIN linked l USING (kind, id) LEFT JOIN inquiries i ON i.key = l.inquiry_key
    LEFT JOIN event_orders ticket ON revenue.kind = 'ticket' AND ticket.id = revenue.id
    WHERE received >= p.starts AND received < p.ends GROUP BY 1,2
  ) value) AS revenue,
  (SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) FROM (
    SELECT ref, COUNT(*)::int AS count FROM qr_scans WHERE created_at >= p.starts AND created_at < p.ends
    AND coalesce(ref, 'direct') <> 'direct' GROUP BY ref
  ) value) AS scans,
  (SELECT COALESCE(jsonb_agg(value), '[]'::jsonb) FROM (
    SELECT ref, button_name AS button, COUNT(*)::int AS count FROM qr_clicks WHERE created_at >= p.starts
    AND created_at < p.ends AND coalesce(ref, 'direct') <> 'direct' GROUP BY ref, button_name
  ) value) AS engagement
FROM periods p
`;

const sourceLabel = value => reportedSource(value) || (value ? 'Legacy source' : 'Unattributed');

export function summarize(row) {
  const sources = new Map();
  const detectedSources = new Map();
  const services = new Map();
  const add = (map, key, count) => map.set(key, (map.get(key) || 0) + count);
  let inquiries = 0, converted = 0, aiInquiries = 0;
  for (const record of row.inquiries) {
    const reported = sourceLabel(record.source);
    const detected = sourceLabel(record.detected);
    add(sources, reported, record.count);
    add(detectedSources, detected, record.count);
    add(services, record.service, record.count);
    inquiries += record.count;
    converted += record.converted;
    if (aiSources.has(reported) || aiSources.has(detected)) aiInquiries += record.count;
  }
  const revenue = new Map();
  for (const item of row.revenue) {
    const source = sourceLabel(item.source || item.detected);
    add(revenue, source, Math.round(Number(item.amount) * 100));
  }
  const sorted = map => [...map].sort(([left], [right]) => left.localeCompare(right));
  return {
    inquiries, converted, aiInquiries, conversionRate: inquiries ? (converted / inquiries) * 100 : null,
    quotes: row.quotes, bookings: row.bookings,
    paidRevenue: [...revenue.values()].reduce((total, cents) => total + cents, 0) / 100,
    paidRevenueBySource: sorted(revenue).map(([key, cents]) => [key, cents / 100]),
    sources: sorted(sources), detectedSources: sorted(detectedSources), services: sorted(services),
    scans: row.scans, engagement: row.engagement,
    qrScans: row.scans.reduce((total, record) => total + record.count, 0),
    qrEngagement: row.engagement.reduce((total, record) => total + record.count, 0),
  };
}

export async function loadMarketingReport(pool, periods) {
  const { rows } = await pool.query(reportSql, [
    periods.start, iso(parse(periods.end) + day), periods.previousStart,
  ]);
  return Object.fromEntries(rows.map(row => [row.period, summarize(row)]));
}
