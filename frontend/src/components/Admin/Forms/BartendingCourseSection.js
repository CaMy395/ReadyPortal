import React, { useState, useEffect } from 'react';

const BartendingCourseSection = ({ bartendingCourse }) => {
  const STORAGE_KEY = 'hidden_bartending-course';

  const [hiddenIds, setHiddenIds] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenIds));
  }, [hiddenIds]);

  const [showHidden, setShowHidden] = useState(false);

  const toggleShowHidden = () => setShowHidden(prev => !prev);
  const handleRemove = (id) => setHiddenIds(prev => [...new Set([...prev, id])]);
  const handleRestore = (id) => setHiddenIds(prev => prev.filter(hiddenId => hiddenId !== id));

  const visibleForms = bartendingCourse.filter(form => showHidden || !hiddenIds.includes(form.id));

  return (
    <div className="table-scroll-container">
      <h2>Bartending Course Forms</h2>
      <button onClick={toggleShowHidden} style={{ margin: '10px 0', padding: '5px 10px' }}>
        {showHidden ? 'Hide Removed' : 'Show Hidden'}
      </button>

      {visibleForms.length > 0 ? (
        <table className="intake-forms-table">
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Is Adult</th>
              <th>Experience</th>
              <th>Course Schedule</th>
              <th>Payment Plan</th>
              <th>Referral</th>
              <th>Referral Details</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleForms.map(form => (
              <tr key={form.id} style={hiddenIds.includes(form.id) ? { opacity: 0.5 } : {}}>
                <td>{form.full_name}</td>
                <td>{form.email}</td>
                <td>{form.phone}</td>
                <td>{form.is_adult ? 'Yes' : 'No'}</td>
                <td>{form.experience ? 'Yes' : 'No'}</td>
                <td>{form.set_schedule}</td>
                <td>{form.payment_plan ? 'Yes' : 'No'}</td>
                <td>{form.referral || 'N/A'}</td>
                <td>{form.referral_details || 'None'}</td>
                <td>
                  {!hiddenIds.includes(form.id) ? (
                    <button
                      onClick={() => handleRemove(form.id)}
                      style={{ backgroundColor: '#8B0000', color: 'white', padding: '5px 10px', border: 'none' }}
                    >
                      Remove
                    </button>
                  ) : (
                    showHidden && (
                      <button
                        onClick={() => handleRestore(form.id)}
                        style={{ backgroundColor: 'green', color: 'white', padding: '5px 10px', border: 'none' }}
                      >
                        Restore
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No Bartending Course forms submitted yet.</p>
      )}
    </div>
  );
};

export default BartendingCourseSection;
