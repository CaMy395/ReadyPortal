import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Route, Routes } from 'react-router-dom';
import YourGigs from './YourGigs';
import UserAttendance from './UserAttendance';

const UserGigs = () => {
    const [gigs, setGigs] = useState([]);
    const [error, setError] = useState(null);
    const username = localStorage.getItem('username'); // Fetch the username from localStorage
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

        } catch (error) {
            console.error('Error fetching gigs:', error);
            setError('Failed to fetch gigs.');
        }
    }, [apiUrl]);
    
    // Fetch gigs on component mount
    useEffect(() => {
        fetchGigs();
    }, [fetchGigs]);


      // Filter and sort claimed gigs
      const filteredGigs = useMemo(() => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate()-3); // Add 1 day to include gigs for today
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

    // Render the gig list
    return (
        <div>
            <h2>Welcome to the Gigs Portal</h2>
            <Routes>
                <Route path="your-gigs" element={<YourGigs />} />
                <Route path="user-attendance" element={<UserAttendance />} />
            </Routes>
            <p>See the available gigs below.</p>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {filteredGigs.length > 0 ? (
                <ul>
                    {filteredGigs.map((gig) => (
                        <li key={gig.id} className="gig-card">
                            <h3>Client: {gig.client}</h3>
                            <strong>Event Type:</strong> {gig.event_type} <br />
                            <strong>Date:</strong> {formatDate(gig.date)} <br />
                            <strong>Time:</strong> {formatTime(gig.time)} <br />
                            <strong>Duration:</strong> {gig.duration} hours <br />
                            <strong>Location:</strong>{' '}
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(gig.location)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="location-link"
                            >
                                {gig.location}
                            </a>{' '}
                            <br />
                            <strong>Position:</strong> {gig.position} <br />
                            <strong>Gender:</strong> {gig.gender} <br />
                            <strong>Attire:</strong> {gig.attire || 'N/A'} <br />
                            <strong>Indoor:</strong>{' '}
                            <span style={{ color: gig.indoor ? 'green' : 'red' }}>
                                {gig.indoor ? 'Yes' : 'No'}
                            </span>{' '}
                            <br />
                            <strong>Approval Needed:</strong>{' '}
                            <span style={{ color: gig.approval_needed ? 'red' : 'green' }}>
                                {gig.approval_needed ? 'Yes' : 'No'}
                            </span>{' '}
                            <br />
                            <strong>On-Site Parking:</strong>{' '}
                            <span style={{ color: gig.on_site_parking ? 'green' : 'red' }}>
                                {gig.on_site_parking ? 'Yes' : 'No'}
                            </span>{' '}
                            <br />
                            <strong>Local Parking:</strong> {gig.local_parking || 'N/A'} <br />
                            <strong>NDA Required:</strong>{' '}
                            <span style={{ color: gig.NDA ? 'red' : 'green' }}>
                                {gig.NDA ? 'Yes' : 'No'}
                            </span>{' '}
                            <br />
                            <strong>Establishment:</strong> {gig.establishment || 'N/A'} <br />
                            <strong>Claimed By:</strong>{' '}
                                    {gig.claimed_by.length > 0 ? gig.claimed_by.join(', ') : 'None'}
                                    <br />
                                    <strong>Staff Needed:</strong> {gig.staff_needed} <br />
                                    <strong>Backup Needed:</strong> {gig.backup_needed} <br />
                                    <strong>Backup Claimed By:</strong>{' '}
                                    {gig.backup_claimed_by.length > 0
                                        ? gig.backup_claimed_by.join(', ')
                                        : 'None'}
                                    <br />
                                    <strong>Confirmed:</strong>{' '}
                                    <span style={{ color: gig.confirmed ? 'green' : 'red' }}>
                                        {gig.confirmed ? 'Yes' : 'No'}
                                    </span>
                                    <br />
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