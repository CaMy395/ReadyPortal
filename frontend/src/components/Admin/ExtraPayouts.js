import React, { useState, useEffect } from 'react';

const ExtraPayouts = () => {
  const [users, setUsers] = useState([]);
  const [gigs, setGigs] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const [userId, setUserId] = useState('');
  const [referenceId, setReferenceId] = useState(''); // gig OR appointment
  const [referenceType, setReferenceType] = useState(''); // 'gig' | 'appointment'

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const apiUrl = process.env.REACT_APP_API_URL;

  /* Fetch users, gigs, and appointments */
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, gigsRes, apptsRes] = await Promise.all([
          fetch(`${apiUrl}/users`),
          fetch(`${apiUrl}/gigs`),
          fetch(`${apiUrl}/appointments`)
        ]);

        if (!usersRes.ok || !gigsRes.ok || !apptsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        setUsers(await usersRes.json());
        setGigs(await gigsRes.json());
        setAppointments(await apptsRes.json());
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, [apiUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId || !amount || !description) {
      alert('User, amount, and description are required.');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/extra-payouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          amount,
          description,
          referenceId: referenceId || null,
          referenceType: referenceType || null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to add extra payout');
      }

      setSuccessMessage('Extra payout added successfully!');
      setUserId('');
      setReferenceId('');
      setReferenceType('');
      setAmount('');
      setDescription('');

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      console.error(err);
      alert('Error adding extra payout.');
    }
  };

  const handleReferenceChange = (e) => {
    const value = e.target.value;

    if (!value) {
      setReferenceId('');
      setReferenceType('');
      return;
    }

    const [type, id] = value.split('|');
    setReferenceType(type);
    setReferenceId(id);
  };

  return (
    <div className="extra-payouts">
      <h2>Add Extra Payout</h2>

      {successMessage && <p className="success">{successMessage}</p>}

      <form onSubmit={handleSubmit}>
        <label>
          Staff Member
          <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
            <option value="">Select staff</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Gig / Appointment (Optional)
          <select value={`${referenceType}|${referenceId}`} onChange={handleReferenceChange}>
            <option value="">No gig / appointment</option>

            {gigs.length > 0 && (
              <optgroup label="Gigs">
                {gigs.map((gig) => (
                  <option key={`gig-${gig.id}`} value={`gig|${gig.id}`}>
                    {gig.client} – {gig.event_type} ({gig.date})
                  </option>
                ))}
              </optgroup>
            )}

            {appointments.length > 0 && (
              <optgroup label="Appointments">
                {appointments.map((appt) => (
                  <option key={`appt-${appt.id}`} value={`appointment|${appt.id}`}>
                    {appt.client_name} – {appt.appointment_type} (
                    {new Date(appt.date).toLocaleDateString()})
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <label>
          Amount
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </label>

        <label>
          Description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </label>

        <button type="submit">Add Payout</button>
      </form>
    </div>
  );
};

export default ExtraPayouts;
