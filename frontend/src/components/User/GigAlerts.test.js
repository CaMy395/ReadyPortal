import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GigAlerts from './GigAlerts';
import { isIPhoneBrowser, isInstalled, pushSupported } from '../../visitorNotifications';
import { disableGigPush, gigPushRequest, registerGigWorker } from '../../gigNotifications';
jest.mock('../../visitorNotifications', () => ({ applicationKey: () => new Uint8Array([1,2,3]), isIPhoneBrowser: jest.fn(), isInstalled: jest.fn(), pushSupported: jest.fn() }));
jest.mock('../../gigNotifications', () => ({ disableGigPush: jest.fn(), gigPushRequest: jest.fn(), registerGigWorker: jest.fn() }));
const subscription = { endpoint: 'https://fcm.googleapis.com/test', toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/test' }) };
let registration;
beforeEach(() => {
  jest.clearAllMocks();
  pushSupported.mockReturnValue(true); isIPhoneBrowser.mockReturnValue(false); isInstalled.mockReturnValue(true);
  registration = { pushManager: { getSubscription: jest.fn().mockResolvedValue(null), subscribe: jest.fn().mockResolvedValue(subscription) } };
  registerGigWorker.mockResolvedValue(registration);
  gigPushRequest.mockImplementation(async path => path === '/config' ? { publicKey: 'public' } : { enabled: true });
  disableGigPush.mockResolvedValue();
  Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'default', requestPermission: jest.fn().mockResolvedValue('granted') } });
});
test('staff explicitly enables alerts, sends a test and disables only gig notifications', async () => {
  render(<GigAlerts />);
  const enable = await screen.findByRole('button', { name: 'Enable gig notifications' });
  await waitFor(() => expect(enable).not.toBeDisabled());
  expect(Notification.requestPermission).not.toHaveBeenCalled();
  fireEvent.click(enable);
  expect(await screen.findByText('On for this device')).toBeTruthy();
  expect(gigPushRequest).toHaveBeenCalledWith('/subscription', { subscription: subscription.toJSON() });
  registration.pushManager.getSubscription.mockResolvedValue(subscription);
  fireEvent.click(screen.getByRole('button', { name: 'Send test notification' }));
  expect(await screen.findByText(/Test sent/)).toBeTruthy();
  expect(gigPushRequest).toHaveBeenCalledWith('/test', { endpoint: subscription.endpoint });
  fireEvent.click(screen.getByRole('button', { name: 'Turn off gig alerts' }));
  expect(await screen.findByText('Off for this device')).toBeTruthy();
  expect(disableGigPush).toHaveBeenCalledTimes(1);
});
test('denied phone permission never creates a subscription', async () => {
  Notification.requestPermission.mockResolvedValue('denied');
  render(<GigAlerts />);
  const enable = await screen.findByRole('button', { name: 'Enable gig notifications' });
  await waitFor(() => expect(enable).not.toBeDisabled());
  fireEvent.click(enable);
  expect(await screen.findByText(/Allow notifications/)).toBeTruthy();
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
});
test('a device subscription owned by another account does not enable alerts automatically', async () => {
  registration.pushManager.getSubscription.mockResolvedValue(subscription);
  Notification.permission = 'granted';
  gigPushRequest.mockImplementation(async path => path === '/config' ? { publicKey: 'public' } : { enabled: false });
  render(<GigAlerts />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Enable gig notifications' })).not.toBeDisabled());
  expect(screen.getByText('Off for this device')).toBeTruthy();
  expect(gigPushRequest.mock.calls.some(([path]) => path === '/subscription')).toBe(false);
});
test('existing alerts refresh for the same signed-in account without requesting permission', async () => {
  registration.pushManager.getSubscription.mockResolvedValue(subscription);
  Notification.permission = 'granted';
  render(<GigAlerts />);
  expect(await screen.findByText('On for this device')).toBeTruthy();
  expect(gigPushRequest).toHaveBeenCalledWith('/subscription', { subscription: subscription.toJSON() });
  expect(Notification.requestPermission).not.toHaveBeenCalled();
});
test('iPhone shows Home Screen instructions before allowing setup', () => {
  isIPhoneBrowser.mockReturnValue(true); isInstalled.mockReturnValue(false);
  render(<GigAlerts />);
  expect(screen.getByText(/Share → Add to Home Screen/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Enable gig notifications' })).toBeNull();
  expect(registerGigWorker).not.toHaveBeenCalled();
});
