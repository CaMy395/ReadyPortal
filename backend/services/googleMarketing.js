const profileMetrics = [
  'BUSINESS_IMPRESSIONS_DESKTOP_MAPS', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
  'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'WEBSITE_CLICKS', 'CALL_CLICKS', 'BUSINESS_DIRECTION_REQUESTS',
];
const providers = ['search-console', 'business-profile', 'google-reviews'];
const reviewDate = '2000-01-01';
const numeric = value => value != null && Number.isFinite(Number(value)) ? Number(value) : null;

function settings(env, provider) {
  const search = provider === 'search-console';
  const reviews = provider === 'google-reviews';
  const refresh = search ? env.MARKETING_GSC_REFRESH_TOKEN : env.MARKETING_GBP_REFRESH_TOKEN;
  const location = env.MARKETING_GBP_LOCATION_ID;
  const account = env.MARKETING_GBP_ACCOUNT_ID;
  const property = env.MARKETING_GSC_PROPERTY;
  return {
    refresh, location, account, property,
    configured: Boolean(env.MARKETING_GOOGLE_CLIENT_ID && env.MARKETING_GOOGLE_CLIENT_SECRET && refresh &&
      (search ? property : /^\d+$/.test(location || '') && (!reviews || /^\d+$/.test(account || '')))),
  };
}

async function googleJson(fetcher, url, init) {
  const response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    const error = new Error('Google request failed');
    error.status = response.status;
    throw error;
  }
  return response.json();
}

async function requestMetrics(fetcher, env, provider, config, start, end) {
  const { access_token: token } = await googleJson(fetcher, 'https://oauth2.googleapis.com/token', {
    method: 'POST', body: new URLSearchParams({
      client_id: env.MARKETING_GOOGLE_CLIENT_ID, client_secret: env.MARKETING_GOOGLE_CLIENT_SECRET,
      refresh_token: config.refresh, grant_type: 'refresh_token',
    }),
  });
  if (typeof token !== 'string' || !token) throw new Error('Google OAuth response was incomplete');
  const headers = { Authorization: 'Bearer ' + token };
  if (provider === 'search-console') {
    const data = await googleJson(fetcher, 'https://www.googleapis.com/webmasters/v3/sites/' +
      encodeURIComponent(config.property) + '/searchAnalytics/query', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: start, endDate: end, type: 'web', dataState: 'final' }),
    });
    const row = data.rows?.[0];
    return { clicks: numeric(row?.clicks), impressions: numeric(row?.impressions),
      ctr: numeric(row?.ctr), averagePosition: numeric(row?.position) };
  }
  if (provider === 'google-reviews') {
    // Only aggregate fields are returned by Google and persisted.
    const params = new URLSearchParams({ pageSize: '1', fields: 'averageRating,totalReviewCount' });
    const data = await googleJson(fetcher, 'https://mybusiness.googleapis.com/v4/accounts/' +
      config.account + '/locations/' + config.location + '/reviews?' + params, { headers });
    return { totalReviews: numeric(data.totalReviewCount), averageRating: numeric(data.averageRating) };
  }
  const query = new URLSearchParams();
  profileMetrics.forEach(metric => query.append('dailyMetrics', metric));
  for (const [key, value] of [['start', start], ['end', end]]) {
    const [year, month, day] = value.split('-').map(Number);
    for (const [part, number] of Object.entries({ year, month, day })) query.set('dailyRange.' + key + '_date.' + part, number);
  }
  const data = await googleJson(fetcher, 'https://businessprofileperformance.googleapis.com/v1/locations/' +
    config.location + ':fetchMultiDailyMetricsTimeSeries?' + query, { headers });
  const totals = Object.fromEntries(profileMetrics.map(key => [key, null]));
  for (const group of data.multiDailyMetricTimeSeries || []) {
    for (const series of group.dailyMetricTimeSeries || []) {
      if (!profileMetrics.includes(series.dailyMetric)) continue;
      const dates = series.timeSeries?.datedValues;
      if (!dates?.length) continue;
      totals[series.dailyMetric] = (totals[series.dailyMetric] || 0) +
        dates.reduce((sum, point) => sum + (numeric(point.value) || 0), 0);
    }
  }
  return totals;
}

export function createGoogleMarketing(pool, env = process.env, fetcher = fetch) {
  function range(provider, periods) {
    return provider === 'google-reviews' ? [reviewDate, reviewDate] : [periods.start, periods.end];
  }

  async function status(periods) {
    const result = await pool.query(`SELECT provider, start_date::text, end_date::text, synced_at, metrics, error_code
      FROM marketing_google_snapshots
      WHERE (start_date, end_date) IN (($1::date,$2::date),($3::date,$4::date),($5::date,$5::date))`,
    [periods.start, periods.end, periods.previousStart, periods.previousEnd, reviewDate]);
    const latest = await pool.query('SELECT provider, max(synced_at) AS last_synced_at FROM marketing_google_snapshots GROUP BY provider');
    return providers.map(provider => {
      const [start, end] = range(provider, periods);
      const current = result.rows.find(row => row.provider === provider && row.start_date === start && row.end_date === end);
      const previous = provider === 'google-reviews' ? null : result.rows.find(row =>
        row.provider === provider && row.start_date === periods.previousStart && row.end_date === periods.previousEnd);
      const lastSync = latest.rows.find(row => row.provider === provider)?.last_synced_at ?? null;
      return {
        provider, lastSync, currentSync: current?.synced_at ?? null,
        status: !settings(env, provider).configured ? 'authorization required' :
          current?.error_code ? 'sync failed' : lastSync ? 'connected' : 'ready to sync',
        metrics: current?.metrics ?? null, previousMetrics: previous?.metrics ?? null,
        error: current?.error_code ?? null,
      };
    });
  }

  async function sync(provider, periods) {
    if (!providers.includes(provider)) return null;
    const config = settings(env, provider);
    if (!config.configured) return { status: 'authorization required' };
    const ranges = [range(provider, periods)];
    if (provider !== 'google-reviews') ranges.push([periods.previousStart, periods.previousEnd]);
    const errors = [];
    for (const [start, end] of ranges) {
      let metrics;
      try {
        metrics = await requestMetrics(fetcher, env, provider, config, start, end);
      } catch (error) {
        const code = [400, 401, 403].includes(error.status) ? 'Check Google credentials and property access.' :
          error.status === 429 ? 'Google quota reached. Try again later.' : 'Google is temporarily unavailable.';
        await pool.query(`INSERT INTO marketing_google_snapshots (provider, start_date, end_date, error_code)
          VALUES ($1,$2,$3,$4) ON CONFLICT (provider,start_date,end_date)
          DO UPDATE SET error_code = EXCLUDED.error_code`, [provider, start, end, code]);
        errors.push(code);
        continue;
      }
      await pool.query(`INSERT INTO marketing_google_snapshots (provider, start_date, end_date, synced_at, metrics)
        VALUES ($1,$2,$3,now(),$4) ON CONFLICT (provider,start_date,end_date)
        DO UPDATE SET synced_at = EXCLUDED.synced_at, metrics = EXCLUDED.metrics, error_code = NULL`,
      [provider, start, end, metrics]);
    }
    return { status: errors.length ? 'sync failed' : 'connected', error: errors[0] };
  }
  return { status, sync };
}
