jest.mock('axios', () => ({ interceptors: {
  request: { use: jest.fn() }, response: { use: jest.fn() },
} }));

const nativeFetch = jest.fn();
window.fetch = nativeFetch;
const { SESSION_EXPIRED_EVENT } = require('./apiSession');
const api = process.env.REACT_APP_API_URL || window.location.origin;
const expired = jest.fn();
window.addEventListener(SESSION_EXPIRED_EVENT, expired);

beforeEach(() => {
  localStorage.clear();
  nativeFetch.mockReset();
  expired.mockClear();
});

test('protected API rejection notifies the app for a legacy session without a token', async () => {
  nativeFetch.mockResolvedValue({ status: 401 });
  await window.fetch(`${api}/api/expenses`);
  expect(expired).toHaveBeenCalledTimes(1);
});

test('incorrect login and third-party failures do not expire the app session', async () => {
  nativeFetch.mockResolvedValue({ status: 401 });
  await window.fetch(`${api}/login`);
  await window.fetch('https://example.net/api/expenses');
  expect(expired).not.toHaveBeenCalled();
});

test('an old request cannot invalidate a newly established session', async () => {
  let finish;
  nativeFetch.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const pending = window.fetch(`${api}/api/expenses`);
  localStorage.setItem('internalAuthToken', 'new-session');
  finish({ status: 401 });
  await pending;
  expect(expired).not.toHaveBeenCalled();
});

test('server errors do not log the user out', async () => {
  nativeFetch.mockResolvedValue({ status: 500 });
  await window.fetch(`${api}/api/expenses`);
  expect(expired).not.toHaveBeenCalled();
});
