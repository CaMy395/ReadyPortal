import express from 'express';

// Administrative attendance uses enrollment IDs, not portal user IDs.
export default function trainingAttendanceRouter(pool) {
  const router = express.Router();
  router.post('/:studentId/:action', async (req, res) => {
    const studentId = Number(req.params.studentId);
    const { action } = req.params;
    if (!Number.isSafeInteger(studentId) || studentId <= 0 || !['sign-in', 'sign-out'].includes(action)) {
      return res.status(400).json({ error: 'Select a valid student and attendance action.' });
    }
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');
      const student = await client.query('SELECT id FROM bartending_course_inquiries WHERE id = $1 FOR UPDATE', [studentId]);
      if (!student.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Student not found.' });
      }
      const open = await client.query(`SELECT id FROM bartending_course_attendance
        WHERE student_id = $1 AND sign_out_time IS NULL ORDER BY sign_in_time DESC LIMIT 1`, [studentId]);
      let result;
      if (action === 'sign-in') {
        if (open.rowCount) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'This student is already signed in.' });
        }
        result = await client.query(`INSERT INTO bartending_course_attendance (student_id, sign_in_time)
          VALUES ($1, NOW()) RETURNING *`, [studentId]);
      } else {
        if (!open.rowCount) {
          await client.query('ROLLBACK');
          return res.status(409).json({ error: 'This student has no open session to sign out.' });
        }
        result = await client.query(`UPDATE bartending_course_attendance
          SET sign_out_time = NOW(), session_hours = EXTRACT(EPOCH FROM (NOW() - sign_in_time)) / 3600.0
          WHERE id = $1 RETURNING *`, [open.rows[0].id]);
      }
      await client.query('COMMIT');
      return res.json({ ok: true, attendance: result.rows[0] });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      console.error('Training attendance failed:', error);
      return res.status(500).json({ error: 'Could not update student attendance.' });
    } finally {
      client?.release();
    }
  });
  return router;
}
