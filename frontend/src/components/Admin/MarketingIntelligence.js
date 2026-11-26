import React, { useEffect, useState } from 'react';
import './MarketingIntelligence.css';
import { API_BASE_URL } from '../../apiConfig';

const number = new Intl.NumberFormat();
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const nyDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });
const percent = value => number.format(Math.round(value * 10) / 10) + '%';
const labels = {
  'search-console': 'Google Search Console', 'business-profile': 'Google Business Profile', 'google-reviews': 'Google reviews',
  clicks: 'Search clicks', impressions: 'Search impressions', ctr: 'Click-through rate', averagePosition: 'Average search position',
  totalReviews: 'Lifetime review count', averageRating: 'Average rating',
  BUSINESS_IMPRESSIONS_DESKTOP_MAPS: 'Maps impressions (desktop)',
  BUSINESS_IMPRESSIONS_MOBILE_MAPS: 'Maps impressions (mobile)',
  BUSINESS_IMPRESSIONS_DESKTOP_SEARCH: 'Search impressions (desktop)',
  BUSINESS_IMPRESSIONS_MOBILE_SEARCH: 'Search impressions (mobile)',
  WEBSITE_CLICKS: 'Website clicks', CALL_CLICKS: 'Call clicks', BUSINESS_DIRECTION_REQUESTS: 'Directions requests',
};
const cards = [
  ['inquiries', 'Total inquiries'], ['quotes', 'Quotes generated'], ['bookings', 'Confirmed bookings'],
  ['paidRevenue', 'Recorded paid revenue', money.format], ['conversionRate', 'Inquiry-to-booking conversion', percent],
  ['aiInquiries', 'AI-assisted inquiries'], ['qrScans', 'QR landing visits'], ['qrEngagement', 'QR link clicks'],
];
const groups = [
  ['sources', 'Customer-reported source'], ['detectedSources', 'Automatically detected source'],
  ['services', 'Inquiries by service'], ['paidRevenueBySource', 'Paid revenue by source', money.format],
  ['scans', 'QR landing visits by code'], ['engagement', 'QR link clicks by code'],
];
const api = API_BASE_URL;
const display = (value, format = number.format) => value == null ? 'Unavailable' : format(value);
const entries = (data, key) => data[key].map(item => Array.isArray(item) ? item :
  [item.button ? item.ref + ' / ' + item.button : item.ref, item.count]);

async function request(path, parameters, init) {
  const response = await fetch(api + '/api/admin/marketing' + path + '?' + new URLSearchParams(parameters), {
    ...init,
    credentials: 'include',
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error || 'Marketing data could not be loaded.');
  return data;
}

function csvCell(value) {
  const text = String(value ?? 'Unavailable');
  const safe = typeof value !== 'number' && /^[\s]*[=+\-@\t\r\n]/.test(text) ? "'" + text : text;
  return '"' + safe.replace(/"/g, '""') + '"';
}

function downloadReport(report) {
  const rows = [
    ['Section', 'Metric', 'Current', 'Previous'],
    ['Date range', 'Start', report.periods.start, report.periods.previousStart],
    ['Date range', 'End', report.periods.end, report.periods.previousEnd],
    ...cards.map(([key, label]) => ['Overview', label, report.current[key], report.previous[key]]),
    ...groups.flatMap(([key, label]) => {
      const current = new Map(entries(report.current, key));
      const previous = new Map(entries(report.previous, key));
      return [...new Set([...current.keys(), ...previous.keys()])]
        .map(item => [label, item, current.get(item) ?? 0, previous.get(item) ?? 0]);
    }),
    ...report.connections.flatMap(connection => {
      const current = connection.metrics || {}, previous = connection.previousMetrics || {};
      return [
        [labels[connection.provider], 'Connection status', connection.status, null],
        [labels[connection.provider], 'Last successful sync', connection.lastSync, null],
        ...Object.keys({ ...current, ...previous }).map(key =>
          [labels[connection.provider], labels[key] || key, current[key], previous[key]]),
      ];
    }),
  ];
  const url = URL.createObjectURL(new Blob([rows.map(row => row.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ready-marketing-' + report.periods.start + '.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Breakdown({ title, current, previous, format }) {
  const now = new Map(current), before = new Map(previous);
  const keys = [...new Set([...now.keys(), ...before.keys()])].sort();
  return <section className="marketing-panel">
    <h2>{title}</h2>
    {keys.length ? <table><thead><tr><th scope="col">Category</th><th scope="col">Current</th><th scope="col">Previous</th></tr></thead>
      <tbody>{keys.map(key => <tr key={key}><th scope="row">{key}</th>
        <td>{display(now.get(key) ?? 0, format)}</td><td>{display(before.get(key) ?? 0, format)}</td></tr>)}</tbody>
    </table> : <p>No records for these periods.</p>}
  </section>;
}

export default function MarketingIntelligence() {
  const [filters, setFilters] = useState(() => {
    const now = new Date();
    return { start: nyDate.format(new Date(now.getTime() - 29 * 86400000)), end: nyDate.format(now) };
  });
  const [range, setRange] = useState(filters);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setReport(null);
    request('', range, { signal: controller.signal }).then(setReport).catch(err => {
      if (!controller.signal.aborted) setError(err.message);
    });
    return () => controller.abort();
  }, [range, refresh]);

  async function sync(provider) {
    setSyncing(provider);
    setError('');
    try {
      await request('/sync/' + provider, range, { method: 'POST' });
      setRefresh(value => value + 1);
    } catch (err) { setError(err.message); }
    finally { setSyncing(''); }
  }

  return <main className="marketing-intelligence">
    <h1>Marketing Intelligence</h1>
    <form className="marketing-filters" onSubmit={event => { event.preventDefault(); setRange({ ...filters }); }}>
      <label>Start date <input required type="date" value={filters.start} onChange={e => setFilters({ ...filters, start: e.target.value })} /></label>
      <label>End date <input required type="date" min={filters.start} value={filters.end} onChange={e => setFilters({ ...filters, end: e.target.value })} /></label>
      <button type="submit">Apply dates</button>
      <button type="button" disabled={!report} onClick={() => downloadReport(report)}>Export CSV</button>
    </form>
    {error && <p role="alert">{error}</p>}
    {!report && !error && <p role="status">Loading marketing data…</p>}
    {report && <>
      <p>Comparing {report.periods.start} to {report.periods.end} with {report.periods.previousStart} to {report.periods.previousEnd}.</p>
      <div className="marketing-grid">{cards.map(([key, label, format]) =>
        <section className="marketing-panel" key={key}><h2>{label}</h2>
          <strong>{display(report.current[key], format)}</strong>
          <p>Previous period {display(report.previous[key], format)}</p>
        </section>)}</div>
      <details className="marketing-panel"><summary>How these metrics are counted</summary>
        <p>Conversion follows inquiries received during each period through their uniquely linked bookings to date. Bookings use the original record date and current confirmation status. Confirmed records tied to the same inquiry count once in the earliest record period.</p>
        <p>Revenue includes recorded quote payments, appointment income with an appointment ID, and paid ticket orders. Attribution uses a unique matching inquiry for the same customer and event date. The customer’s answer takes precedence, with the detected source used when the answer is missing.</p>
        <p>Unattributed records have no recorded source or reliable inquiry link. Legacy source includes historical answers outside the current choices. AI-assisted counts include an identified AI or voice assistant from either source. QR counts represent tracked visits and clicks rather than unique people.</p>
      </details>
      <div className="marketing-grid marketing-breakdowns">{groups.map(([key, label, format]) =>
        <Breakdown key={key} title={label} current={entries(report.current, key)} previous={entries(report.previous, key)} format={format} />
      )}</div>
      <h2>Google integrations</h2>
      <div className="marketing-grid marketing-breakdowns">{report.connections.map(connection =>
        <section className="marketing-panel" key={connection.provider}>
          <h3>{labels[connection.provider]}</h3>
          <p>Connection {connection.status}</p>
          <p>Last successful sync {connection.lastSync ? new Date(connection.lastSync).toLocaleString() : 'Unavailable'}</p>
          {connection.currentSync && <p>Selected period synced {new Date(connection.currentSync).toLocaleString()}</p>}
          {connection.provider === 'google-reviews' && <p>Review metrics cover the listing’s lifetime.</p>}
          {connection.error && <p role="alert">{connection.error}</p>}
          {connection.metrics ? <dl>{Object.entries(connection.metrics).map(([key, value]) =>
            <React.Fragment key={key}><dt>{labels[key] || key}</dt>
              <dd>{display(value, key === 'ctr' ? rate => percent(rate * 100) : undefined)}
                {connection.previousMetrics && ' (previous ' + display(connection.previousMetrics[key], key === 'ctr' ? rate => percent(rate * 100) : undefined) + ')'}
              </dd></React.Fragment>)}</dl> : <p>Metrics unavailable</p>}
          {report.canSync && connection.status !== 'authorization required' &&
            <button type="button" disabled={Boolean(syncing)} onClick={() => sync(connection.provider)}>
              {syncing === connection.provider ? 'Syncing…' : 'Sync now'}
            </button>}
        </section>
      )}</div>
    </>}
  </main>;
}
