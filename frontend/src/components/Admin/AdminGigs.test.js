import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import AdminGigs from './AdminGigs';

test('submitting the gig form twice while the first request is pending creates one gig', async () => {
  const originalFetch = global.fetch;
  const originalAlert = window.alert;
  window.alert = jest.fn();
  let finishCreate;
  global.fetch = jest.fn((url) => url.endsWith('/users')
    ? Promise.resolve({ ok: true, json: async () => [] })
    : new Promise((resolve) => { finishCreate = resolve; }));

  try {
    const { container } = render(<AdminGigs />);
    const form = container.querySelector('form');
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(global.fetch.mock.calls.filter(([url]) => url.endsWith('/gigs'))).toHaveLength(1);
    await act(async () => {
      finishCreate({ ok: false, status: 500, text: async () => 'Test request stopped' });
    });
  } finally {
    global.fetch = originalFetch;
    window.alert = originalAlert;
  }
});
