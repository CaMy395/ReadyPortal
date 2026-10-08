import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Register from './Register';

beforeEach(() => {
  sessionStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ message: 'Uploaded' }) });
});

afterEach(() => jest.restoreAllMocks());

test('opens the handbook before uploads and unlocks agreement only after all documents succeed', async () => {
  render(<MemoryRouter><Register /></MemoryRouter>);
  const agreement = screen.getByRole('checkbox');
  expect(agreement.disabled).toBe(true);
  fireEvent.click(screen.getAllByRole('button', { name: 'Read Handbook & Upload Documents' })[1]);
  const dialog = screen.getByRole('dialog', { name: 'Staff Handbook & Registration Terms' });
  expect(dialog.parentElement).toBe(document.body);
  const inputs = dialog.querySelectorAll('input[type="file"]');
  for (let index = 0; index < inputs.length; index++) {
    fireEvent.change(inputs[index], { target: { files: [new File(['test'], 'document.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(index + 1));
    await waitFor(() => expect(sessionStorage.getItem(['registrationIdUploaded', 'registrationW9Uploaded', 'registrationSsUploaded'][index])).toBe('true'));
    expect(agreement.disabled).toBe(index < 2);
  }
  expect(global.fetch.mock.calls.map(([url]) => url.split('/').pop())).toEqual(['upload-id', 'upload-w9', 'upload-ss']);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  fireEvent.click(screen.getByRole('button', { name: 'Read Handbook & Upload Documents' }));
  expect(screen.getByText('ID: ✓ Complete')).toBeTruthy();
  expect(screen.getByText('W-9: ✓ Complete')).toBeTruthy();
  expect(screen.getByText('SS Card: ✓ Complete')).toBeTruthy();
});

test('the handbook link opens while the agreement checkbox is disabled', () => {
  render(<MemoryRouter><Register /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Got it!' }));
  fireEvent.click(screen.getByRole('link', { name: 'Staff Handbook & Registration Terms' }));
  expect(screen.getByRole('dialog')).toBeTruthy();
  expect(screen.getByRole('checkbox').disabled).toBe(true);
});
