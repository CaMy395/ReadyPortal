import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProfileTabs from './ProfileTabs';
import { gigPushRequest } from '../gigNotifications';
jest.mock('../gigNotifications', () => ({ gigPushRequest: jest.fn() }));
jest.mock('./User/GigAlerts', () => () => <p>Device push controls</p>);
jest.mock('./Admin/VisitorAlerts', () => () => <p>Visitor push controls</p>);
const preferences = { new_gigs: true, gig_reminders: true, clock_in_reminders: true };
beforeEach(() => {
  jest.clearAllMocks();
  gigPushRequest.mockImplementation(async (path, body) => body || preferences);
});
test('settings live in their own tab and save notification choices across devices', async () => {
  render(<ProfileTabs role="user"><p>Personal details</p></ProfileTabs>);
  expect(gigPushRequest).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));
  const checkbox = await screen.findByRole('checkbox', { name: /Upcoming claimed gigs/ });
  fireEvent.click(checkbox);
  await waitFor(() => expect(checkbox).not.toBeChecked());
  expect(gigPushRequest).toHaveBeenCalledWith('/preferences', { ...preferences, gig_reminders: false }, 'PUT');
  expect(screen.queryByText('Visitor push controls')).toBeNull();
});
test('failed saves preserve the previous choice and admin settings include visitor alerts', async () => {
  render(<ProfileTabs role="admin"><p>Admin profile</p></ProfileTabs>);
  fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));
  const checkbox = await screen.findByRole('checkbox', { name: /Clock-in reminders/ });
  gigPushRequest.mockRejectedValueOnce(new Error('Please try again'));
  fireEvent.click(checkbox);
  expect(await screen.findByRole('status')).toHaveTextContent('Please try again');
  expect(checkbox).toBeChecked();
  expect(screen.getByText('Visitor push controls')).toBeTruthy();
});
