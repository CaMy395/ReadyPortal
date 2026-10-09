import test from 'node:test';
import assert from 'node:assert/strict';
import { dueReminders, createGigReminders } from './gigReminders.js';

test('24-hour reminders and start-time reminders honor Eastern time and recorded attendance', () => {
  const gig = { id: 1, date: '2026-10-10', time: '17:00:00' };
  assert.equal(dueReminders(gig, '2026-10-09T20:59:00Z').length, 0);
  assert.equal(dueReminders(gig, '2026-10-09T21:00:00Z')[0].kind, 'gig_reminders');
  assert.equal(dueReminders(gig, '2026-10-09T22:00:00Z').length, 0);
  assert.equal(dueReminders(gig, '2026-10-10T20:59:00Z').length, 0);
  assert.equal(dueReminders(gig, '2026-10-10T21:00:00Z')[0].kind, 'clock_in_reminders');
  assert.equal(dueReminders({ ...gig, checked_in: true }, '2026-10-10T21:00:00Z').length, 0);
  assert.equal(dueReminders(gig, '2026-10-10T21:30:00Z').length, 0);
  assert.equal(dueReminders({ ...gig, time: '' }).length, 0);
  assert.equal(dueReminders({ ...gig, date: '2026-12-10' }, '2026-12-09T22:00:00Z')[0].kind, 'gig_reminders');
});

function fixture({ removed = false, checkedIn = false, failing = false, locked = true } = {}) {
  const gig = { id: 9, date: '2026-10-10', time: '17:00:00', reminder_user_id: 2 };
  const sent = [], logs = new Set(), queries = [];
  const connection = { release() {}, query: async (sql, params) => {
    queries.push(sql);
    if (sql.includes('pg_try_advisory_lock')) return { rows: [{ locked }] };
    if (sql.startsWith('SELECT g.*, u.id')) return { rows: [gig] };
    if (sql.startsWith('SELECT g.*,')) return { rows: removed ? [] : [{ ...gig, checked_in: checkedIn }] };
    if (sql.startsWith('SELECT 1 FROM staff_gig_reminder_deliveries')) return { rows: logs.has(params.join('|')) ? [{}] : [] };
    if (sql.startsWith('INSERT INTO staff_gig_reminder_deliveries')) logs.add(params.join('|'));
    return { rows: [] };
  } };
  const push = { initialize: async () => {}, send: async (...args) => { sent.push(args); return failing ? 0 : 1; } };
  return { service: createGigReminders({ connect: async () => connection }, push), sent, logs, queries };
}
test('repeated scheduler runs do not repeat delivered reminders and use the claimed recipient', async () => {
  const { service, sent } = fixture();
  await service.tick('2026-10-09T21:00:00Z');
  await service.tick('2026-10-09T21:01:00Z');
  assert.equal(sent.length, 1);
  assert.equal(sent[0][1].userId, 2);
  assert.equal(sent[0][1].kind, 'gig_reminders');
});
test('unclaimed gigs, clocked-in staff, and a scheduler running on another server are skipped', async () => {
  for (const options of [{ removed: true }, { checkedIn: true }, { locked: false }]) {
    const { service, sent } = fixture(options);
    await service.tick('2026-10-10T21:00:00Z');
    assert.equal(sent.length, 0);
  }
});
test('undelivered pushes can retry within the catch-up window', async () => {
  const { service, sent, logs } = fixture({ failing: true });
  await service.tick('2026-10-10T21:00:00Z');
  await service.tick('2026-10-10T21:01:00Z');
  assert.equal(sent.length, 2);
  assert.equal(logs.size, 0);
});
