import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VenueRequest, { needsElegance } from './VenueRequest';
import MixNsipSection from '../Admin/Forms/MixNsipSection';

test('venue requests collect a preferred date and time and explain no payment or booking', () => {
  expect(needsElegance({ guestCount: 10, locationPreference: 'home' })).toBe(false);
  expect(needsElegance({ guestCount: 11, locationPreference: 'home' })).toBe(true);
  expect(needsElegance({ guestCount: 11, locationPreference: 'home', sessionMode: 'virtual' })).toBe(false);
  const change = jest.fn();
  render(<VenueRequest formData={{}} onChange={change} />);
  fireEvent.change(screen.getByLabelText('Preferred date'), { target: { value: '2026-10-01' } });
  expect(change).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/No payment is collected and no appointment is booked yet/)).toBeTruthy();
});

test('duplicate unpaid inquiries show once and do not report checkout amount as paid', () => {
  const form = { full_name: 'Example Client', email: 'example@test.invalid', guest_count: 4,
    additional_comments: 'Order Total: $300.00\nDue at Checkout: $300.00\nExpected Remaining Balance: $0.00',
    booking_paid: null, booking_remaining: null };
  render(<MixNsipSection mixNSip={[
    { ...form, id: 1, created_at: '2026-09-27T22:46:26Z' },
    { ...form, id: 2, created_at: '2026-09-27T22:46:27Z' }
  ]} />);
  expect(screen.getAllByText('Example Client')).toHaveLength(1);
  expect(screen.getByText('No payment recorded')).toBeTruthy();
  expect(screen.getByText('Not scheduled')).toBeTruthy();
  expect(screen.queryByText('$0.00')).toBeNull();
});
