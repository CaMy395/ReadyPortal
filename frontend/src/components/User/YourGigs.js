import React, { useMemo, useCallback, useState, useEffect } from 'react';
import '../../App.css';

const YourGigs = () => {
  const [gigs, setGigs] = useState([]);
  const [appointments, setAppointments] = useState([]);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const loggedInUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('loggedInUser'));
    } catch {
      return null;
    }
  })();

  const userId = loggedInUser?.id || null;
  const username =
    loggedInUser?.username ||
    localStorage.getItem('username') ||
    '';

  const HOME_ADDR_KEY = 'staff_home_address';

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/appointments`);
      const data = await res.json();
      const withType = data.map(appt => ({ ...appt, type: 'appointment' }));
      setAppointments(withType);
    } catch (error) {
      console.error('❌ Error fetching appointments:', error);
    }
  }, [apiUrl]);

  const fetchGigs = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/gigs`);
      const data = await response.json();
      setGigs(data);
    } catch (error) {
      console.error('Error fetching gigs:', error);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchGigs();
    fetchAppointments();
  }, [fetchGigs, fetchAppointments]);

  const parseArray = (val) =>
    typeof val === 'string' && val.startsWith('{')
      ? val.slice(1, -1).split(',').map(item => item.trim().replace(/^"(.*)"$/, '$1'))
      : Array.isArray(val) ? val : [];

  const filteredGigs = useMemo(() => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 2);

    return gigs.filter(gig => {
      const gigDate = new Date(gig.date);
      const claimed = parseArray(gig.claimed_by);
      const backup = parseArray(gig.backup_claimed_by);
      return gigDate >= currentDate && (claimed.includes(username) || backup.includes(username));
    });
  }, [gigs, username]);

  const filteredAppointments = useMemo(() => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 2);

    return appointments.filter(appt => {
      const apptDate = new Date(appt.date);
      let staffArray = appt.assigned_staff;

      if (!staffArray) return false;

      if (typeof staffArray === 'string' && staffArray.startsWith('{')) {
        staffArray = staffArray
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^"(.*)"$/, '$1'));
      }

      if (!Array.isArray(staffArray)) return false;

      const match = staffArray.some(name =>
        String(name).toLowerCase() === String(username).toLowerCase()
      );

      return apptDate >= currentDate && match;
    });
  }, [appointments, username]);

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const date = new Date(`1970-01-01T${timeString}`);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);

    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  // 🔥 FIXED GPS (HIGH ACCURACY)
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    });
  };

  const handleCheckInOut = async (event, isCheckIn) => {
    try {
      const userLocation = await getCurrentLocation();

      const lat = parseFloat(event.latitude);
      const lng = parseFloat(event.longitude);

      if (!lat || !lng) {
        alert('⚠️ This event is missing location coordinates.');
        return;
      }

      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        lat,
        lng
      );

      const maxDistance = 2;

      console.log("📍 CHECK-IN DEBUG:", {
        user: userLocation,
        event: { lat, lng },
        distance: distance.toFixed(2)
      });

      if (distance > maxDistance) {
        alert(
          `You must be within ${maxDistance} miles.\n\nYou are ${distance.toFixed(
            2
          )} miles away.\n\nIf you're at the venue, coordinates are wrong.`
        );
        return;
      }

      const endpoint = `${apiUrl}/${event.type === 'appointment' ? 'appointments' : 'gigs'}/${event.id}/${isCheckIn ? 'check-in' : 'check-out'}`;

      let startAddress = null;

      if (!isCheckIn && event.type !== 'appointment') {
        startAddress = localStorage.getItem(HOME_ADDR_KEY) || '';

        if (!startAddress.trim()) {
          const entered = window.prompt('Enter your HOME address:', '');
          if (entered) {
            startAddress = entered;
            localStorage.setItem(HOME_ADDR_KEY, entered);
          }
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username, startAddress }),
      });

      if (response.ok) {
        alert(isCheckIn ? 'Checked in!' : 'Checked out!');
        fetchGigs();
        fetchAppointments();
      } else {
        alert('Failed to check in/out.');
      }

    } catch (error) {
      console.error(error);
      alert('Error checking in/out.');
    }
  };

  const allEvents = useMemo(() => {
    return [...filteredGigs, ...filteredAppointments].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [filteredGigs, filteredAppointments]);

  return (
    <div>
      <h2>My Gigs & Appointments</h2>

      <ul>
        {allEvents.map(event => (
          <li key={`${event.type}-${event.id}`} className="gig-card">

            <h3>{event.type === 'appointment' ? event.title : event.client}</h3>

            <strong>Date:</strong> {formatDate(event.date)}<br />
            <strong>Time:</strong> {formatTime(event.time)}<br />

            <strong>Location:</strong> {event.location}<br />

            <button onClick={() => handleCheckInOut(event, true)}>
              Check In
            </button>

            <button onClick={() => handleCheckInOut(event, false)}>
              Check Out
            </button>

          </li>
        ))}
      </ul>
    </div>
  );
};

export default YourGigs;