import React from 'react';

export const needsElegance = (form) => Number(form.guestCount) > 10 && form.sessionMode !== 'virtual' && form.locationPreference === 'home';

export default function VenueRequest({ formData, onChange }) {
  return <fieldset>
    <legend>Elegance Banquet Hall, Miramar — availability request</legend>
    <p>Groups of more than 10 guests are hosted at Elegance Banquet Hall in Miramar. Your requested date and time require venue confirmation. No payment is collected and no appointment is booked yet. We will contact you to confirm availability and arrange payment.</p>
    <label>Preferred date <input type="date" name="preferredDate" value={formData.preferredDate || ''} onChange={onChange} required /></label>
    <label>Preferred time (Eastern) <input type="time" name="preferredTime" value={formData.preferredTime || ''} onChange={onChange} required /></label>
  </fieldset>;
}
