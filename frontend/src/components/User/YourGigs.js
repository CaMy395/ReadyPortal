import React, { useMemo, useCallback, useState, useEffect } from 'react';
import '../../App.css';

const YourGigs = () => {
    const [gigs, setGigs] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const username = localStorage.getItem('username');
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

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
            if (!response.ok) {
                throw new Error('Failed to fetch gigs');
            }
            const data = await response.json();
            console.log("📦 Raw gigs from API:", data);
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

        const result = gigs.filter(gig => {
            const gigDate = new Date(gig.date);
            const claimed = parseArray(gig.claimed_by);
            const backup = parseArray(gig.backup_claimed_by);
            return gigDate >= currentDate && (claimed.includes(username) || backup.includes(username));
        });
        return result;
    }, [gigs, username]);

const filteredAppointments = useMemo(() => {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - 2); // show past 2 days

    return appointments
        .filter(appt => {
            const apptDate = new Date(appt.date);
            let staffArray = appt.assigned_staff;

            if (!staffArray) {
                return false;
            }

            if (typeof staffArray === 'string' && staffArray.startsWith('{')) {
                staffArray = staffArray
                    .slice(1, -1)
                    .split(',')
                    .map(s => s.trim().replace(/^"(.*)"$/, '$1'));
            }

            if (!Array.isArray(staffArray)) {
                return false;
            }

            const match = staffArray.some(name => name.toLowerCase() === username.toLowerCase());
            if (!match) {
            }

            return apptDate >= currentDate && match;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));
}, [appointments, username]);




    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        const dateTimeString = `1970-01-01T${timeString}`;
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/New_York',
        });
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC',
        });
    };

    const handleCheckInOut = async (event, isCheckIn) => {
        try {
            const userLocation = await getCurrentLocation();
            const lat = parseFloat(event.latitude || 25.948530);
            const lng = parseFloat(event.longitude || -80.213150);
            const distance = calculateDistance(userLocation.latitude, userLocation.longitude, lat, lng);

            if (distance > 1) {
                alert("You must be within 01 miles of the event location to check in/out.");
                return;
            }

            const endpoint = `${apiUrl}/${event.type === 'appointment' ? 'appointments' : 'gigs'}/${event.id}/${isCheckIn ? 'check-in' : 'check-out'}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (response.ok) {
                alert(isCheckIn ? 'Checked in successfully!' : 'Checked out successfully!');
                fetchGigs();
                fetchAppointments();
            } else {
                alert('Failed to check in/out. Please try again.');
            }
        } catch (error) {
            console.error('Error during check-in/out:', error);
            alert('An error occurred while trying to check in/out. Please try again.');
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 3958.8;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude
                        });
                    },
                    (error) => reject(error)
                );
            } else {
                reject(new Error("Geolocation is not supported by this browser."));
            }
        });
    };

    const allEvents = useMemo(() => {
        const combined = [...filteredGigs, ...filteredAppointments];
        combined.sort((a, b) => new Date(a.date) - new Date(b.date));
        return combined;
    }, [filteredGigs, filteredAppointments]);

    return (
        <div>
            <h2>My Gigs & Appointments</h2>
            <p>Please wait for the confirmation text for full details on your event!</p>
            {allEvents.length > 0 ? (
                <ul>
                    {allEvents.map(event => (
                        <li key={`${event.type || 'gig'}-${event.id}`} className="gig-card">
                            <h3>{event.type === 'appointment' ? `Appointment: ${event.title}` : `Gig: ${event.client}`}</h3>
                            <strong>Date:</strong> {formatDate(event.date)}<br />
                            <strong>Time:</strong> {formatTime(event.time)}<br />
                            <strong>Location: </strong>
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="location-link"
                            >
                                {event.location}
                            </a><br />
                            {event.type === 'appointment' ? (
                                <>
                                    <strong>Description:</strong> {event.description}<br />
                                </>
                            ) : (
                                <>
                                    <strong>Event Type:</strong> {event.event_type}<br />
                                    <strong>Pay:</strong> ${event.pay}/hr + tips<br />
                                    <strong>Confirmed:</strong>{' '}
                                    <span style={{ color: event.confirmed ? 'green' : 'red' }}>
                                        {event.confirmed ? 'Yes' : 'No'}
                                    </span><br />
                                    <p>
                                        <strong>Claim Status:</strong> {parseArray(event.claimed_by).includes(username) ? 'Main' : 'Backup'}
                                    </p>
                                </>
                            )}
                            <button className="backup-button" onClick={() => handleCheckInOut(event, true)}>Check In</button>
                            <button onClick={() => handleCheckInOut(event, false)}>Check Out</button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>You have no claimed gigs or assigned appointments.</p>
            )}
        </div>
    );
};

export default YourGigs;
