import React from 'react';
import { Link } from 'react-router-dom';
import { calendarPath } from '../../appointmentFlow';
export default function BookingSelection({slot,flow}) {
  return <div className="booking-selection" role="status">
    <strong>Selected appointment: {slot.date} · {slot.start_time}–{slot.end_time} Eastern</strong>
    <p>Complete your details, then continue to payment. This time is not reserved until your booking is confirmed.</p>
    <Link to={calendarPath(flow)}>Change date or time</Link>
  </div>;
}
