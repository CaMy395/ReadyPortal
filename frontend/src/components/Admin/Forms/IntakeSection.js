import React, { useState, useEffect } from 'react';
import '../../../App.css';
import { useNavigate } from 'react-router-dom'; // Add this at the top


const STORAGE_KEY = 'hidden_intake-forms';

const IntakeSection = ({ intakeForms }) => {
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

  const handleSubmitGig = async () => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    const gigData = {
      client: editingGig.full_name,
      event_type: editingGig.event_type,
      date: editingGig.event_date,
      time: editingGig.event_time,
      duration: editingGig.event_duration,
      location: editingGig.event_location,
      position: editingGig.position || 'bartender',
      gender: editingGig.preferred_gender || 'N/A',
      pay: editingGig.pay || 20,
      needs_cert: editingGig.bartending_license ? 1 : 0,
      confirmed: editingGig.confirmed ? 1 : 0,
      staff_needed: editingGig.staff_needed || 1,
      claimed_by: [],
      backup_needed: editingGig.backup_needed || 1,
      backup_claimed_by: [],
      latitude: null,
      longitude: null,
      attire: editingGig.staff_attire,
      indoor: editingGig.indoors ? 1 : 0,
      approval_needed: editingGig.approval_needed ? 1 : 0,
      on_site_parking: editingGig.on_site_parking ? 1 : 0,
      local_parking: editingGig.local_parking || 'N/A',
      NDA: editingGig.nda_required ? 1 : 0,
      establishment: editingGig.home_or_venue || 'home',
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

    setShowGigEditor(false);
    setEditingGig(null);
  };

  const visibleForms = intakeForms.filter(form => showHidden || !hiddenIds.includes(form.id));
 
 const navigate = useNavigate(); // Add this inside the component

const formatTimeToAMPM = (timeStr) => {
  if (!timeStr) return '';
  const date = new Date(`1970-01-01T${timeStr}`);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const handleCreateQuote = (form) => {
  const preQuote = {
    clientName: form.full_name,
    clientEmail: form.email,
    clientPhone: form.phone,
    quoteNumber: `Q-${Date.now()}`,
    quoteDate: new Date().toLocaleDateString(),
    eventDate: form.event_date,
    eventTime: formatTimeToAMPM(form.event_time), // ✅ formatted to AM/PM
    location: form.event_location,
    items: [
      {
        name: form.event_type,
        quantity: 1,
        unitPrice: '',
        description: `Duration: ${form.event_duration || 'N/A'} | Guest Count: ${form.guest_count || 'N/A'} | Amenities: ${form.location_facilities || 'N/A'} | Add-ons: ${form.addons || 'N/A'}`,
      },
    ],
  };

  sessionStorage.setItem('preQuote', JSON.stringify(preQuote));
  navigate('/admin/quotes');
};



const formatDate = (dateStr) => {
  try {
    const raw = typeof dateStr === 'string' ? dateStr.split('T')[0] : '';
    const [year, month, day] = raw.split('-').map(Number);

    if (!year || !month || !day) throw new Error('Bad date format');

    const date = new Date(year, month - 1, day); // JS month is 0-based
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (e) {
    return 'Invalid Date';
  }
};


  const formatTime = (timeStr) => timeStr ? new Date(`1970-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '';

  return (
    <div className="table-scroll-container">
      <h2>General Intake Forms</h2>
      <button onClick={toggleShowHidden} style={{ margin: '10px 0', padding: '5px 10px' }}>
        {showHidden ? 'Hide Removed' : 'Show Removed'}
      </button>

      <table className="intake-forms-table">
        <thead>
          <tr>
            {['Full Name', 'Email', 'Phone', 'Event Type', 'Guest Count', 'Date', 'Time', 'Event Duration', 'Location', 'Attire', 'Indoor', 'Approval Needed', 'On-Site Parking', 'Local Parking', 'NDA Required', 'Establishment','Insurance', 'Amenities', 'Addons', 'Comments', 'Actions'].map(header => <th key={header}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {visibleForms.map((form) => (
            <tr key={form.id} style={hiddenIds.includes(form.id) ? { opacity: 0.5 } : {}}>
              <td>{form.full_name}</td>
              <td>{form.email}</td>
              <td>{form.phone}</td>
              <td>{form.event_type}</td>
              <td>{form.guest_count}</td>
              <td>{formatDate(form.event_date)}</td>
              <td>{formatTime(form.event_time)}</td>
              <td>{form.event_duration}</td>
              <td>{form.event_location}</td>
              <td>{form.staff_attire}</td>
              <td>{form.indoors ? 'Yes' : 'No'}</td>
              <td>{form.approval_needed ? 'Yes' : 'No'}</td>
              <td>{form.on_site_parking ? 'Yes' : 'No'}</td>
              <td>{form.local_parking || 'N/A'}</td>
              <td>{form.nda_required ? 'Yes' : 'No'}</td>
              <td>{form.home_or_venue || 'home'}</td>
              <td>{form.insurance_required ? 'Yes' : 'No'}</td>
              <td>{form.location_facilities || 'N/A'}</td>
              <td>{form.addons}</td>
              <td>{form.additional_comments}</td>

              <td>
                <button onClick={() => { setEditingGig(form); setShowGigEditor(true); }} style={{ marginRight: '5px' }}>Add to Gigs</button>
                <button onClick={() => handleCreateQuote(form)} style={{ marginRight: '5px' }}>Quote</button>
                <button onClick={() => handleRemove(form.id)} style={{ backgroundColor: '#8B0000', color: 'white', padding: '5px 10px', border: 'none' }}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showGigEditor && editingGig && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Edit Gig Before Adding</h3>
            <label>Client: <input value={editingGig.full_name} onChange={e => setEditingGig({ ...editingGig, full_name: e.target.value })} /></label>
            <label>Event Type: <input value={editingGig.event_type} onChange={e => setEditingGig({ ...editingGig, event_type: e.target.value })} /></label>
            <label>Date: <input type="date" value={editingGig.event_date} onChange={e => setEditingGig({ ...editingGig, event_date: e.target.value })} /></label>
            <label>Time: <input type="time" value={editingGig.event_time} onChange={e => setEditingGig({ ...editingGig, event_time: e.target.value })} /></label>
            <label>Duration: <input value={editingGig.event_duration} onChange={e => setEditingGig({ ...editingGig, event_duration: e.target.value })} /></label>
            <label>Location: <input value={editingGig.event_location} onChange={e => setEditingGig({ ...editingGig, event_location: e.target.value })} /></label>
            <label>Indoors: <input value={editingGig.indoors} onChange={e => setEditingGig({ ...editingGig, indoors: e.target.value })} /></label>
            <label>Position: <input value={editingGig.position || 'bartender'} onChange={e => setEditingGig({ ...editingGig, position: e.target.value })} /></label>
            <label>Pay: <input value={editingGig.pay || 20} onChange={e => setEditingGig({ ...editingGig, pay: e.target.value })} /></label>
            <label>Staff Needed: <input value={editingGig.staff_needed || 1} onChange={e => setEditingGig({ ...editingGig, staff_needed: e.target.value })} /></label>
            <label>Backup Needed: <input value={editingGig.backup_needed || 1} onChange={e => setEditingGig({ ...editingGig, backup_needed: e.target.value })} /></label>
            <label>Confirmed: <select value={editingGig.confirmed ? 'Yes' : 'No'} onChange={e => setEditingGig({ ...editingGig, confirmed: e.target.value === 'Yes' })}><option value="Yes">Yes</option><option value="No">No</option></select></label>
            <div style={{ marginTop: '10px' }}>
              <button onClick={handleSubmitGig} style={{ marginRight: '5px' }}>Submit Gig</button>
              <button onClick={() => setShowGigEditor(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntakeSection;
