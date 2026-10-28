import { bankTransactionDisplay, bankDate } from './bankTransactionDisplay';
test('card repayment on either account is labeled as a card payment, not income', () => {
  expect(bankTransactionDisplay({ name: 'Payment Thank You-Mobile', amount: -586.72, account_type: 'credit' })).toMatchObject({ label: 'Card payment', suggestedKind: 'transfer' });
  expect(bankTransactionDisplay({ name: 'Payment to Chase card ending in 6793 10/02', amount: 586.72 }).label).toBe('Card payment');
});
test('merchant credits remain uncertain until reviewed', () => {
  expect(bankTransactionDisplay({ name: 'Amazon', amount: -15.23, account_type: 'credit' }).label).toBe('Card credit — review');
  expect(bankTransactionDisplay({ name: 'Amazon', amount: 65.05, review_status: 'approved' }).label).toBe('Expense');
  expect(bankTransactionDisplay({ name: 'Amazon refund', amount: -15.23 }).suggestedKind).toBe('refund');
});
test('reviewed classifications override suggestions and dates preserve the bank day', () => {
  expect(bankTransactionDisplay({ name: 'Payment Thank You-Mobile', amount: -20, deposit_kind: 'refund' }).label).toBe('Refund received');
  expect(bankDate('2026-10-04T00:00:00.000Z')).toBe('2026-10-04');
});
