import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VisitorAlerts from './VisitorAlerts';
import { disableVisitorPush, isIPhoneBrowser, isInstalled, pushRequest, pushSupported, registerPushWorker } from '../../visitorNotifications';

jest.mock('../../visitorNotifications', () => ({
  applicationKey: () => new Uint8Array([1,2,3]), disableVisitorPush: jest.fn(),
  isIPhoneBrowser: jest.fn(), isInstalled: jest.fn(), pushRequest: jest.fn(),
  pushSupported: jest.fn(), registerPushWorker: jest.fn(),
}));
let registration;
const renderAlerts = () => render(<MemoryRouter><VisitorAlerts /></MemoryRouter>);
const subscription = { endpoint: 'https://fcm.googleapis.com/test', toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/test' }) };
beforeEach(() => {
  jest.clearAllMocks();
  pushSupported.mockReturnValue(true); isIPhoneBrowser.mockReturnValue(false); isInstalled.mockReturnValue(true);
  registration = { pushManager: { getSubscription: jest.fn().mockResolvedValue(null), subscribe: jest.fn().mockResolvedValue(subscription) } };
  registerPushWorker.mockResolvedValue(registration);
  pushRequest.mockResolvedValue({ publicKey: 'public' });
  disableVisitorPush.mockResolvedValue();
  Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'default', requestPermission: jest.fn().mockResolvedValue('granted') } });
});
test('only requests phone permission after an admin taps enable, then persists subscription and sends a test', async () => {
  renderAlerts();
  const enable = await screen.findByRole('button', { name: 'Enable visitor notifications' });
  await waitFor(() => expect(enable).not.toBeDisabled());
  expect(Notification.requestPermission).not.toHaveBeenCalled();
  fireEvent.click(enable);
  expect(await screen.findByText('On for this device')).toBeTruthy();
  expect(Notification.requestPermission).toHaveBeenCalledTimes(1);
  expect(pushRequest).toHaveBeenCalledWith('/subscription', { subscription: subscription.toJSON() });
  registration.pushManager.getSubscription.mockResolvedValue(subscription);
  fireEvent.click(screen.getByRole('button', { name: 'Send test notification' }));
  expect(await screen.findByText(/Test sent/)).toBeTruthy();
  expect(pushRequest).toHaveBeenCalledWith('/test', { endpoint: subscription.endpoint });
  fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));
  expect(await screen.findByText('Off for this device')).toBeTruthy();
  expect(disableVisitorPush).toHaveBeenCalledTimes(1);
});
test('denied permission never creates a subscription', async () => {
  Notification.requestPermission.mockResolvedValue('denied');
  renderAlerts();
  const enable = await screen.findByRole('button', { name: 'Enable visitor notifications' });
  await waitFor(() => expect(enable).not.toBeDisabled());
  fireEvent.click(enable);
  expect(await screen.findByText(/Allow notifications in your phone/)).toBeTruthy();
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  expect(screen.getByText('Off for this device')).toBeTruthy();
});
test('an existing phone subscription is rebound to the current signed-in admin', async () => {
  registration.pushManager.getSubscription.mockResolvedValue(subscription);
  Notification.permission = 'granted';
  renderAlerts();
  expect(await screen.findByText('On for this device')).toBeTruthy();
  expect(pushRequest).toHaveBeenCalledWith('/subscription', { subscription: subscription.toJSON() });
  expect(Notification.requestPermission).not.toHaveBeenCalled();
});
test('iPhone Safari explains Home Screen setup before enabling', () => {
  isIPhoneBrowser.mockReturnValue(true); isInstalled.mockReturnValue(false);
  renderAlerts();
  expect(screen.getByText(/Share → Add to Home Screen/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Enable visitor notifications' })).toBeNull();
  expect(registerPushWorker).not.toHaveBeenCalled();
});
