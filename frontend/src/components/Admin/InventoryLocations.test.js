import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Inventory from './Inventory';
import { StockTransfer } from './InventoryLocations';

jest.mock('quagga', () => ({ init: jest.fn(), start: jest.fn(), stop: jest.fn(), onDetected: jest.fn() }));
const item = { id: 1, item_name: 'Test Tequila', barcode: 'bottle-1', item_type: 'product', tracking_type: 'consumable',
  quantity: 12, total_quantity: 12, location_quantities: { ready_bar: 7, ace: 2, charlene: 3 }, location_available: { ready_bar: 7, ace: 2, charlene: 3 } };
const ok = (value) => ({ ok: true, json: async () => value });
beforeEach(() => {
  global.fetch = jest.fn(async (url) => ok(url.endsWith('/inventory') ? [item] : []));
  jest.spyOn(window, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

test('inventory shows total and three locations, and edits only the selected location', async () => {
  render(<Inventory />);
  await screen.findByText('Test Tequila');
  expect(screen.getByRole('columnheader', { name: 'Charlene' })).toBeVisible();
  expect(screen.getByRole('columnheader', { name: 'Ace' })).toBeVisible();
  expect(screen.getByRole('columnheader', { name: 'Ready Bar' })).toBeVisible();
  fireEvent.change(screen.getByLabelText('Stock location'), { target: { value: 'ace' } });
  expect(screen.getByRole('columnheader', { name: 'Ace quantity' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Inventory actions' }));
  fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));
  const row = screen.getAllByRole('row').find((candidate) => within(candidate).queryByDisplayValue('Test Tequila'));
  const quantity = within(row).getAllByRole('spinbutton').find((input) => input.name === 'quantity');
  expect(quantity.value).toBe('2');
  fireEvent.change(quantity, { target: { value: '5' } });
  fetch.mockImplementation(async (url, options) => ok(options?.method === 'PUT' ? item : url.endsWith('/inventory') ? [item] : []));
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(fetch.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(true));
  const request = fetch.mock.calls.find(([, options]) => options?.method === 'PUT');
  expect(JSON.parse(request[1].body)).toMatchObject({ location_id: 'ace', quantity: 5 });
});

test('transfer chooses source and destination and sends one transfer without changing the product', async () => {
  const saved = jest.fn(); const close = jest.fn();
  render(<StockTransfer item={item} initialLocation="ready_bar" apiUrl="/test" onSaved={saved} onClose={close} />);
  fireEvent.change(screen.getByLabelText('To'), { target: { value: 'ace' } });
  fireEvent.change(screen.getByLabelText('Transfer quantity'), { target: { value: '3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Transfer Stock' }));
  await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ inventory_id: 1, from_location: 'ready_bar', to_location: 'ace', quantity: 3 });
  expect(close).toHaveBeenCalledTimes(1);
});

test('transfer prevents same-location and excessive quantities, and keeps server errors visible', async () => {
  render(<StockTransfer item={item} initialLocation="ace" apiUrl="/test" onSaved={jest.fn()} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('To'), { target: { value: 'ace' } });
  expect(screen.getByRole('button', { name: 'Transfer Stock' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('To'), { target: { value: 'charlene' } });
  fireEvent.change(screen.getByLabelText('Transfer quantity'), { target: { value: '3' } });
  expect(screen.getByRole('button', { name: 'Transfer Stock' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Transfer quantity'), { target: { value: '1' } });
  fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Stock changed. Refresh and try again.' }) });
  fireEvent.click(screen.getByRole('button', { name: 'Transfer Stock' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Stock changed');
});
