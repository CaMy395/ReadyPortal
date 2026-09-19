import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminQuotesDashboard from './AdminQuotesDashboard';

const quote = { id: 17, client_name: 'New client', quote_number: 'Q-17', total_amount: '500', amount_paid: '0', status: 'Pending' };
const ok = (data) => ({ ok: true, json: async () => data });
beforeEach(() => {
  global.fetch = jest.fn(async (url) => ok(url.endsWith('/api/quotes') ? [quote] : []));
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());
async function openQuote() {
  render(<MemoryRouter><AdminQuotesDashboard /></MemoryRouter>);
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
