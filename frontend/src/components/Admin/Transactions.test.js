import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Transactions } from './Transactions';

beforeEach(() => {
  window.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
});

test('Plaid remains discoverable before any bank is linked', async () => {
  render(<Transactions />);
  expect(screen.getByRole('heading', { name: 'Plaid Bank Connections' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Connect bank with Plaid' })).toBeTruthy();
  expect(await screen.findByText('No bank is connected yet.')).toBeTruthy();
});

test('failed bank requests show a retry instead of claiming there are no connections', async () => {
  window.fetch.mockImplementation(async url => ({
    ok: !url.includes('/api/plaid/'), json: async () => [],
  }));
  jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<Transactions />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load connected bank data');
  expect(screen.queryByText('No bank is connected yet.')).toBeNull();
  window.fetch.mockResolvedValue({ ok: true, json: async () => [] });
  fireEvent.click(screen.getByRole('button', { name: 'Retry bank connections' }));
  await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  expect(await screen.findByText('No bank is connected yet.')).toBeTruthy();
  console.error.mockRestore();
});
