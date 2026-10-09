import moment from 'moment-timezone';

const ZONE = 'America/New_York';
export function dueReminders(gig, now = new Date()) {
  const date = String(gig.date instanceof Date ? gig.date.toISOString() : gig.date || '').slice(0, 10);
  const time = String(gig.time || '').slice(0, 5);
  const start = moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', true, ZONE);
  if (!start.isValid()) return [];
  const elapsed = new Date(now).getTime() - start.valueOf();
  const due = [];
  // One-hour catch-up window survives brief deploys without sending stale alerts.
  if (elapsed >= -86400000 && elapsed < -82800000) due.push('gig_reminders');
  if (elapsed >= 0 && elapsed < 1800000 && !gig.checked_in) due.push('clock_in_reminders');
  return due.map(kind => ({ kind, startAt: start.toISOString(), payload: {
    title: kind === 'gig_reminders' ? 'Your Ready gig is tomorrow' : 'Time to clock in for your Ready gig',
    body: `${gig.position || gig.event_type || 'Claimed gig'} · ${start.format('MMM D, h:mm A')} Eastern${gig.is_backup ? ' · Confirmed backup' : ''}. ${kind === 'gig_reminders' ? 'Review your gig details and arrival instructions.' : 'Open My Gigs and clock in when you arrive.'}`,
    tag: `ready-${kind}-${gig.id}-${start.valueOf()}`,
  } }));
}

export function createGigReminders(pool, push) {
  let running = false;
  let initialized = false;
  async function tick(now = new Date()) {
    if (running) return;
    running = true;
    let connection;
    let locked = false;
    try {
      await push.initialize();
      connection = await pool.connect();
      const lock = await connection.query('SELECT pg_try_advisory_lock(7142026, 109) AS locked');
      locked = lock.rows[0]?.locked;
      if (!locked) return;
      if (!initialized) {
        await connection.query(`CREATE TABLE IF NOT EXISTS staff_gig_reminder_deliveries (
          gig_id INTEGER NOT NULL, user_id INTEGER NOT NULL, kind TEXT NOT NULL,
          start_at TIMESTAMPTZ NOT NULL, delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY(gig_id,user_id,kind,start_at)
        )`);
        initialized = true;
      }
      const { rows } = await connection.query(`SELECT g.*, u.id AS reminder_user_id,
        NOT (u.id=ANY(COALESCE(g.claimed_by_ids,ARRAY[]::integer[])) OR u.username=ANY(COALESCE(g.claimed_by,ARRAY[]::text[]))) AS is_backup,
        EXISTS(SELECT 1 FROM gigattendance a WHERE a.gig_id=g.id AND a.user_id=u.id AND a.check_in_time IS NOT NULL) AS checked_in
        FROM gigs g JOIN users u ON (
          u.id=ANY(COALESCE(g.claimed_by_ids,ARRAY[]::integer[])) OR u.username=ANY(COALESCE(g.claimed_by,ARRAY[]::text[]))
          OR u.id=ANY(COALESCE(g.backup_claimed_by_ids,ARRAY[]::integer[])) OR u.username=ANY(COALESCE(g.backup_claimed_by,ARRAY[]::text[])))
        WHERE g.date BETWEEN (($1::timestamptz AT TIME ZONE 'America/New_York')::date - 1) AND (($1::timestamptz AT TIME ZONE 'America/New_York')::date + 2)
        AND u.role IN ('user','student','admin') AND u.is_active IS DISTINCT FROM FALSE
        AND EXISTS(SELECT 1 FROM staff_gig_push_subscriptions s WHERE s.user_id=u.id)
        ORDER BY g.date,g.time,g.id,u.id`, [new Date(now).toISOString()]);
      for (const gig of rows) {
        for (const reminder of dueReminders(gig, now)) {
          const params = [gig.id, gig.reminder_user_id, reminder.kind, reminder.startAt];
          const prior = await connection.query(`SELECT 1 FROM staff_gig_reminder_deliveries WHERE gig_id=$1 AND user_id=$2 AND kind=$3 AND start_at=$4`, params);
          if (prior.rows.length) continue;
          // Re-read claims, time and attendance immediately before delivery.
          const current = await connection.query(`SELECT g.*,
            EXISTS(SELECT 1 FROM gigattendance a WHERE a.gig_id=g.id AND a.user_id=$2 AND a.check_in_time IS NOT NULL) AS checked_in
            FROM gigs g JOIN users u ON u.id=$2 WHERE g.id=$1 AND (
            u.id=ANY(COALESCE(g.claimed_by_ids,ARRAY[]::integer[])) OR u.username=ANY(COALESCE(g.claimed_by,ARRAY[]::text[]))
            OR u.id=ANY(COALESCE(g.backup_claimed_by_ids,ARRAY[]::integer[])) OR u.username=ANY(COALESCE(g.backup_claimed_by,ARRAY[]::text[])))`, params.slice(0, 2));
          if (!current.rows[0] || !dueReminders(current.rows[0], now).some(due => due.kind === reminder.kind && due.startAt === reminder.startAt)) continue;
          const delivered = await push.send(gig, { userId: gig.reminder_user_id, kind: reminder.kind, payload: reminder.payload });
          if (delivered) await connection.query(`INSERT INTO staff_gig_reminder_deliveries(gig_id,user_id,kind,start_at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`, params);
        }
      }
      await connection.query("DELETE FROM staff_gig_reminder_deliveries WHERE start_at < NOW() - INTERVAL '90 days'");
    } finally {
      if (locked) await connection.query('SELECT pg_advisory_unlock(7142026, 109)').catch(() => {});
      connection?.release();
      running = false;
    }
  }
  return { tick };
}
