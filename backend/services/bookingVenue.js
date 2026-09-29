export const ELEGANCE_LOCATION = 'Elegance Banquet Hall, Miramar';

export function requiresVenueConfirmation(data = {}) {
  return Number(data.guestCount) > 10 && data.sessionMode !== 'virtual'
    && !/virtual/i.test(data.title || '')
    && (data.locationPreference === 'home' || /ready bar|1030 NW 200th/i.test(data.eventAddress || ''));
}

export function normalizeBookingType(title = '') {
  if (/^Mix N'? Sip.*(?:Private|Group|Virtual) Experience$/i.test(title)) return "Mix N' Sip (2 hours, @ $75.00)";
  if (/^Crafts & Cocktails.*(?:Private|Group) Experience$/i.test(title)) return 'Crafts & Cocktails (2 hours, @ $85.00)';
  return title;
}
