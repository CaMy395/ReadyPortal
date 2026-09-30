import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProfilePasswordForm from './ProfilePasswordForm';

beforeEach(() => { window.fetch = jest.fn(); });
function fill(next = 'new-password', confirm = next) {
  fireEvent.change(screen.getByLabelText('Current password', { exact: true }), { target: { value: 'old-password' } });
  fireEvent.change(screen.getByLabelText('New password', { exact: true }), { target: { value: next } });
  fireEvent.change(screen.getByLabelText('Confirm new password', { exact: true }), { target: { value: confirm } });
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
}
test('mismatched passwords never reach the server', () => {
  render(<ProfilePasswordForm userId={7} />);
  fill('new-password', 'different-password');
  expect(screen.getByRole('alert')).toHaveTextContent('do not match');
  expect(window.fetch).not.toHaveBeenCalled();
});
test('password change sends current and new passwords and clears fields on success', async () => {
  window.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  render(<ProfilePasswordForm userId={7} />); fill();
  expect(await screen.findByRole('status')).toHaveTextContent('Password changed');
  expect(window.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/users/7/password'), expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ currentPassword: 'old-password', newPassword: 'new-password' }) }));
  expect(screen.getByLabelText('Current password', { exact: true })).toHaveValue('');
  expect(screen.getByLabelText('New password', { exact: true })).toHaveValue('');
});
test('incorrect current password shows an actionable error', async () => {
  window.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Current password is incorrect.' }) });
  render(<ProfilePasswordForm userId={7} />); fill();
  expect(await screen.findByRole('alert')).toHaveTextContent('Current password is incorrect');
  expect(screen.getByRole('button', { name: 'Update password' })).toBeEnabled();
});
