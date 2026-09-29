import test from 'node:test';
import assert from 'node:assert/strict';
import { saveTransaction, processDeposit, postDeposit } from './plaidAccounting.js';

const transaction = { transaction_id: 'deposit-1', account_id: 'account-1', name: 'Tip payout', amount: -40, date: '2026-09-29', pending: false };
function ledger({ payments = [], rules = [], refundExpenses = [], saved = {} } = {}) {
  const profits = new Map();
  const statuses = [];
  const client = { profits, statuses, async query(sql, args = []) {
    let rows = [];
    if (sql.includes('INSERT INTO plaid_transactions')) rows = [{ review_status: 'auto_ignored', ...saved }];
    else if (sql.includes('SELECT payout_id FROM square_payouts')) rows = [];
    else if (sql.includes('SELECT id,description,amount,type')) rows = payments;
    else if (sql.includes('SELECT * FROM bank_deposit_rules')) rows = rules;
    else if (sql.includes('SELECT e.id,e.category FROM expenses')) rows = refundExpenses;
    else if (sql.includes('DELETE FROM profits')) profits.delete(args[0]);
    else if (sql.includes('INSERT INTO profits')) profits.set(args[5], { category: args[0], amount: args[2], type: args[3] });
    if (sql.includes("review_status='deposit_classified'")) statuses.push({ status: 'classified', kind: args[1], expenseId: args[4] });
    if (sql.includes("review_status='bank_reconciled'")) statuses.push({ status: 'matched' });
    if (sql.includes("review_status='deposit_unmatched'")) statuses.push({ status: 'review' });
    return { rows, rowCount: rows.length };
  } };
  return client;
}
const tipRule = { id: 1, account_id: 'account-1', enabled: true, match_field: 'description', match_value: 'Tip payout', kind: 'tips' };

test('repeated imports produce one tip entry and pending updates remove it', async () => {
  const client = ledger({ rules: [tipRule] });
  await saveTransaction(client, 'item', transaction);
  await saveTransaction(client, 'item', transaction);
  assert.equal(client.profits.size, 1);
  assert.equal(client.profits.get('plaid:deposit-1').amount, 40);
  await saveTransaction(client, 'item', { ...transaction, pending: true });
  assert.equal(client.profits.size, 0);
});
test('existing income is matched before any rule can create a new entry', async () => {
  const client = ledger({ payments: [{ id: 123 }], rules: [tipRule] });
  await processDeposit(client, { ...transaction, name: 'Client payment', personal_finance_category: { primary: 'INCOME' } }, {});
  assert.equal(client.profits.size, 0);
  assert.equal(client.statuses.at(-1).status, 'matched');
});
test('ambiguous payment candidates block automatic categorization', async () => {
  const client = ledger({ payments: [{ id: 1 }, { id: 2 }], rules: [tipRule] });
  await processDeposit(client, transaction, {});
  assert.equal(client.profits.size, 0);
  assert.equal(client.statuses.at(-1).status, 'review');
});
test('unknown and conflicting deposits are not posted', async () => {
  for (const rules of [[], [tipRule, { ...tipRule, id: 2, kind: 'refund' }]]) {
    const client = ledger({ rules });
    await processDeposit(client, transaction, {});
    assert.equal(client.profits.size, 0);
    assert.equal(client.statuses.at(-1).status, 'review');
  }
});
test('reviewed transfer survives bank updates without creating income', async () => {
  const client = ledger({ saved: { deposit_kind: 'transfer', deposit_source: 'manual' }, rules: [tipRule] });
  await saveTransaction(client, 'item', transaction);
  assert.equal(client.profits.size, 0);
  assert.equal(client.statuses.at(-1).kind, 'transfer');
});
test('refund links a unique original expense and posts a reduction', async () => {
  const client = ledger({ refundExpenses: [{ id: 55, category: 'Office Supplies' }] });
  await postDeposit(client, { ...transaction, merchant_name: 'Office Store' }, 'refund', 'manual');
  assert.deepEqual(client.profits.get('plaid:deposit-1'), { category: 'Office Supplies', amount: 40, type: 'expense_refund' });
  assert.equal(client.statuses.at(-1).expenseId, 55);
});
