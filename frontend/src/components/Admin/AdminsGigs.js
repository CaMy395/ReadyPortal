import React, { useMemo, useCallback, useState, useEffect } from "react";

const AdminsGigs = () => {
  const [gigs, setGigs] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);

  const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const loggedInUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("loggedInUser"));
    } catch {
      return null;
    }
  })();

  const userId = loggedInUser?.id || null;
  const username =
    loggedInUser?.username || localStorage.getItem("username") || "";

  /* ============================
     Helpers
  ============================ */
  const parseArray = (val) =>
    typeof val === "string" && val.startsWith("{")
      ? val
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim().replace(/^"(.*)"$/, "$1"))
      : Array.isArray(val)
      ? val
      : [];

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";
    const date = new Date(`1970-01-01T${timeString}`);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/New_York",
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  };

  // Build a true datetime from date + time (so "today" gigs don't vanish)
  const buildDateTime = (date, time) => {
    if (!date) return new Date(0);
    // If time missing, use 00:00
    const t = time ? String(time).slice(0, 8) : "00:00:00";
    return new Date(`${date}T${t}`);
  };

  /* ============================
     Fetch Data
  ============================ */
  const fetchAppointments = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/appointments`);
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching appointments:", e);
    }
  }, [apiUrl]);

  const fetchGigs = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/gigs`);
      const data = await res.json();
      setGigs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching gigs:", err);
    }
  }, [apiUrl]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/clients`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching clients:", e);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchGigs();
    fetchAppointments();
    fetchClients();
  }, [fetchGigs, fetchAppointments, fetchClients]);

  const getClientName = (id) => {
    const client = clients.find((c) => c.id === id);
    return client ? client.full_name : "Unknown";
  };

  /* ============================
     Combine Events (FIXED FILTER)
  ============================ */


const combinedEvents = useMemo(() => {
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() - 2); // ✅ same as YourGigs

  const gigsFiltered = gigs
    .map(g => ({ ...g, type: 'gig' }))
    .filter(g => {
      const gigDate = new Date(g.date); // ✅ date-only, NOT midnight compared to "now"
      const claimed = parseArray(g.claimed_by);
      const backup = parseArray(g.backup_claimed_by);

      const isMine =
        claimed.some(u => String(u).toLowerCase() === String(username).toLowerCase()) ||
        backup.some(u => String(u).toLowerCase() === String(username).toLowerCase());

      return gigDate >= currentDate && isMine;
    });

  const apptsFiltered = appointments
    .map(a => ({ ...a, type: 'appointment' }))
    .filter(a => {
      const apptDate = new Date(a.date);
      let staffArray = a.assigned_staff;

      if (!staffArray) return false;

      // ✅ handle postgres array string
      if (typeof staffArray === 'string' && staffArray.startsWith('{')) {
        staffArray = staffArray
          .slice(1, -1)
          .split(',')
          .map(s => s.trim().replace(/^"(.*)"$/, '$1'));
      }

      if (!Array.isArray(staffArray)) return false;

      const isMine = staffArray.some(
        u => String(u).toLowerCase() === String(username).toLowerCase()
      );

      return apptDate >= currentDate && isMine;
    });

  const combined = [...gigsFiltered, ...apptsFiltered];
  combined.sort((a, b) => new Date(a.date) - new Date(b.date));
  return combined;
}, [gigs, appointments, username]);


  /* ============================
     Geolocation Helpers (unchanged)
  ============================ */
  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error("Geolocation not supported"));
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        reject
      );
    });

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 3958.8;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  /* ============================
     Check In / Out (keep as-is)
  ============================ */
  const handleCheckInOut = async (event, isCheckIn) => {
    const { id, type = "gig", date, time, latitude, longitude } = event;

    const now = new Date();
    const eventDateTime = buildDateTime(date, time);
    if (isCheckIn && now < eventDateTime) {
      alert("You cannot check in before the event time.");
      return;
    }

    try {
      const userLoc = await getCurrentLocation();

      const eventLat = type === "gig" ? parseFloat(latitude || 0) : 25.94853;
      const eventLng = type === "gig" ? parseFloat(longitude || 0) : -80.21315;

      const distance = calculateDistance(
        userLoc.latitude,
        userLoc.longitude,
        eventLat,
        eventLng
      );

      if (distance > 1) {
        alert("You must be within 1 mile to check in/out.");
        return;
      }

      const endpointType = type === "gig" ? "gigs" : "appointments";
      const endpoint = `${apiUrl}/${endpointType}/${id}/${
        isCheckIn ? "check-in" : "check-out"
      }`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // keep payload compatible with your backend
        body: JSON.stringify({ userId, username }),
      });

      if (!res.ok) throw new Error("Check-in/out failed");

      alert(isCheckIn ? "Checked in!" : "Checked out!");
      fetchGigs();
      fetchAppointments();
    } catch (err) {
      console.error("Check-in/out error:", err);
      alert("Error checking in/out.");
    }
  };

  /* ============================
     Render
  ============================ */
  return (
    <div>
      <h2>My Gigs & Appointments</h2>

      <ul>
        {combinedEvents.map((event) => (
          <li key={`${event.type}-${event.id}`} className="gig-card">
            <h3>
              {event.type === "gig"
                ? `Gig: ${event.client}`
                : `Appointment: ${event.title}`}
            </h3>

            <strong>Date:</strong> {formatDate(event.date)}
            <br />
            <strong>Time:</strong> {formatTime(event.time)}
            <br />

            {event.type === "gig" ? (
              <>
                <strong>Location:</strong>{" "}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    event.location
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {event.location}
                </a>
                <br />
                <strong>Pay:</strong> ${event.pay}/hr + tips
              </>
            ) : (
              <>
                <strong>Client:</strong> {getClientName(event.client_id)}
              </>
            )}

            <br />
            <br></br>
            <button onClick={() => handleCheckInOut(event, true)}>
              Check In
            </button>
            <button onClick={() => handleCheckInOut(event, false)}>
              Check Out
            </button>
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
