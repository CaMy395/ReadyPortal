import test from 'node:test';
import assert from 'node:assert/strict';
import { sendQueuedFeedbackRequests } from './feedbackResends.js';

function fixture({ completed = false, claimed = true } = {}) {
  const queue = { status: 'pending' };
  const request = { token: 'existing-link', client_email: 'client@example.com', client_name: 'Client', event_type: 'Gig', gig_date: '2026-11-06', completed_at: completed ? new Date() : null };
  const query = async (sql, args) => {
    if (sql.startsWith('SELECT q.request_id')) return { rows: queue.status === 'pending' ? [{ request_id: 1 }] : [] };
    if (sql.includes("SET status='sending'")) { if (claimed) queue.status = 'sending'; return { rowCount: claimed ? 1 : 0 }; }
    if (sql.startsWith('SELECT f.*')) return { rows: [request] };
    if (sql.includes("SET status='sent'")) { queue.status = 'sent'; queue.messageId = args[1]; }
    if (sql.includes("SET status='failed'")) queue.status = 'failed';
    if (sql.includes("SET status='skipped'")) queue.status = 'skipped';
    return { rows: [], rowCount: 1 };
  };
  return { pool: { connect: async () => ({ query, release() {} }) }, queue };
}

test('explicit resend reuses the original link, records acceptance and sends once across runs', async () => {
  const { pool, queue } = fixture();
  let count = 0;
  const send = async email => { count++; assert.equal(email.feedbackLink, 'https://readybartending.com/rb/feedback/existing-link'); return { accepted: [email.email], messageId: 'receipt' }; };
  await sendQueuedFeedbackRequests(pool, send, 'business@example.com');
  await sendQueuedFeedbackRequests(pool, send, 'business@example.com');
  assert.equal(count, 1);
  assert.equal(queue.status, 'sent');
  assert.equal(queue.messageId, 'receipt');
});

test('completed feedback and requests claimed by another worker are not resent', async () => {
  for (const options of [{ completed: true }, { claimed: false }]) {
    const { pool } = fixture(options);
    await sendQueuedFeedbackRequests(pool, () => { assert.fail('must not send'); });
  }
});

test('SMTP rejection is recorded for review rather than retried repeatedly', async () => {
  const { pool, queue } = fixture();
  let count = 0;
  const send = async () => { count++; throw Object.assign(new Error('Rejected'), { code: 'EAUTH' }); };
  await sendQueuedFeedbackRequests(pool, send);
  await sendQueuedFeedbackRequests(pool, send);
  assert.equal(queue.status, 'failed');
  assert.equal(count, 1);
});
