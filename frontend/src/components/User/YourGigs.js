import React, { useMemo, useCallback, useState, useEffect } from 'react';
import '../../App.css'
import moment from 'moment-timezone';


const YourGigs = () => {
    const [gigs, setGigs] = useState([]); // Define gigs with useState
    const username = localStorage.getItem('username'); // Get the username from localStorage
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';



    const fetchGigs = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/gigs`);
            if (!response.ok) {
                throw new Error('Failed to fetch gigs');
            }
            const data = await response.json();
            setGigs(data);
        } catch (error) {
            console.error('Error fetching gigs:', error);
        }
    }, [apiUrl]);

    useEffect(() => {
        fetchGigs();
    }, [fetchGigs]);

    const filteredGigs = useMemo(() => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() - 2);
        return gigs
            .filter(gig => {
                const gigDate = new Date(gig.date);
                return gigDate >= currentDate;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    }, [gigs]);

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

    const handleCheckInOut = async (gig, isCheckIn) => {
        try {
            const userLocation = await getCurrentLocation();
            const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                parseFloat(gig.latitude),
                parseFloat(gig.longitude)
            );
            

            if (distance <= 1) { // within 01 miles
                const endpoint = isCheckIn ? 'check-in' : 'check-out';
                const response = await fetch(`${apiUrl}/gigs/${gig.id}/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username })
                });

                if (response.ok) {
                    alert(isCheckIn ? 'Checked in successfully!' : 'Checked out successfully!');
                    fetchGigs();
                } else {
                    alert('Failed to check in/out. Please try again.');
                }
            } else {
                alert("You must be within 01 miles of the gig location to check in/out.");
            }
        } catch (error) {
            console.error('Error during check-in/out:', error);
            alert('An error occurred while trying to check in/out. Please try again.');
        }
    };

    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        lat2 = parseFloat(lat2);
        lon2 = parseFloat(lon2);
    
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

    return (
       <div >
            <h2>My Gigs</h2>
            <p> Please wait for the confirmation text for full details on your event!</p>
            {filteredGigs.length > 0 ? (
                <ul>
                    {filteredGigs
                        .filter(gig => gig.claimed_by.includes(username) || gig.backup_claimed_by.includes(username))
                        .map(gig => (
                            <li key={gig.id} className="gig-card">
                                <h3>Client: {gig.client}</h3>
                                <strong>Event Type:</strong> {gig.event_type} <br />
                                <strong>Date:</strong> {formatDate(gig.date)} <br />
                                <strong>Time:</strong> {formatTime(gig.time)} <br />
                                <strong>Location: </strong> 
                                <a 
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gig.location)}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="location-link"
                                >
                                    {gig.location}
                                </a> 
                                <br />
                                <strong>Pay:</strong> ${gig.pay}/hr + tips <br />
                                <strong>Confirmed: </strong> 
                                <span style={{ color: gig.confirmed ? 'green' : 'red' }}>
                                    {gig.confirmed ? 'Yes' : 'No'}
                                </span>
                                <br />

                                <p>
                                    <strong>Claim Status:</strong> {gig.claimed_by.includes(username) ? "Main" : "Backup"}
                                </p>
                                
                                <button
                                className="backup-button"
                                        onClick={() => handleCheckInOut(gig, true)}>Check In</button>
                                <button onClick={() => handleCheckInOut(gig, false)}>Check Out</button>
                            </li>
                        ))}
                </ul>
            ) : (
                <p>You have no claimed gigs.</p>
            )}
        </div>
    );
};

export default YourGigs;
