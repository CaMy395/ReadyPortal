import React, { useState, useEffect } from 'react';
import { requestedAppointment } from './requestedAppointment';

const READY_BAR_ADDRESS = "1030 NW 200th Terrace, Miami, FL 33169";

const MixNsipSection = ({ mixNSip }) => {
  const STORAGE_KEY = 'hidden_mix-n-sip';

  const [hiddenIds, setHiddenIds] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenIds));
  }, [hiddenIds]);

  const [showHidden, setShowHidden] = useState(false);

  const toggleShowHidden = () => setShowHidden(prev => !prev);

  const handleRemove = (id) => {
    setHiddenIds(prev => [...new Set([...prev, id])]);
  };

  const handleRestore = (id) => {
    setHiddenIds(prev => prev.filter(hiddenId => hiddenId !== id));
  };

  // ✅ Extract Location + Address from additional_comments
  const parseLocationFromComments = (comments = "") => {
    const text = (comments || "").toString();
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    let location = "";
    let address = "";

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (!location && (lower.startsWith("location preference:") || lower.startsWith("location:"))) {
        location = line.split(":").slice(1).join(":").trim();
      }

      if (!address && lower.startsWith("address:")) {
        address = line.split(":").slice(1).join(":").trim();
      }
    }

    // Auto-fill Ready Bar address for home events
    if (!address && location.toLowerCase().includes("home")) {
      address = READY_BAR_ADDRESS;
    }

    return { location, address };
  };

  // Collapse rapid identical legacy submissions without deleting inquiry records.
  const uniqueForms = mixNSip.filter((form, index, forms) => !forms.slice(0, index).some(other =>
    other.email === form.email && other.full_name === form.full_name && other.phone === form.phone &&
    other.guest_count === form.guest_count && other.session_mode === form.session_mode &&
    other.additional_comments === form.additional_comments &&
    JSON.stringify(other.addons) === JSON.stringify(form.addons) &&
    JSON.stringify(other.apron_texts) === JSON.stringify(form.apron_texts) &&
    Math.abs(new Date(other.created_at) - new Date(form.created_at)) < 10 * 60 * 1000));
  const visibleForms = uniqueForms.filter(form => showHidden || !hiddenIds.includes(form.id));

  const detail = (form, label) => {
    const line = String(form.additional_comments || '').split(/\r?\n/)
      .find((value) => value.toLowerCase().startsWith(`${label.toLowerCase()}:`));
    return line ? line.split(':').slice(1).join(':').trim() : 'N/A';
  };

  const guestContacts = (form) => String(form.additional_comments || '').split(/\r?\n/)
    .filter((value) => /^Guest \d+:/i.test(value)).join(' • ') || 'None';

  const money = (value) => {
    if (value === null || value === undefined || value === '') return null;
    return `$${Number(value).toFixed(2)}`;
  };

  return (
    <div className="table-scroll-container">
      <h2>Mix N' Sip Forms</h2>

      <button
        onClick={toggleShowHidden}
        style={{ margin: '10px 0', padding: '5px 10px' }}
      >
        {showHidden ? 'Hide Removed' : 'Show Hidden'}
      </button>

      {visibleForms.length > 0 ? (
        <table className="intake-forms-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Guest Count</th>
              <th>Requested Day / Date / Time</th>
              <th>Booking Status</th>
              <th>Guest Contacts</th>
              <th>Order Total</th>
              <th>Paid</th>
              <th>Remaining Balance</th>
              <th>Add-ons</th>
              <th>Location</th>
              <th>Address</th>
              <th>Apron Scripts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleForms.map((form) => {
              const { location, address } = parseLocationFromComments(form.additional_comments);

              return (
                <tr key={form.id} style={hiddenIds.includes(form.id) ? { opacity: 0.5 } : {}}>
                  <td>{form.full_name}</td>
                  <td>{form.email}</td>
                  <td>{form.phone}</td>
                  <td>{form.guest_count}</td>
                  <td>{requestedAppointment(detail(form, 'Preferred Date'), detail(form, 'Preferred Time'))}</td>
                  <td>{form.booking_date ? 'Scheduled: ' + requestedAppointment(form.booking_date, form.booking_time) : detail(form, 'Booking Status') === 'N/A' ? 'Not scheduled' : detail(form, 'Booking Status')}</td>
                  <td>{guestContacts(form)}</td>
                  <td>{money(form.booking_total) || detail(form, 'Order Total')}</td>
                  <td>{money(form.booking_paid) || 'No payment recorded'}</td>
                  <td>{money(form.booking_remaining) || detail(form, 'Order Total')}</td>
                  <td>
                    {Array.isArray(form.addons)
                      ? (form.addons.length ? form.addons.join(', ') : 'None')
                      : (form.addons || 'None')}
                  </td>
                  <td>{location || 'None'}</td>
                  <td>{address || 'None'}</td>
                  <td>{Array.isArray(form.apron_texts) ? form.apron_texts.join(', ') : 'None'}</td>
                  <td>
                    {!hiddenIds.includes(form.id) ? (
                      <button
                        onClick={() => handleRemove(form.id)}
                        style={{
                          backgroundColor: '#8B0000',
                          color: 'white',
                          padding: '5px 10px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Remove
                      </button>
                    ) : showHidden && (
                      <button
                        onClick={() => handleRestore(form.id)}
                        style={{
                          backgroundColor: 'green',
                          color: 'white',
                          padding: '5px 10px',
                          border: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        Restore
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p>No Mix N Sip forms submitted yet.</p>
      )}
    </div>
  );
};

export default MixNsipSection;
