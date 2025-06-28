import React, { useState, useEffect } from 'react';
import '../../../App.css';

const STORAGE_KEY = 'hidden_intake-forms';

const IntakeSection = ({ intakeForms }) => {
const STORAGE_KEY = 'hidden_intake-forms';
const [hiddenIds, setHiddenIds] = useState(() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
});
  const [showHidden, setShowHidden] = useState(false);
  const [editingGig, setEditingGig] = useState(null);
  const [showGigEditor, setShowGigEditor] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    setHiddenIds(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hiddenIds));
  }, [hiddenIds]);


  const toggleShowHidden = () => setShowHidden(prev => !prev);
  const handleRemove = (id) => setHiddenIds(prev => [...new Set([...prev, id])]);
  const handleRestore = (id) => setHiddenIds(prev => prev.filter(hiddenId => hiddenId !== id));

  const formatTimeToAMPM = (timeStr) => {
    const [hour, minute] = timeStr.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 || 12;
    return `${formattedHour}:${minute} ${ampm}`;
  };

  const handleAddToGigs = async (form) => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const gigData = {
      client: form.full_name,
      event_type: form.event_type,
      date: form.event_date,
      time: form.event_time,
      duration: form.event_duration,
      location: form.event_location,
      position: "bartender",
      gender: form.preferred_gender || 'N/A',
      pay: 20,
      client_payment: 0,
      payment_method: 'N/A',
      needs_cert: form.bartending_license ? 1 : 0,
      confirmed: 1,
      staff_needed: form.guest_count > 50 ? 2 : 1,
      claimed_by: [],
      backup_needed: 1,
      backup_claimed_by: [],
      latitude: null,
      longitude: null,
      attire: form.staff_attire,
      indoor: form.indoors ? 1 : 0,
      approval_needed: form.nda_required ? 1 : 0,
      on_site_parking: form.on_site_parking ? 1 : 0,
      local_parking: form.local_parking || 'N/A',
      NDA: form.nda_required ? 1 : 0,
      establishment: form.home_or_venue || 'home',
    };

    try {
      const response = await fetch(`${apiUrl}/gigs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gigData),
      });
      if (response.ok) {
        alert('Gig added successfully!');
      } else {
        const errorMessage = await response.text();
        alert(`Failed to add gig: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Error adding gig:', error);
      alert('Error adding gig. Please try again.');
    }
  };

  const handleCreateQuote = (form) => {
    const preQuote = {
      clientName: form.full_name,
      clientEmail: form.email,
      clientPhone: form.phone,
      quoteNumber: `Q-${Date.now()}`,
      quoteDate: new Date().toLocaleDateString(),
      eventDate: form.event_date ? new Date(form.event_date).toISOString().split('T')[0] : '',
      eventTime: form.event_time ? formatTimeToAMPM(form.event_time) : '',
      location: form.event_location || '',
      items: [{
        name: form.event_type,
        quantity: 1,
        unitPrice: '',
        description: `Event Duration: ${form.event_duration || 'N/A'} | Insurance: ${form.insurance || 'N/A'} | Budget: ${form.budget || 'N/A'}${form.addons ? ` | Add-ons: ${Array.isArray(form.addons) ? form.addons.join(', ') : form.addons}` : ''}`
      }]
    };

    sessionStorage.setItem('preQuote', JSON.stringify(preQuote));
    window.open('/admin/quotes', '_blank');
  };

  const visibleForms = intakeForms.filter(form => showHidden || !hiddenIds.includes(form.id));

  return (
    <div className="table-scroll-container">
      <h2>General Intake Forms</h2>
      <button onClick={toggleShowHidden} style={{ margin: '10px 0', padding: '5px 10px' }}>
        {showHidden ? 'Hide Removed' : 'Show Removed'}
      </button>

      {visibleForms.length > 0 ? (
        <table className="intake-forms-table">
          <thead>
            <tr>
              {['Full Name','Email','Phone','Date','Time','Event Type','Guest Count','Location','Staff Attire','Budget','Add-ons','Created At','Actions'].map(header => <th key={header}>{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {visibleForms.map((form) => (
              <tr key={form.id} style={hiddenIds.includes(form.id) ? { opacity: 0.5 } : {}}>
                <td>{form.full_name}</td>
                <td>{form.email}</td>
                <td>{form.phone}</td>
                <td>{new Date(form.event_date).toLocaleDateString()}</td>
                <td>{form.event_time ? formatTimeToAMPM(form.event_time) : ''}</td>
                <td>{form.event_type}</td>
                <td>{form.guest_count || 'N/A'}</td>
                <td>{form.event_location || 'N/A'}</td>
                <td>{form.staff_attire || 'N/A'}</td>
                <td>{form.budget || 'N/A'}</td>
                <td>{form.addons || 'None'}</td>
                <td>{new Date(form.created_at).toLocaleString()}</td>
                <td>
                  {!hiddenIds.includes(form.id) ? (
                    <>
                      <button onClick={() => handleAddToGigs(form)} style={{ marginRight: '5px' }}>Add to Gigs</button>
                      <button onClick={() => handleCreateQuote(form)} style={{ marginRight: '5px' }}>Quote</button>
                      <button
                        onClick={() => handleRemove(form.id)}
                        style={{ backgroundColor: '#8B0000', color: 'white', padding: '5px 10px', border: 'none' }}
                      >
                        Remove
                      </button>
                    </>
                  ) : showHidden && (
                    <button
                      onClick={() => handleRestore(form.id)}
                      style={{ backgroundColor: 'green', color: 'white', padding: '5px 10px', border: 'none' }}
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
        <p>No intake forms submitted yet.</p>
      )}
    </div>
  );
};

export default IntakeSection;