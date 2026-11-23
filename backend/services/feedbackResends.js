// An explicit resend keeps the original feedback link and records SMTP acceptance.
// Claim before delivery so a restart cannot repeatedly send the same queued request.
export async function ensureFeedbackResendQueue(db) {
  await db.query(`CREATE TABLE IF NOT EXISTS feedback_resend_queue (
    request_id INTEGER PRIMARY KEY REFERENCES feedback_requests(id),
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempted_at TIMESTAMPTZ, sent_at TIMESTAMPTZ,
    sender TEXT, message_id TEXT, last_error TEXT
  )`);
}

export async function sendQueuedFeedbackRequests(pool, sendEmail, sender = process.env.ADMIN_EMAIL) {
  const db = await pool.connect();
  try {
    await ensureFeedbackResendQueue(db);
    const { rows } = await db.query(`SELECT q.request_id FROM feedback_resend_queue q
      WHERE q.status='pending' ORDER BY q.requested_at LIMIT 5`);
    for (const row of rows) {
      const claim = await db.query(`UPDATE feedback_resend_queue SET status='sending',attempted_at=NOW(),sender=$2
        WHERE request_id=$1 AND status='pending' RETURNING request_id`, [row.request_id, sender]);
      if (!claim.rowCount) continue;
      try {
        const { rows: [request] } = await db.query(`SELECT f.*,g.event_type,g.date AS gig_date,
          a.title,a.date AS appointment_date
          FROM feedback_requests f LEFT JOIN gigs g ON g.id=f.gig_id
          LEFT JOIN appointments a ON a.id=f.appointment_id WHERE f.id=$1`, [row.request_id]);
        if (!request || request.completed_at) {
          await db.query("UPDATE feedback_resend_queue SET status='skipped',last_error='Feedback already completed or missing' WHERE request_id=$1", [row.request_id]);
          continue;
        }
        const receipt = await sendEmail({ email: request.client_email, clientName: request.client_name,
          eventType: request.event_type || request.title, eventDate: request.gig_date || request.appointment_date,
          feedbackLink: `https://readybartending.com/rb/feedback/${request.token}` });
        if (!receipt?.accepted?.length) throw new Error('Mail server did not accept recipient');
        await db.query(`UPDATE feedback_resend_queue SET status='sent',sent_at=NOW(),message_id=$2,last_error=NULL
          WHERE request_id=$1`, [row.request_id, receipt.messageId]);
      } catch (error) {
        // Do not retry an ambiguous SMTP outcome every hour; retain it for review.
        await db.query("UPDATE feedback_resend_queue SET status='failed',last_error=$2 WHERE request_id=$1",
          [row.request_id, String(error?.code || error?.message || 'Send failed').slice(0, 200)]);
        console.error('Queued feedback send failed:', row.request_id, error?.code || error?.message);
      }
    }
  } finally { db.release(); }
}
