import { disableGigPush, gigWorkerScope } from './gigNotifications';

let subscription, registration;
beforeEach(() => {
  localStorage.setItem('internalAuthToken', 'signed-session');
  subscription = { endpoint: 'https://fcm.googleapis.com/test', unsubscribe: jest.fn().mockResolvedValue(true) };
  registration = { pushManager: { getSubscription: jest.fn().mockResolvedValue(subscription) }, getNotifications: jest.fn().mockResolvedValue([]) };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: jest.fn().mockResolvedValue(registration) } });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ enabled: false }) });
});
afterEach(() => localStorage.clear());
test('turning off staff alerts removes only its separate registration subscription', async () => {
  await disableGigPush();
  expect(navigator.serviceWorker.getRegistration).toHaveBeenCalledWith(gigWorkerScope);
  expect(gigWorkerScope).not.toBe('/');
  expect(fetch.mock.calls[0][0]).toContain('/api/gig-push/subscription');
  expect(fetch.mock.calls[0][1].method).toBe('DELETE');
  expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
});
test('logout captures the signed token before App clears storage and unsubscribes the device', async () => {
  const cleanup = disableGigPush({ logout: true });
  localStorage.removeItem('internalAuthToken');
  await cleanup;
  expect(fetch.mock.calls[0][0]).toContain('/api/gig-push/logout');
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer signed-session');
  expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
});
