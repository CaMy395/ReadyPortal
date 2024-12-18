
import React, { useState, useEffect, useCallback, useMemo } from 'react';


const UpcomingGigs = () => {

    const [gigs, setGigs] = useState([]); // State to store gigs
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
            console.log('Fetched Gigs:', data);
      
            setGigs(data);
            

        } catch (error) {
            console.error('Error fetching gigs:', error);
        }
    }, [apiUrl]);
    
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${apiUrl}/users`);
                if (response.ok) {
                } else {
                    console.error('Failed to fetch users');
                }
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };
    
        fetchUsers();
        fetchGigs(); // Fetch gigs on component mount
    }, [apiUrl, fetchGigs]);
   
    // Filter and sort claimed gigs
    const filteredGigs = useMemo(() => {
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate()-2); // Add 1 day to include gigs for today
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
            console.log('Updated Gig:', updatedGig); // Check gig data
            console.log(`${action.charAt(0).toUpperCase() + action.slice(1)}ed gig successfully:`, updatedGig);
            fetchGigs(); // Refresh gigs list after claiming or unclaiming
            
        } catch (error) {
            console.error(`Error ${action}ing gig:`, error.message);
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
            
        }
    };

    const handleDeleteGig = async (gigId) => {
        console.log('Deleting gig with ID:', gigId); // Log the gig ID being sent
        try {
            const response = await fetch(`http://localhost:3001/gigs/${gigId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const error = await response.json();
                console.error('Error deleting gig:', error);
                throw new Error(error.message || 'Failed to delete gig');
            }
            alert('Gig deleted successfully');
        } catch (err) {
            console.error('Error:', err);
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
    
    const toggleGigStatus = async (gigId, field) => {
        const updatedGigs = gigs.map((gig) =>
            gig.id === gigId
                ? { ...gig, [field]: !gig[field] }
                : gig
        );
    
        const updatedGig = updatedGigs.find((gig) => gig.id === gigId);
    
        setGigs(updatedGigs); // Optimistically update UI
    
        try {
            const response = await fetch(`${apiUrl}/gigs/${gigId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ [field]: updatedGig[field] }),
            });
    
            if (!response.ok) {
                throw new Error(`Failed to update ${field} status.`);
            }
    
            console.log(`${field} status updated successfully.`);
        } catch (error) {
            console.error(`Error updating ${field} status:`, error);
            // Optionally revert UI changes here
        }
    };

    const toggleConfirmationCircle = (gigId) => {
        toggleGigStatus(gigId, 'confirmation_email_sent');
    };

    const toggleChatCircle = (gigId) => {
        toggleGigStatus(gigId, 'chat_created');
    };

    const toggleReviewCircle = (gigId) => {
        toggleGigStatus(gigId, 'review_sent');
    };

    return (
        <div >
            <h2>Upcoming Gigs</h2>

                {filteredGigs.length > 0 ? (
                    <ul>
                        {filteredGigs.map((gig) => (
                            <li key={gig.id} className="gig-card">
                                
                                {/* Gig details */}
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

                                <button onClick={() => handleDeleteGig(gig.id)}>Delete Gig</button>
                            <br />
                            <br />
                                <div className="confirmation-container">
                                   {/* clickable circle for a different status (e.g., chatCreated) */} 
                                    <span
                                        className={`confirmation-circle2 ${gig.chat_created ? 'chatCreated' : 'not-chatCreated'}`}
                                        onClick={() => toggleChatCircle(gig.id)}
                                    ></span>
                                    <span className="confirmation-label">
                                        {gig.chat_created ? 'Chat Created' : 'Chat Not Created'}
                                    </span>
                                    {/* Clickable circle to manually confirm text sent */}
                                    <span
                                        className={`confirmation-circle ${gig.confirmation_email_sent ? 'confirmed' : 'not-confirmed'}`}
                                        onClick={() => toggleConfirmationCircle(gig.id)}
                                    ></span>
                                    <span className="confirmation-label">
                                        {gig.confirmation_email_sent ?  'Confirmation Text Sent' : 'Confirmation Text Not Sent'}
                                    </span>
                                    {/* Clickable circle to manually confirm review link sent */}
                                    <span
                                        className={`confirmation-circle2 ${gig.review_sent ? 'sent' : 'not-sent'}`}
                                        onClick={() => toggleReviewCircle(gig.id)}
                                    ></span>
                                    <span className="confirmation-label">
                                        {gig.review_sent ?  'Review Link Sent' : 'Review Link Not Sent'}
                                    </span>                                   
                                </div>
                            </li>
                        ))}
                    </ul>
                ):(
                <p>No upcoming gigs available</p>
            )}
        </div>
    );
};

export default UpcomingGigs;