import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BankingMfa from './BankingMfa';

beforeEach(() => { sessionStorage.clear(); });
const respond = body => ({ ok: true, json: async () => body });
test('bank content is not mounted before verification and setup key is required', async () => {
  window.fetch = jest.fn().mockResolvedValue(respond({ configured: false, enabled: false, verified: false }));
  render(<BankingMfa><div>Private bank data</div></BankingMfa>);
  expect(await screen.findByText(/one-time server setup/)).toBeTruthy();
  expect(screen.queryByText('Private bank data')).toBeNull();
});
test('successful verification unlocks banking, and expiry hides it again', async () => {
  window.fetch = jest.fn().mockImplementation(async url => respond(url.endsWith('/status') ? { configured: true, enabled: true, verified: false } : { token: 'proof' }));
  render(<BankingMfa><div>Private bank data</div></BankingMfa>);
  fireEvent.change(await screen.findByLabelText('Authenticator code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
  expect(await screen.findByText('Private bank data')).toBeTruthy();
  expect(sessionStorage.getItem('readyBankingMfa')).toBe('proof');
  fireEvent(window, new Event('ready:banking-mfa-required'));
  await waitFor(() => expect(screen.queryByText('Private bank data')).toBeNull());
});
test('recovery codes must be acknowledged before banking is shown', async () => {
  window.fetch = jest.fn().mockImplementation(async url => respond(
    url.endsWith('/status') ? { configured: true, enabled: false, verified: false } :
    url.endsWith('/setup') ? { secret: 'SEED', qr: 'data:image/png;base64,' } :
    { token: 'proof', recoveryCodes: ['recovery-one', 'recovery-two'] }
  ));
  render(<BankingMfa><div>Private bank data</div></BankingMfa>);
  fireEvent.change(await screen.findByLabelText('Ready password'), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Set up authenticator' }));
  fireEvent.change(await screen.findByLabelText('Authenticator code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enable authenticator' }));
  expect(await screen.findByText('Save your recovery codes')).toBeTruthy();
  expect(screen.queryByText('Private bank data')).toBeNull();
  expect(screen.getByRole('button', { name: 'Continue to banking' })).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Continue to banking' }));
  expect(screen.getByText('Private bank data')).toBeTruthy();
});
