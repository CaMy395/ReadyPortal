import test from 'node:test';
import assert from 'node:assert/strict';
import trainingAttendanceRouter from './trainingAttendance.js';

async function run(action, { exists = true, open = false, id = '321' } = {}) {
  const queries = [];
  let released = false;
  const client = {
    query: async (sql, params) => {
      queries.push({ sql, params });
      if (sql.startsWith('SELECT id FROM bartending_course_inquiries')) return { rowCount: exists ? 1 : 0, rows: [{ id: 321 }] };
      if (sql.startsWith('SELECT id FROM bartending_course_attendance')) return { rowCount: open ? 1 : 0, rows: [{ id: 987 }] };
      return { rows: [{ student_id: 321 }] };
    },
    release: () => { released = true; },
  };
  const router = trainingAttendanceRouter({ connect: async () => client });
  const res = { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await router.stack[0].route.stack[0].handle({ params: { studentId: id, action } }, res);
  return { res, queries, released };
}

test('roster students without portal accounts can sign in using their enrollment ID', async () => {
  const { res, queries, released } = await run('sign-in');
  assert.equal(res.code, 200);
  assert.deepEqual(queries.find(q => q.sql.startsWith('INSERT')).params, [321]);
  assert.ok(queries.every(q => !q.sql.includes('FROM users')));
  assert.ok(queries.some(q => q.sql === 'COMMIT'));
  assert.equal(released, true);
});

test('sign-out closes the selected enrollment session and computes elapsed hours', async () => {
  const { res, queries } = await run('sign-out', { open: true });
  assert.equal(res.code, 200);
  const update = queries.find(q => q.sql.startsWith('UPDATE'));
  assert.deepEqual(update.params, [987]);
  assert.match(update.sql, /EXTRACT\(EPOCH/);
});

test('duplicate sign-ins and sign-outs without a session do not write attendance', async () => {
  for (const [action, open] of [['sign-in', true], ['sign-out', false]]) {
    const { res, queries } = await run(action, { open });
    assert.equal(res.code, 409);
    assert.ok(queries.some(q => q.sql === 'ROLLBACK'));
    assert.ok(queries.every(q => !/^(INSERT|UPDATE)/.test(q.sql)));
  }
});

test('missing and invalid roster IDs cannot create attendance', async () => {
  assert.equal((await run('sign-in', { exists: false })).res.code, 404);
  assert.equal((await run('sign-in', { id: 'invalid' })).res.code, 400);
});
