import React, { useState, useEffect } from 'react';

const READY_BAR_ADDRESS = "1030 NW 200th Terrace, Miami, FL 33169";

const CraftsCocktailsSection = ({ craftCocktails }) => {
  const STORAGE_KEY = 'hidden_crafts-cocktails';

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

    // If they chose home and didn't explicitly store address, fill it
    if (!address && location.toLowerCase().includes("home")) {
      address = READY_BAR_ADDRESS;
    }

    return { location, address };
  };

  const visibleForms = craftCocktails.filter(form => showHidden || !hiddenIds.includes(form.id));

  return (
    <div className="table-scroll-container">
      <h2>Crafts & Cocktails Forms</h2>
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
        <p>No Crafts & Cocktails forms submitted yet.</p>
      )}
    </div>
  );
};

export default CraftsCocktailsSection;
