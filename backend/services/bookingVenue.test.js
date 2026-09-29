import test from 'node:test';
import assert from 'node:assert/strict';
import { requiresVenueConfirmation, normalizeBookingType } from './bookingVenue.js';

test('Ready Bar threshold is strictly more than ten, excluding virtual and client venues', () => {
  assert.equal(requiresVenueConfirmation({ guestCount: 10, locationPreference: 'home' }), false);
  assert.equal(requiresVenueConfirmation({ guestCount: 11, locationPreference: 'home' }), true);
  assert.equal(requiresVenueConfirmation({ guestCount: 11, locationPreference: 'home', sessionMode: 'virtual' }), false);
  assert.equal(requiresVenueConfirmation({ guestCount: 11, locationPreference: 'client' }), false);
  assert.equal(requiresVenueConfirmation({ guestCount: 11, eventAddress: '1030 NW 200th Terrace, Miami' }), true);
});

test('experience names resolve to the configured availability service', () => {
  for (const mode of ['Private', 'Group', 'Virtual']) {
    assert.equal(normalizeBookingType(`Mix N' Sip – ${mode} Experience`), "Mix N' Sip (2 hours, @ $75.00)");
  }
  assert.equal(normalizeBookingType('Crafts & Cocktails – Group Experience'), 'Crafts & Cocktails (2 hours, @ $85.00)');
  assert.equal(normalizeBookingType('Bartending Class (2 hours, @ $60.00)'), 'Bartending Class (2 hours, @ $60.00)');
});
