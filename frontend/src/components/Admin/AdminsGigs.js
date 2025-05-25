import React, { useMemo, useCallback, useState, useEffect } from 'react';

const AdminsGigs = () => {
  const [gigs, setGigs] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const username = localStorage.getItem('username');
  const apiUrl = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchAppointments = async () => {
      const res = await fetch(`${apiUrl}/appointments`);
      const data = await res.json();
      setAppointments(data);
    };
    fetchAppointments();
  }, [apiUrl]);

  const fetchGigs = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/gigs`);
      if (!response.ok) throw new Error('Failed to fetch gigs');
      const data = await response.json();
      setGigs(data);
    } catch (error) {
      console.error('Error fetching gigs:', error);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchGigs();
  }, [fetchGigs]);

  useEffect(() => {
  const fetchClients = async () => {
    const res = await fetch(`${apiUrl}/api/clients`);
    const data = await res.json();
    setClients(data);
  };
  fetchClients();
}, [apiUrl]);

    const getClientName = (id) => {
    const client = clients.find(c => c.id === id);
    return client ? client.full_name : 'Unknown';
    };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(`1970-01-01T${timeString}`);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  };

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 3);

const combinedEvents = useMemo(() => {
  const now = new Date();

  const gigsFiltered = gigs
    .map(g => ({
      ...g,
      type: 'gig',
      dateTime: new Date(g.date),
    }))
    .filter(g =>
      g.dateTime >= now &&
      (g.claimed_by?.includes(username) || g.backup_claimed_by?.includes(username))
    );

  const apptsFiltered = appointments
    .map(a => ({
      ...a,
      type: 'appointment',
      dateTime: new Date(a.date),
    }))
    .filter(a =>
      a.dateTime >= now &&
      a.assigned_staff?.includes(username)
    );

  const combined = [...gigsFiltered, ...apptsFiltered];
  combined.sort((a, b) => a.dateTime - b.dateTime);

  console.log("✅ Final Combined Events:", combined.map(e => ({
    id: e.id,
    type: e.type,
    dateTime: e.dateTime.toLocaleString(),
  })));

  return combined;
}, [gigs, appointments, username]);




  const getCurrentLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(
      position => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      reject
    );
  });

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8; // miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const handleCheckInOut = async (event, isCheckIn) => {
  const { id, type = 'gig', date, time } = event;
  const currentTime = new Date();
  const eventDateTime = new Date(`${date}T${time}`);

  if (isCheckIn && currentTime < eventDateTime) {
    alert("You cannot check in before the event's scheduled time.");
    return;
  }

  try {
    const userLocation = await getCurrentLocation();

    // Use event-provided lat/lng for gigs, but hardcode for appointments
    const eventLat = type === 'gig' ? parseFloat(event.latitude || 0) : 25.948530;
    const eventLng = type === 'gig' ? parseFloat(event.longitude || 0) : -80.213150;

    const distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      eventLat,
      eventLng
    );

    if (distance > 1) {
      alert("You must be within 01 miles of the event location to check in/out.");
      return;
    }

    const endpointType = type === 'gig' ? 'gigs' : 'appointments';
    const endpoint = `${apiUrl}/${endpointType}/${id}/${isCheckIn ? 'check-in' : 'check-out'}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });

    if (res.ok) {
      alert(isCheckIn ? 'Checked in successfully!' : 'Checked out successfully!');
      if (type === 'gig') fetchGigs();
    } else {
      alert('Check-in/out failed.');
    }
  } catch (error) {
    console.error('Error checking in/out:', error);
    alert('An error occurred while checking in/out.');
  }
};


  return (
    <div>
      <h2>My Gigs & Appointments</h2>
      <ul>
        {combinedEvents.map(event => (
          <li key={`${event.type}-${event.id}`} className="gig-card">
            <h3>{event.type === 'gig' ? `Gig: ${event.client}` : `Appointment: ${event.title}`}</h3>
            <strong>Date:</strong> {formatDate(event.date)}<br />
            <strong>Time:</strong> {formatTime(event.time)}<br />
            {event.type === 'gig' ? (
              <>
                <strong>Client:</strong> {event.client}<br />
                <strong>Location:</strong> <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                  target="_blank" rel="noopener noreferrer" className="location-link"
                >{event.location}</a><br />
                <strong>Pay:</strong> ${event.pay}/hr + tips<br />
                <strong>Confirmed:</strong> <span style={{ color: event.confirmed ? 'green' : 'red' }}>{event.confirmed ? 'Yes' : 'No'}</span><br />
                <p><strong>Claim Status:</strong> {event.claimed_by.includes(username) ? 'Main' : 'Backup'}</p>
              </>
            ) : (
              <>
                <strong>Client:</strong> {getClientName(event.client_id)}<br />
                <strong>Description:</strong> {event.description}<br />
              </>
            )}
            <button onClick={() => handleCheckInOut(event, true)}>Check In</button>
            <button onClick={() => handleCheckInOut(event, false)}>Check Out</button>
          </li>
        ))}

        {combinedEvents.length === 0 && (
          <p>You have no claimed gigs or appointments.</p>
        )}
      </ul>
    </div>
  );
};

export default AdminsGigs;
