// src/components/AdminGigs.js
import React, { useState, useEffect } from 'react';

const AdminGigs = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const [newGig, setNewGig] = useState({
    client: '',
    event_type: '',
    date: '',
    time: '',
    duration: '',
    location: '',
    position: '',
    gender: '',
    pay: '',
    insurance: false,
    indoor: false,
    approval_needed: false,
    on_site_parking: false,
    local_parking: 'N/A',
    NDA: false,
    establishment: 'home',
    attire: '',
    confirmed: false,
    needs_cert: false,
    staff_needed: '',
    claimed_by: [],
    backup_needed: '',
    backup_claimed_by: [],
  });

  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${apiUrl}/users`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [apiUrl]);

  const handleChange = (e) => {
    const { name, value, multiple, selectedOptions } = e.target;

    const boolFields = new Set([
      'indoor',
      'approval_needed',
      'on_site_parking',
      'NDA',
      'insurance',
      'needs_cert',
      'confirmed',
    ]);

    setNewGig((prev) => ({
      ...prev,
      [name]: multiple
        ? Array.from(selectedOptions, (opt) => opt.value).filter(Boolean)
        : boolFields.has(name)
          ? value === 'Yes'
          : value,
    }));
  };

  const safeFloat = (v, fallback = 0) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const safeInt = (v, fallback = 0) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : fallback;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const gigData = {
      client: newGig.client.trim(),
      event_type: newGig.event_type.trim(),
      date: newGig.date,
      time: newGig.time ? `${newGig.time}:00` : '00:00:00',
      duration: safeFloat(newGig.duration, 0),
      location: newGig.location.trim(),
      position: newGig.position.trim(),
      gender: newGig.gender.trim(),
      pay: safeFloat(newGig.pay, 0),

      // booleans (force actual booleans)
      insurance: !!newGig.insurance,
      indoor: !!newGig.indoor,
      approval_needed: !!newGig.approval_needed,
      on_site_parking: !!newGig.on_site_parking,
      NDA: !!newGig.NDA,
      needs_cert: !!newGig.needs_cert,
      confirmed: !!newGig.confirmed,

      local_parking: (newGig.local_parking ?? 'N/A').trim() || 'N/A',
      establishment: newGig.establishment || 'home',
      attire: newGig.attire.trim(),

      staff_needed: safeInt(newGig.staff_needed, 0),
      backup_needed: safeInt(newGig.backup_needed, 0),

      // arrays
      claimed_by: Array.isArray(newGig.claimed_by) ? newGig.claimed_by.filter(Boolean) : [],
      backup_claimed_by: Array.isArray(newGig.backup_claimed_by) ? newGig.backup_claimed_by.filter(Boolean) : [],
    };

    console.log('Submitting Gig Data:', gigData);

    try {
      const response = await fetch(`${apiUrl}/gigs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(gigData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to add gig. Status: ${response.status}, Message: ${errorText}`);
      }

      const newGigResponse = await response.json();
      console.log('Gig added successfully:', newGigResponse);
      alert('Gig added successfully!');

      setNewGig({
        client: '',
        event_type: '',
        date: '',
        time: '',
        duration: '',
        location: '',
        position: '',
        gender: '',
        pay: '',
        insurance: false,
        indoor: false,
        approval_needed: false,
        on_site_parking: false,
        local_parking: 'N/A',
        NDA: false,
        establishment: 'home',
        attire: '',
        confirmed: false,
        needs_cert: false,
        staff_needed: '',
        claimed_by: [],
        backup_needed: '',
        backup_claimed_by: [],
      });
    } catch (error) {
      console.error('Error adding gig:', error);
      alert(`Error adding gig: ${error.message}`);
    }
  };

  return (
    <div>
      <h1>Admin Dashboard</h1>
      <p>Add a new gig below.</p>

      <form onSubmit={handleSubmit}>
        <label>
          <strong>Client Name: </strong>
          <input type="text" name="client" value={newGig.client} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Event Type: </strong>
          <input type="text" name="event_type" value={newGig.event_type} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Date: </strong>
          <input type="date" name="date" value={newGig.date} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Time: </strong>
          <input type="time" name="time" value={newGig.time} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Duration (hours): </strong>
          <input type="number" step="0.25" name="duration" value={newGig.duration} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Location: </strong>
          <input type="text" name="location" value={newGig.location} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Position: </strong>
          <input type="text" name="position" value={newGig.position} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Gender: </strong>
          <input type="text" name="gender" value={newGig.gender} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Pay: </strong>
          <input type="number" step="0.01" name="pay" value={newGig.pay} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Insurance: </strong>
          <select
            name="insurance"
            value={newGig.insurance ? 'Yes' : 'No'}
            onChange={handleChange}
            required
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>

        <br />

        <label>
          <strong>Attire: </strong>
          <input type="text" name="attire" value={newGig.attire} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Indoor Event: </strong>
          <select name="indoor" value={newGig.indoor ? 'Yes' : 'No'} onChange={handleChange} required>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>

        <br />

        <label>
          <strong>Approval Needed: </strong>
          <select
            name="approval_needed"
            value={newGig.approval_needed ? 'Yes' : 'No'}
            onChange={handleChange}
            required
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>

        <br />

        <label>
          <strong>On-Site Parking: </strong>
          <select
            name="on_site_parking"
            value={newGig.on_site_parking ? 'Yes' : 'No'}
            onChange={handleChange}
            required
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>

        <br />

        <label>
          <strong>Local Parking: </strong>
          <input type="text" name="local_parking" value={newGig.local_parking} onChange={handleChange} />
        </label>

        <br />

        <label>
          <strong>NDA Required: </strong>
          <select name="NDA" value={newGig.NDA ? 'Yes' : 'No'} onChange={handleChange} required>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>

        <br />

        <label>
          <strong>Establishment: </strong>
          <select name="establishment" value={newGig.establishment} onChange={handleChange} required>
            <option value="home">Home</option>
            <option value="venue">Venue</option>
          </select>
        </label>

        <br />

        <label>
          <strong>Needs Certification: </strong>
          <select
            name="needs_cert"
            value={newGig.needs_cert ? 'Yes' : 'No'}
            onChange={handleChange}
            required
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>

        <br />

        <label>
          <strong>Confirmed: </strong>
          <select
            name="confirmed"
            value={newGig.confirmed ? 'Yes' : 'No'}
            onChange={handleChange}
            required
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>

        <br />

        <label>
          <strong>Staff Needed: </strong>
          <input type="number" name="staff_needed" value={newGig.staff_needed} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Backup Needed: </strong>
          <input type="number" name="backup_needed" value={newGig.backup_needed} onChange={handleChange} required />
        </label>

        <br />

        <label>
          <strong>Claimed By: </strong>
          <select
            name="claimed_by"
            value={newGig.claimed_by}
            onChange={handleChange}
            multiple
          >
            {users.map((user) => (
              <option key={user.id} value={user.username}>
                {user.username}
              </option>
            ))}
          </select>
        </label>

        <br />

        <label>
          <strong>Backup Claimed By: </strong>
          <select
            name="backup_claimed_by"
            value={newGig.backup_claimed_by}
            onChange={handleChange}
            multiple
          >
            {users.map((user) => (
              <option key={user.id} value={user.username}>
                {user.username}
              </option>
            ))}
          </select>
        </label>

        <br />

        <button type="submit">Add New Gig</button>
      </form>
    </div>
  );
};

export default AdminGigs;
