import React, { useState, useEffect } from 'react';

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
              <th>Apron Scripts</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleForms.map((form) => (
              <tr key={form.id} style={hiddenIds.includes(form.id) ? { opacity: 0.5 } : {}}>
                <td>{form.full_name}</td>
                <td>{form.email}</td>
                <td>{form.phone}</td>
                <td>{form.guest_count}</td>
                <td>{form.addons || 'None'}</td>
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
            ))}
          </tbody>
        </table>
      ) : (
        <p>No Crafts & Cocktails forms submitted yet.</p>
      )}
    </div>
  );
};

export default CraftsCocktailsSection;
