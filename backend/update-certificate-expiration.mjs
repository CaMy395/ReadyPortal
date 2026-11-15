import fs from 'node:fs';
process.env.NODE_ENV = 'production';
const { default: pool } = await import('./db.js');
try {
  const result = await pool.query(fs.readFileSync(new URL('./sql/training_certificate_expiration.sql', import.meta.url), 'utf8'));
  const check = await pool.query(`SELECT COUNT(*)::int AS missing_expirations FROM public.training_certificates WHERE issue_date IS NOT NULL AND expiration_date IS NULL`);
  if (check.rows[0].missing_expirations !== 0) throw new Error('Certificates still missing expiration dates');
  console.log(JSON.stringify({ updated: result.rowCount, verified: true }));
} catch (error) {
  console.error('Certificate expiration update failed:', error.code || error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
