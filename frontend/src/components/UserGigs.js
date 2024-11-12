import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Add helper functions to calculate distance and get location
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getCurrentLocation() {
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
}

const UserGigs = () => {
    const [gigs, setGigs] = useState([]);
    const [error, setError] = useState(null);
    const username = localStorage.getItem('username'); // Fetch the username from localStorage
    //const [claimedGigs, setClaimedGigs] = useState([]);
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

    // Fetch gigs from the server
    const fetchGigs = useCallback(async () => {
        try {
            const response = await fetch(`${apiUrl}/gigs`);
            if (!response.ok) {
                throw new Error('Failed to fetch gigs');
            }
            const data = await response.json();
            setGigs(data);
            // Filter gigs that are already claimed by the current user
            //const userClaimedGigs = data.filter(gig => gig.claimed_by?.includes(username) || gig.backup_claimed_by?.includes(username));
            //setClaimedGigs(userClaimedGigs);
        } catch (error) {
            console.error('Error fetching gigs:', error);
            setError('Failed to fetch gigs.');
        }
    }, [apiUrl]);
    
    // Fetch gigs on component mount
    useEffect(() => {
        fetchGigs();
    }, [fetchGigs]);

    // Initialize currentDate using useMemo
    //const currentDate = useMemo(() => new Date(), []);

      // Filter and sort claimed gigs
      const filteredGigs = useMemo(() => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate()-1); // Add 1 day to include gigs for today
        return gigs
            .filter(gig => {
                const gigDate = new Date(gig.date);
                return gigDate >= currentDate;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date ascending
    }, [gigs]);
    
    // Claim or unclaim a regular gig
    const toggleClaimGig = async (gigId, isClaimed) => {
        const action = isClaimed ? 'unclaim' : 'claim'; // Determine action based on current state

        try {
            const response = await fetch(`${apiUrl}/gigs/${gigId}/${action}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }), // Correctly send username
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            const updatedGig = await response.json();
            console.log(`${action.charAt(0).toUpperCase() + action.slice(1)}ed gig successfully:`, updatedGig);
            fetchGigs(); // Refresh gigs list after claiming or unclaiming
            // Update claimed gigs state
            /*setClaimedGigs(prevGigs =>
                action === 'claim'
                    ? [...prevGigs, updatedGig]
                    : prevGigs.filter(gig => gig.id !== gigId)
            );*/
        } catch (error) {
            console.error(`Error ${action}ing gig:`, error.message);
            setError(`Failed to ${action} gig.`);
        }
    };

    // Claim or unclaim a backup gig
    const toggleClaimBackup = async (gigId, isBackupClaimed) => {
        const action = isBackupClaimed ? 'unclaim-backup' : 'claim-backup'; // Correctly use action
        
        try {
            const response = await fetch(`${apiUrl}/gigs/${gigId}/${action}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username }), // Correctly send username
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }

            const updatedGig = await response.json();
            console.log(`${action.charAt(0).toUpperCase() + action.slice(1)}ed backup gig successfully:`, updatedGig);
            fetchGigs(); // Refresh gigs list after claiming or unclaiming
        } catch (error) {
            console.error(`Error ${action}ing backup gig:`, error.message);
            setError(`Failed to ${action} backup gig.`);
        }
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        
        // Combine time string with a dummy date (e.g., '1970-01-01') to create a full date-time string
        const dateTimeString = `1970-01-01T${timeString}`;  // Treat as UTC by appending 'Z'
        const date = new Date(dateTimeString);
    
        // Format the time in the America/New_York timezone
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
// Check-In/Out function with location validation
const handleCheckInOut = async (gig, isCheckIn) => {
    try {
        const userLocation = await getCurrentLocation();
        const gigLocation = { latitude: gig.latitude, longitude: gig.longitude }; // Assuming you have lat/long for the gig location
        const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            gigLocation.latitude,
            gigLocation.longitude
        );

        if (distance <= 0.5) { // within 0.5 miles
            const endpoint = isCheckIn ? 'check-in' : 'check-out';
            const response = await fetch(`${apiUrl}/gigs/${gig.id}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (response.ok) {
                alert(isCheckIn ? 'Checked in successfully!' : 'Checked out successfully!');
                // Update claimed gigs or refresh gig data
                fetchGigs();
            } else {
                alert('Failed to check in/out. Please try again.');
            }
        } else {
            alert("You must be within 0.5 miles of the gig location to check in/out.");
        }
    } catch (error) {
        console.error('Error during check-in/out:', error);
    }
};

    // Render the gig list
    return (
        <div className="user-gigs-container">
            <h2>Your Gigs</h2>
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
                                <strong>Confirmed:</strong> 
                                <span style={{ color: gig.confirmed ? 'green' : 'red' }}>
                                    {gig.confirmed ? 'Yes' : 'No'}
                                </span>
                                <br />

                                <p>
                                    <strong>Claim Status:</strong> {gig.claimed_by.includes(username) ? "Main" : "Backup"}
                                </p>
                                
                                <button onClick={() => handleCheckInOut(gig, true)}>Check In</button>
                                <button onClick={() => handleCheckInOut(gig, false)}>Check Out</button>
                            </li>
                        ))}
                </ul>
            ) : (
                <p>You have no claimed gigs.</p>
            )}


            <h2>Available Gigs</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {filteredGigs.length > 0 ? (
                <ul>
                    {filteredGigs.map((gig) => (
                        <li key={gig.id} className="gig-card">
                            <h3>Client: {gig.client}</h3> <br />
                            <strong>Event Type:</strong> {gig.event_type} <br />
                            <strong>Date:</strong> {formatDate(gig.date)} <br />
                            <strong>Time:</strong> {formatTime(gig.time)} <br />
                            <strong>Duration:</strong> {gig.duration} <br />
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
                            <strong>Position:</strong> {gig.position} <br />
                            <strong>Gender:</strong> {gig.gender} <br />
                            <strong>Pay:</strong> ${gig.pay}/hr + tips <br />
                            <strong>Needs Certification: </strong>
                            <span style={{ color: gig.needs_cert ? 'red' : 'green' }}>
                                {gig.needs_cert ? 'Yes' : 'No'}
                            </span> 
                            <br />
                            <strong>Confirmed: </strong>
                            <span style={{ color: gig.confirmed ? 'green' : 'red' }}>
                                {gig.confirmed ? 'Yes' : 'No'}
                            </span> 
                            <br />
                            <strong>Staff Needed:</strong> {gig.staff_needed} <br />
                            <strong>Claimed By:</strong> {gig.claimed_by.length > 0 ? gig.claimed_by.join(', ') : 'None'} <br />
                            <strong>Backup Needed:</strong> {gig.backup_needed} <br />
                            <strong>Backup Claimed By:</strong> {gig.backup_claimed_by.length > 0 ? gig.backup_claimed_by.join(', ') : 'None'} <br />
                           
                            <button
                                className="claim-button"
                                onClick={() => toggleClaimGig(gig.id, gig.claimed_usernames?.includes(username))}
                            >
                                {gig.claimed_usernames?.includes(username) ? 'Unclaim Gig' : 'Claim Gig'}
                            </button>

                            <button
                                className="backup-button"
                                onClick={() => toggleClaimBackup(gig.id, gig.backup_claimed_by?.includes(username))}
                            >
                                {gig.backup_claimed_by?.includes(username) ? 'Unclaim Backup Gig' : 'Claim Backup Gig'}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No gigs available.</p>
            )}
        </div>
    );
};

export default UserGigs;
