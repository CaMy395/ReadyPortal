import React, { useState, useEffect } from 'react';

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

  const visibleForms = mixNSip.filter(form => showHidden || !hiddenIds.includes(form.id));

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
                  <td>{guestContacts(form)}</td>
                  <td>{money(form.booking_total) || detail(form, 'Order Total')}</td>
                  <td>{money(form.booking_paid) || detail(form, 'Due at Checkout')}</td>
                  <td>{money(form.booking_remaining) || detail(form, 'Expected Remaining Balance')}</td>
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
