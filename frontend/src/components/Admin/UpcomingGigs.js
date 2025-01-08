import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';


const UpcomingGigs = () => {

    const [gigs, setGigs] = useState([]); // State to store gigs
    const username = localStorage.getItem('username'); // Fetch the username from localStorage
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const [editingGigId, setEditingGigId] = useState(null); // Track which gig is being edited
    const [editingGig, setEditingGig] = useState(null); // Store the gig details during editing

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
            const response = await fetch(`${apiUrl}/gigs/${gigId}`, {
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
    
    const toggleChatCircle = async (gigId) => {
        try {
            const gig = gigs.find((g) => g.id === gigId);
            const newStatus = !gig.chat_created;
    
            const response = await axios.patch(`${apiUrl}/gigs/${gigId}/chat-created`, {
                chat_created: newStatus,
            });
    
            if (response.status === 200) {
                setGigs((prevGigs) =>
                    prevGigs.map((gig) =>
                        gig.id === gigId ? { ...gig, chat_created: newStatus } : gig
                    )
                );
            }
        } catch (error) {
            console.error('Error updating chat_created status:', error);
            alert('Failed to update chat_created status.');
        }
    };
    
    const toggleReviewCircle = async (gigId) => {
        try {
            const gig = gigs.find((g) => g.id === gigId);
            const newStatus = !gig.review_sent;
    
            const response = await axios.patch(`${apiUrl}/gigs/${gigId}/review-sent`, {
                review_sent: newStatus,
            });
    
            if (response.status === 200) {
                setGigs((prevGigs) =>
                    prevGigs.map((gig) =>
                        gig.id === gigId ? { ...gig, review_sent: newStatus } : gig
                    )
                );
            }
        } catch (error) {
            console.error('Error updating review_sent status:', error);
            alert('Failed to update review_sent status.');
        }
    };    

    const handleEditClick = (gig) => {
        setEditingGigId(gig.id);
        setEditingGig({ ...gig }); // Create a copy of the gig to edit
    };

    const handleInputChange = (field, value) => {
        setEditingGig((prevGig) => ({ ...prevGig, [field]: value }));
    };

    const handleSave = async () => {
        try {
            const response = await fetch(`${apiUrl}/gigs/${editingGigId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingGig),
            });

            if (!response.ok) {
                throw new Error('Failed to update gig');
            }

            const updatedGig = await response.json();
            setGigs((prevGigs) =>
                prevGigs.map((gig) => (gig.id === editingGigId ? updatedGig : gig))
            );
            setEditingGigId(null); // Exit edit mode
            alert('Gig updated successfully!');
        } catch (error) {
            console.error('Error updating gig:', error);
            alert('Failed to update gig. Please try again.');
        }
    };

    const handleCancel = () => {
        setEditingGigId(null); // Exit edit mode
    };

    return (
        <div>
            <h2>Upcoming Gigs</h2>
    
            {filteredGigs.length > 0 ? (
                <ul>
                    {filteredGigs.map((gig) => (
                        <li key={gig.id} className="gig-card">
                               <div className="gig-card-header">
                                    <button className="edit-button" onClick={() => handleEditClick(gig)}>
                                        Edit
                                    </button>
                                </div>
                            {editingGigId === gig.id ? (
                                <div>
                                    {/* Editable fields */}
                                    <label>
                                        Client:
                                        <input
                                            type="text"
                                            value={editingGig.client}
                                            onChange={(e) =>
                                                handleInputChange('client', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Event Type:
                                        <input
                                            type="text"
                                            value={editingGig.event_type}
                                            onChange={(e) =>
                                                handleInputChange('event_type', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Date:
                                        <input
                                            type="date"
                                            value={editingGig.date}
                                            onChange={(e) =>
                                                handleInputChange('date', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Time:
                                        <input
                                            type="time"
                                            value={editingGig.time}
                                            onChange={(e) =>
                                                handleInputChange('time', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Duration:
                                        <input
                                            type="number"
                                            value={editingGig.duration}
                                            onChange={(e) =>
                                                handleInputChange('duration', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Location:
                                        <input
                                            type="text"
                                            value={editingGig.location}
                                            onChange={(e) =>
                                                handleInputChange('location', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Position:
                                        <input
                                            type="text"
                                            value={editingGig.position}
                                            onChange={(e) =>
                                                handleInputChange('position', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Gender:
                                        <input
                                            type="text"
                                            value={editingGig.gender}
                                            onChange={(e) =>
                                                handleInputChange('gender', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Pay:
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={editingGig.pay}
                                            onChange={(e) =>
                                                handleInputChange('pay', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Claimed By:
                                        <input
                                            type="text"
                                            value={editingGig.claimed_by.join(', ')}
                                            onChange={(e) =>
                                                handleInputChange(
                                                    'claimed_by',
                                                    e.target.value.split(',').map((item) => item.trim())
                                                )
                                            }
                                        />
                                    </label>
                                    <label>
                                        Staff Needed:
                                        <input
                                            type="number"
                                            value={editingGig.staff_needed}
                                            onChange={(e) =>
                                                handleInputChange('staff_needed', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Backup Needed:
                                        <input
                                            type="number"
                                            value={editingGig.backup_needed}
                                            onChange={(e) =>
                                                handleInputChange('backup_needed', e.target.value)
                                            }
                                        />
                                    </label>
                                    <label>
                                        Backup Claimed By:
                                        <input
                                            type="text"
                                            value={editingGig.backup_claimed_by.join(', ')}
                                            onChange={(e) =>
                                                handleInputChange(
                                                    'backup_claimed_by',
                                                    e.target.value.split(',').map((item) => item.trim())
                                                )
                                            }
                                        />
                                    </label>
                                    <label>
                                        Confirmed:
                                        <select
                                            value={editingGig.confirmed ? 'Yes' : 'No'}
                                            onChange={(e) =>
                                                handleInputChange(
                                                    'confirmed',
                                                    e.target.value === 'Yes'
                                                )
                                            }
                                        >
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </label>
    
                                    <button onClick={handleSave}>Save</button>
                                    <button onClick={handleCancel}>Cancel</button>
                                </div>
                            ) : (
                                <div>
                                    {/* Display gig details */}
                                    <h3>Client Name: {gig.client}</h3>
                                    <strong>Event Type:</strong> {gig.event_type} <br />
                                    <strong>Date:</strong> {formatDate(gig.date)} <br />
                                    <strong>Time:</strong> {formatTime(gig.time)} <br />
                                    <strong>Duration:</strong> {gig.duration} <br />
                                    <strong>Location: </strong>
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                            gig.location
                                        )}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="location-link"
                                    >
                                        {gig.location}
                                    </a>
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
                                    <strong>Pay:</strong> ${gig.pay}/hr + tips <br />
                                    <strong>Client Payment:</strong> ${gig.client_payment} <br />
                                    <strong>Client Payment Method:</strong> {gig.payment_method} <br />
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
                                        onClick={() =>
                                            toggleClaimGig(
                                                gig.id,
                                                gig.claimed_by?.includes(username)
                                            )
                                        }
                                    >
                                        {gig.claimed_by?.includes(username)
                                            ? 'Unclaim Gig'
                                            : 'Claim Gig'}
                                    </button>
    
                                    <button
                                        className="backup-button"
                                        onClick={() =>
                                            toggleClaimBackup(
                                                gig.id,
                                                gig.backup_claimed_by?.includes(username)
                                            )
                                        }
                                    >
                                        {gig.backup_claimed_by?.includes(username)
                                            ? 'Unclaim Backup Gig'
                                            : 'Claim Backup Gig'}
                                    </button>
    
                                    <button onClick={() => handleDeleteGig(gig.id)}>Delete Gig</button>
                                    <br />
                                    <br />
    
                                    <div className="confirmation-container">
                                        <span
                                            className={`confirmation-circle2 ${
                                                gig.chat_created ? 'chatCreated' : 'not-chatCreated'
                                            }`}
                                            onClick={() => toggleChatCircle(gig.id)}
                                        ></span>
                                        <span className="confirmation-label">
                                            {gig.chat_created
                                                ? 'Chat Created'
                                                : 'Chat Not Created'}
                                        </span>
                                        <span
                                            className={`confirmation-circle3 ${
                                                gig.review_sent ? 'sent' : 'not-sent'
                                            }`}
                                            onClick={() => toggleReviewCircle(gig.id)}
                                        ></span>
                                        <span className="confirmation-label">
                                            {gig.review_sent
                                                ? 'Review Link Sent'
                                                : 'Review Link Not Sent'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No upcoming gigs available</p>
            )}
        </div>
    );
        
}
export default UpcomingGigs;