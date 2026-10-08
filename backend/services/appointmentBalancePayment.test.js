import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const route = source.slice(source.indexOf("app.post('/api/client-appointment-balances/:id/payments'"), source.indexOf("app.get('/api/client-appointment-balances'"));
async function run(amount, failProfit = false) {
  const calls = [];
  let handler;
  const connection = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (sql.startsWith('SELECT')) return { rows: [{ id: 4, title: 'Class', price: 200, client_payment: 50, paid: false, status: 'Confirmed' }] };
      if (sql.includes('INSERT INTO profits') && failProfit) throw new Error('Unavailable');
      return { rows: [{}] };
    },
    release() { calls.push({ sql: 'RELEASE' }); },
  };
  vm.runInNewContext(route, { app: { post(path, fn) { handler = fn; } }, pool: { connect: async () => connection }, ensureAccountingSchema: async () => {}, console: { error() {} } });
  const res = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await handler({ params: { id: '4' }, body: { amount, payment_date: '2026-10-08' } }, res);
  return { calls, res };
}
test('full balance payment updates booking and income in one transaction', async () => {
  const { calls, res } = await run(150);
  assert.equal(res.code, 200);
  assert.deepEqual(Array.from(calls.find(c => c.sql.startsWith('UPDATE')).values), [200, true, 'Manual', 4]);
  assert.ok(calls.some(c => c.sql.includes('INSERT INTO profits')));
  assert.ok(calls.some(c => c.sql === 'COMMIT'));
});
test('partial payment leaves booking unpaid', async () => {
  const { calls } = await run(25);
  assert.deepEqual(Array.from(calls.find(c => c.sql.startsWith('UPDATE')).values), [75, false, 'Manual', 4]);
});
test('overpayment and invalid amounts do not write', async () => {
  for (const amount of [151, -1, 0, 'bad', 0.001]) {
    const { calls, res } = await run(amount);
    assert.equal(res.code, 400);
    assert.ok(!calls.some(c => c.sql.startsWith('UPDATE')));
  }
});
test('income failure rolls back booking payment', async () => {
  const { calls, res } = await run(150, true);
  assert.equal(res.code, 500);
  assert.ok(calls.some(c => c.sql === 'ROLLBACK'));
  assert.ok(!calls.some(c => c.sql === 'COMMIT'));
});
