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

  const buildDateTime = (date, time) => {
    if (!date) return new Date(0);
    const t = time ? String(time).slice(0, 8) : "00:00:00";
    return new Date(`${date}T${t}`);
  };

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
    const client = clients.find((c) => Number(c.id) === Number(id));
    return client ? client.full_name : "Unknown";
  };

  const combinedEvents = useMemo(() => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 2);

    const gigsFiltered = gigs
      .map((g) => ({ ...g, type: "gig" }))
      .filter((g) => {
        const gigDate = new Date(g.date);
        const claimed = parseArray(g.claimed_by);
        const backup = parseArray(g.backup_claimed_by);

        const isMine =
          claimed.some(
            (u) => String(u).toLowerCase() === String(username).toLowerCase()
          ) ||
          backup.some(
            (u) => String(u).toLowerCase() === String(username).toLowerCase()
          );

        return gigDate >= currentDate && isMine;
      });

    const apptsFiltered = appointments
      .map((a) => ({ ...a, type: "appointment" }))
      .filter((a) => {
        const apptDate = new Date(a.date);
        let staffArray = a.assigned_staff;

        if (!staffArray) return false;

        if (typeof staffArray === "string" && staffArray.startsWith("{")) {
          staffArray = staffArray
            .slice(1, -1)
            .split(",")
            .map((s) => s.trim().replace(/^"(.*)"$/, "$1"));
        }

        if (!Array.isArray(staffArray)) return false;

        const isMine = staffArray.some(
          (u) => String(u).toLowerCase() === String(username).toLowerCase()
        );

        return apptDate >= currentDate && isMine;
      });

    const combined = [...gigsFiltered, ...apptsFiltered];
    combined.sort((a, b) => new Date(a.date) - new Date(b.date));
    return combined;
  }, [gigs, appointments, username]);

  const getCurrentLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
        (err) => reject(err),
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
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

  const handleCheckInOut = async (event, isCheckIn) => {
    const { id, type = "gig", date, time, latitude, longitude, location } = event;

    const now = new Date();
    const eventDateTime = buildDateTime(date, time);

    if (isCheckIn && now < eventDateTime) {
      alert("You cannot check in before the event time.");
      return;
    }

    try {
      const userLoc = await getCurrentLocation();

      // Default appointment location
      const defaultAppointmentLat = 25.94853;
      const defaultAppointmentLng = -80.21315;

      const eventLat =
        type === "gig" ? Number(latitude) : defaultAppointmentLat;
      const eventLng =
        type === "gig" ? Number(longitude) : defaultAppointmentLng;

      if (!Number.isFinite(eventLat) || !Number.isFinite(eventLng)) {
        alert(
          "This event is missing valid saved coordinates. Please contact admin to update the location."
        );
        console.error("Missing/invalid event coordinates:", {
          id,
          type,
          latitude,
          longitude,
          location,
        });
        return;
      }

      const distance = calculateDistance(
        userLoc.latitude,
        userLoc.longitude,
        eventLat,
        eventLng
      );

      const maxDistanceMiles = 2;

      console.log("📍 Check-in debug", {
        eventId: id,
        eventType: type,
        eventLocationText: location,
        userLat: userLoc.latitude,
        userLng: userLoc.longitude,
        userAccuracyFeet: userLoc.accuracy
          ? (userLoc.accuracy * 3.28084).toFixed(0)
          : null,
        eventLat,
        eventLng,
        distanceMiles: distance.toFixed(2),
      });

      if (distance > maxDistanceMiles) {
        alert(
          `You must be within ${maxDistanceMiles} miles to check in/out.\n\nYou are currently about ${distance.toFixed(
            2
          )} miles away.\n\nIf you are at the venue, the saved venue coordinates may be wrong.`
        );
        return;
      }

      const endpointType = type === "gig" ? "gigs" : "appointments";
      const endpoint = `${apiUrl}/${endpointType}/${id}/${
        isCheckIn ? "check-in" : "check-out"
      }`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, username }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Check-in/out failed");
      }

      alert(isCheckIn ? "Checked in!" : "Checked out!");
      fetchGigs();
      fetchAppointments();
    } catch (err) {
      console.error("Check-in/out error:", err);

      if (err?.code === 1) {
        alert("Location permission was denied. Please allow location access and try again.");
        return;
      }

      if (err?.code === 2) {
        alert("Your location could not be determined. Try stepping outside or turning on precise location.");
        return;
      }

      if (err?.code === 3) {
        alert("Location request timed out. Please try again.");
        return;
      }

      alert("Error checking in/out.");
    }
  };

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
                <br />
                <strong>Saved Coords:</strong>{" "}
                {event.latitude && event.longitude
                  ? `${event.latitude}, ${event.longitude}`
                  : "Missing"}
              </>
            ) : (
              <>
                <strong>Client:</strong> {getClientName(event.client_id)}
              </>
            )}

            <br />
            <br />
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