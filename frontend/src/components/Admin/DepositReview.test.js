import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import DepositReview from './DepositReview';

const deposit = { transaction_id: 'd1', account_id: 'a1', amount: -40, name: 'Weekly tips', account_name: 'Checking', review_status: 'deposit_unmatched', suggested_kind: 'tips' };
test('review stays with the selected deposit and includes payment matching', async () => {
  render(<DepositReview transactions={[deposit, { ...deposit, transaction_id: 'd2', name: 'Other deposit' }]} onUpdated={jest.fn()} renderPaymentMatch={t => <button>Find payment for {t.name}</button>} />);
  fireEvent.click(screen.getAllByRole('button', { name: 'Review deposit' })[0]);
  const selected = screen.getByText('Weekly tips · $40.00').closest('article');
  expect(within(selected).getByLabelText('Deposit category')).toBeTruthy();
  expect(within(selected).getByRole('button', { name: 'Find payment for Weekly tips' })).toBeTruthy();
  expect(within(screen.getByText('Other deposit · $40.00').closest('article')).queryByLabelText('Deposit category')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByLabelText('Deposit category')).toBeNull();
  await waitFor(() => expect(window.fetch).toHaveBeenCalled());
});
beforeEach(() => {
  window.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
});

test('saving a confirmed category can create an account-scoped future rule', async () => {
  const updated = jest.fn();
  render(<DepositReview transactions={[deposit]} onUpdated={updated} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review deposit' }));
  fireEvent.click(screen.getByLabelText('Categorize matching deposits automatically'));
  fireEvent.click(screen.getByRole('button', { name: 'Save category' }));
  await waitFor(() => expect(updated).toHaveBeenCalled());
  const call = window.fetch.mock.calls.find(([, options]) => options.method === 'PATCH');
  expect(JSON.parse(call[1].body)).toMatchObject({ action: 'classify_deposit', kind: 'tips', saveRule: true, confirmUnmatched: false, rule: { matchField: 'description', matchValue: 'Weekly tips' } });
});

test('possible duplicate income requires explicit review before overriding', async () => {
  window.fetch.mockImplementation(async (_url, options) => options.method === 'PATCH'
    ? { ok: false, json: async () => ({ code: 'PAYMENT_MATCH_REVIEW', error: 'Review possible matches first.' }) }
    : { ok: true, json: async () => [] });
  render(<DepositReview transactions={[deposit]} onUpdated={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Review deposit' }));
  fireEvent.click(screen.getByRole('button', { name: 'Save category' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Review possible matches first.');
  expect(screen.getByRole('button', { name: 'Save category' })).toBeDisabled();
  fireEvent.click(screen.getByLabelText(/I checked the possible payment matches/));
  expect(screen.getByRole('button', { name: 'Save category' })).not.toBeDisabled();
});

test('pending, removed and already matched deposits cannot be classified from this panel', () => {
  render(<DepositReview transactions={[
    { ...deposit, pending: true }, { ...deposit, transaction_id: 'd2', removed: true },
    { ...deposit, transaction_id: 'd3', review_status: 'bank_reconciled' },
  ]} onUpdated={jest.fn()} />);
  expect(screen.queryByRole('button', { name: 'Review deposit' })).toBeNull();
});
