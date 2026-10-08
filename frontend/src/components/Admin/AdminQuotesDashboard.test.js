import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminQuotesDashboard from './AdminQuotesDashboard';
import { format } from 'date-fns';

const quote = { event_date: format(new Date(), 'yyyy-MM-dd'), id: 17, client_name: 'New client', quote_number: 'Q-17', total_amount: '500', amount_paid: '0', status: 'Pending' };
const ok = (data) => ({ ok: true, json: async () => data });
beforeEach(() => {
  global.fetch = jest.fn(async (url) => ok(url.endsWith('/api/quotes') ? [quote] : []));
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());
test('appointment payment uses its own endpoint and refreshes the settled balance', async () => {
  let paid = false;
  fetch.mockImplementation(async (url, options) => {
    if (options?.method === 'POST') { paid = true; return ok({}); }
    return ok(url.endsWith('/api/quotes') ? [] : [{ id: 17, client_name: 'Booking client', title: 'Class booking', total_amount: 200, amount_paid: paid ? 200 : 50, balance_due: paid ? 0 : 150 }]);
  });
  render(<MemoryRouter><AdminQuotesDashboard /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Balance filter'), { target: { value: 'all' } });
  fireEvent.click(await screen.findByRole('button', { name: /Booking client/ }));
  const row = screen.getByRole('row', { name: /Class booking/ });
  fireEvent.change(within(row).getByRole('spinbutton'), { target: { value: '150' } });
  fireEvent.click(within(row).getByRole('button', { name: 'Add payment' }));
  await waitFor(() => expect(within(screen.getByRole('row', { name: /Class booking/ })).getByRole('checkbox').checked).toBe(true));
  const writes = fetch.mock.calls.filter(([, options]) => options?.method);
  expect(writes).toHaveLength(1);
  expect(writes[0][0]).toContain('/api/client-appointment-balances/17/payments');
  expect(JSON.parse(writes[0][1].body).amount).toBe(150);
});
async function openQuote() {
  render(<MemoryRouter><AdminQuotesDashboard /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Balance filter'), { target: { value: 'all' } });
  fireEvent.click(await screen.findByRole('button', { name: /New client/ }));
  return screen.getByRole('row', { name: /Q-17/ });
}
test.each([['0', '$500.00', false], ['125', '$375.00', false], ['500', '$0.00', true]])('ledger payment %s determines balance and paid checkbox', async (amount, balance, paid) => {
  fetch.mockImplementation(async (url) => ok(url.endsWith('/api/quotes') ? [{ ...quote, amount_paid: amount }] : []));
  const row = await openQuote();
  expect(within(row).getByText(balance)).toBeTruthy();
  expect(within(row).getByRole('checkbox').checked).toBe(paid);
});
test('status save does not mark paid or create a payment', async () => {
  const row = await openQuote();
  fireEvent.change(within(row).getByRole('combobox'), { target: { value: 'Accepted' } });
  fireEvent.click(within(row).getByRole('button', { name: /Actions for/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Update' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(5));
  const writes = fetch.mock.calls.filter(([, options]) => options?.method);
  expect(writes).toHaveLength(1);
  expect(JSON.parse(writes[0][1].body)).toEqual({ status: 'Accepted' });
});
test('failed status save reports server error without submitting payment', async () => {
  const row = await openQuote();
  fetch.mockImplementation(async () => ({ ok: false, json: async () => ({ error: 'Status unavailable' }) }));
  fireEvent.change(within(row).getByRole('spinbutton'), { target: { value: '100' } });
  fireEvent.click(within(row).getByRole('button', { name: /Actions for/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Update' }));
  await waitFor(() => expect(window.alert).toHaveBeenCalledWith('Failed to update quote: Status unavailable'));
  expect(fetch.mock.calls.some(([, options]) => options?.method === 'POST')).toBe(false);
});
test('payment follows status save without a stale status patch afterward', async () => {
  const row = await openQuote();
  fireEvent.change(within(row).getByRole('spinbutton'), { target: { value: '500' } });
  fireEvent.click(within(row).getByRole('button', { name: /Actions for/ }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Update' }));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(6));
  const writes = fetch.mock.calls.filter(([, options]) => options?.method);
  expect(writes.map(([, options]) => options.method)).toEqual(['PATCH', 'POST']);
  expect(JSON.parse(writes[1][1].body).amount).toBe(500);
});



test.each([
  [{ paid_in_full: true, amount_paid: 0, deposit_amount: 100, payments: [] }, '$0.00', true],
  [{ paid_in_full: false, amount_paid: 0, deposit_amount: 125, payments: [] }, '$375.00', false],
  [{ paid_in_full: false, amount_paid: 150, deposit_amount: 125, payments: [{ amount: 150 }] }, '$350.00', false],
  [{ paid_in_full: false, amount_paid: 0, deposit_amount: 125, payments: [{ amount: 125 }, { amount: -125 }] }, '$500.00', false],
])('respects legacy settlement without double-counting ledger payments: %j', async (fields, balance, paid) => {
  fetch.mockImplementation(async url => ok(url.endsWith('/api/quotes') ? [{ ...quote, ...fields }] : []));
  const row = await openQuote();
  expect(within(row).getByText(balance)).toBeTruthy();
  expect(within(row).getByRole('checkbox').checked).toBe(paid);
});

test('paid legacy clients stay in history but not outstanding; age never hides real debt', async () => {
  fetch.mockImplementation(async url => ok(url.endsWith('/api/quotes') ? [
    { ...quote },
    { ...quote, id: 18, client_name: 'Chanel', total_amount: 250, event_date: '2025-01-01', paid_in_full: true, payments: [] },
    { ...quote, id: 19, client_name: 'Tracy', total_amount: 125, event_date: '2025-01-01', paid_in_full: true, payments: [] },
    { ...quote, id: 20, client_name: 'Actual old debt', total_amount: 50, event_date: '2025-01-01', paid_in_full: false },
  ] : [{ id: 22, client_name: 'Booking', event_date: quote.event_date, total_amount: 400, amount_paid: 100, balance_due: 75 }]));
  render(<MemoryRouter><AdminQuotesDashboard /></MemoryRouter>);
  await screen.findByRole('button', { name: /New client/ });
  expect(screen.getByLabelText('Balance filter').value).toBe('outstanding');
  expect(screen.queryByRole('button', { name: /Chanel|Tracy/ })).toBeNull();
  expect(screen.getByRole('button', { name: /Actual old debt/ })).toBeTruthy();
  expect(screen.getByText('$625.00')).toBeTruthy();
  expect(screen.getByRole('link', { name: /Create quote/i }).getAttribute('href')).toBe('/admin/quotes');
  fireEvent.change(screen.getByLabelText('Balance filter'), { target: { value: 'all' } });
  expect(screen.getByRole('button', { name: /Chanel/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Tracy/ })).toBeTruthy();
});
