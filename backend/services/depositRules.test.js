import test from 'node:test';
import assert from 'node:assert/strict';
import { decideDeposit, validateDepositRule, suggestDeposit, depositPosting } from './depositRules.js';

const deposit = { account_id: 'bank-a', name: 'VENMO GRATUITIES', merchant_name: 'Tip Sender', amount: -25, pending: false };
const rule = { id: 1, enabled: true, account_id: 'bank-a', match_field: 'description', match_value: 'gratuities', kind: 'tips' };

test('only posted deposits in the selected account match a rule', () => {
  assert.equal(decideDeposit(deposit, [rule]).kind, 'tips');
  for (const change of [{ pending: true }, { amount: 25 }, { amount: NaN }, { account_id: 'another-bank' }]) {
    assert.equal(decideDeposit({ ...deposit, ...change }, [rule]).kind, null);
  }
  assert.equal(decideDeposit(deposit, [{ ...rule, enabled: false }]).kind, null);
});
test('unknown deposits and overlapping rules remain in review', () => {
  assert.equal(decideDeposit(deposit, []).kind, null);
  assert.equal(decideDeposit(deposit, [rule, { ...rule, id: 2, kind: 'refund' }]).kind, null);
});
test('sender rules require an exact case-insensitive match', () => {
  const sender = { ...rule, match_field: 'merchant', match_value: 'tip sender' };
  assert.equal(decideDeposit(deposit, [sender]).kind, 'tips');
  assert.equal(decideDeposit({ ...deposit, merchant_name: 'Other Tip Sender' }, [sender]).kind, null);
});
test('suggestions do not create automatic rules', () => {
  assert.equal(suggestDeposit(deposit), 'tips');
  assert.equal(suggestDeposit({ name: 'Purchase refund' }), 'refund');
  assert.equal(suggestDeposit({ name: 'Account transfer' }), 'transfer');
  assert.equal(decideDeposit(deposit, []).kind, null);
});
test('invalid or broad empty rule definitions are rejected', () => {
  assert.throws(() => validateDepositRule({ kind: 'tips', accountId: 'bank-a', matchField: 'description', matchValue: '' }));
  assert.throws(() => validateDepositRule({ kind: 'tips', matchField: 'description', matchValue: 'Tips payment' }));
  assert.throws(() => validateDepositRule({ kind: 'invalid', accountId: 'bank-a', matchField: 'description', matchValue: 'Tips payment' }));
});
test('refunds reduce expenses; transfers and owner contributions never create income', () => {
  assert.deepEqual(depositPosting('tips', -25), { amount: 25, category: 'Tips', type: 'Tips Income' });
  assert.equal(depositPosting('refund', -25).type, 'expense_refund');
  assert.equal(depositPosting('transfer', -25), null);
  assert.equal(depositPosting('owner_contribution', -25), null);
});
