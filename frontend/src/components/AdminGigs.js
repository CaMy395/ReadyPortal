// src/components/AdminGigs.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import UserList from './UserList'; // Import UserList component
import { Link, Route, Routes } from 'react-router-dom';
import GigAttendance from './GigAttendance';
import YourGigs from './YourGigs';


const AdminGigs = () => {
    const [newGig, setNewGig] = useState({
        client: '',
        event_type: '',
        date: '',
        time: '',
        duration: '',
        location: '',
        position: '',
        gender: '',
        pay: '',
        confirmed: false,
        needs_cert: false,
        staff_needed: '',
        claimed_by: '',
        backup_needed: '',
        backup_claimed_by: ''
    });

    const [users, setUsers] = useState([]); // State to store users
    const [gigs, setGigs] = useState([]); // State to store gigs
    const username = localStorage.getItem('username'); // Fetch the username from localStorage
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    //const [claimedGigs, setClaimedGigs] = useState([]);
    
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
            
            // Set claimed gigs for the current user including backup gigs
            /*const userClaimedGigs = data.filter(gig => 
                gig.claimed_by.includes(username) || gig.backup_claimed_by.includes(username)
            );*/
           // setClaimedGigs(userClaimedGigs);
        } catch (error) {
            console.error('Error fetching gigs:', error);
        }
    }, [apiUrl]);
    
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${apiUrl}/users`);
                if (response.ok) {
                    const data = await response.json();
                    setUsers(data);
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
            // Update claimed gigs state
            /*setClaimedGigs(prevGigs =>
                action === 'claim'
                    ? [...prevGigs, updatedGig]
                    : prevGigs.filter(gig => gig.id !== gigId)
            );*/
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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewGig(prevGig => ({
            ...prevGig,
            [name]: name === 'needs_cert' || name === 'confirmed' ? value === 'Yes' : value
        }));
    };
    
    

    const handleSubmit = async (event) => {
        event.preventDefault();

        // Construct the gig data object from the current state
        const gigData = {
            client: newGig.client,
            event_type: newGig.event_type,
            date: newGig.date,
            time: newGig.time,
            duration: newGig.duration,
            location: newGig.location,
            position: newGig.position,
            gender: newGig.gender,
            pay: newGig.pay,
            needs_cert: newGig.needs_cert ?? false,
            confirmed: newGig.confirmed ?? false,
            staff_needed: newGig.staff_needed,
            claimed_by: newGig.claimed_by ? [newGig.claimed_by] : [],
            backup_needed: newGig.backup_needed,
            backup_claimed_by: newGig.backup_claimed_by ? [newGig.backup_claimed_by] : []
        };

        console.log('Gig Data:', gigData); // Log the gig data being sent
        
        try {
            const response = await fetch(`${apiUrl}/gigs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gigData),
            });

            if (!response.ok) {
                const errorText = await response.text(); // Get the error message from the response
                throw new Error(`Failed to add gig. Status: ${response.status}, Message: ${errorText}`);
            }
                const newGigResponse = await response.json();
                // Update the gigs state with the new gig
                setGigs((prevGigs) => [...prevGigs, newGigResponse]);
                console.log('New gig added:', newGigResponse);

                // Show success alert
                alert("Gig added successfully!");
                
                // Fetch the updated gigs list from the server
                await fetchGigs();
            } catch (error) {
                console.error('Error adding gig:', error);
            }
        };

    
    const handleDeleteGig = async (gigId) => {
        
        try {
            const response = await fetch(`${apiUrl}/gigs/${gigId}`, {
                method: 'DELETE',
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to delete gig. Status: ${response.status}, Message: ${errorText}`);
            }
    
            // Remove the gig from the state
            setGigs((prevGigs) => prevGigs.filter((gig) => gig.id !== gigId));
            console.log('Gig deleted:', gigId);
            // Update upcomingClaimedGigs if it contains the deleted gig
            //setClaimedGigs((prevClaimedGigs) => prevClaimedGigs.filter((gig) => gig.id !== gigId));
            
        } catch (error) {
            console.error('Error deleting gig:', error);
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
    

    // Toggle the local confirmation status
    const toggleConfirmationCircle = (gigId) => {
        setGigs((prevGigs) =>
        prevGigs.map((gig) =>
            gig.id === gigId
            ? { ...gig, confirmation_email_sent: !gig.confirmation_email_sent }
            : gig
        )
        );
    };
    // Function to toggle the "reviewed" status
    const toggleChatCircle = (gigId) => {
        setGigs((prevGigs) =>
            prevGigs.map((gig) =>
                gig.id === gigId
                    ? { ...gig, chatCreated: !gig.chatCreated }
                    : gig
            )
        );
    };

    // Function to toggle the "reviewed" status
    const togglePaidCircle = (gigId) => {
        setGigs((prevGigs) =>
            prevGigs.map((gig) =>
                gig.id === gigId
                    ? { ...gig, paid: !gig.paid }
                    : gig
            )
        );
    };

    return (
        <div className="user-gigs-container">
             <h1>Admin Dashboard</h1>
            <p>Welcome to the Admin Dashboard. Select an option above to view more details.</p>
            {/* Navigation menu */}
            <nav>
                <ul>
                    <li>
                        <Link to="/admin/your-gigs">Your Gigs</Link> |
                        <Link to="/admin/attendance"> Gig Attendance</Link>
                    </li>
                </ul>
            </nav>

            
            {/* Define routes within AdminGigs for each section */}
            <Routes>
                <Route path="attendance" element={<GigAttendance />} />
                <Route path="your-gigs" element={<YourGigs />} />
            </Routes>

            <h2>Admin Gigs Page</h2>
            <form onSubmit={handleSubmit}>
                {/* Form fields go here, unchanged */}
                <label>
                    <strong>Client: </strong>
                    <input type="text" name="client" value={newGig.client} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Event Type: </strong>
                    <input type="text" name="event_type" value={newGig.event_type} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Date: </strong>
                    <input type="date" name="date" value={newGig.date} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Time: </strong>
                    <input type="time" name="time" value={newGig.time} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Duration: </strong>
                    <input type="number" name="duration" value={newGig.duration} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Location: </strong>
                    <input type="text" name="location" value={newGig.location} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Position: </strong>
                    <input type="text" name="position" value={newGig.position} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Gender: </strong>
                    <input type="text" name="gender" value={newGig.gender} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Pay: </strong>
                    <input type="number" name="pay" value={newGig.pay} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Needs Certification: </strong> 
                    <select name="needs_cert" value={newGig.needs_cert ? 'Yes' : 'No'} onChange={handleChange} required>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>                
                </label>
                <br />
                <label>
                    <strong>Confirmed: </strong> 
                    <select name="confirmed" value={newGig.confirmed ? 'Yes' : 'No'} onChange={handleChange} required>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                    </select>                
                </label>
                <br />
                <label>
                    <strong>Staff Needed: </strong>
                    <input type="number" name="staff_needed" value={newGig.staff_needed} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Backup Needed: </strong>
                    <input type="number" name="backup_needed" value={newGig.backup_needed} onChange={handleChange} required />
                </label>
                <br />
                <label>
                    <strong>Claimed By: </strong>
                    <select name="claimed_by" value={newGig.claimed_by} onChange={handleChange}>
                        <option value="">Select User</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.username}>{user.username}</option> // Use appropriate user identifier
                        ))}
                    </select>
                </label>
                <br />
                <label>
                <strong>Backup Claimed By: </strong>
                    <select name="backup_claimed_by" value={newGig.backup_claimed_by} onChange={handleChange}>
                        <option value="">Select User</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.username}>{user.username}</option> // Use appropriate user identifier
                        ))}
                    </select>
                </label>
                <br />
                <button type="submit">Add New Gig</button>
            </form>

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
                                {/* Clickable circle to manually confirm email sent */}
                                <span
                                    className={`confirmation-circle ${gig.confirmation_email_sent ? 'confirmed' : 'not-confirmed'}`}
                                    onClick={() => toggleConfirmationCircle(gig.id)}
                                ></span>
                                {/* Label text */}
                                <span className="confirmation-label">
                                    {gig.confirmation_email_sent ?  'Confirmation Email Sent' : 'Confirmation Email Not Sent'}
                                </span>
                                <br />
                                <br />
                                {/* Second clickable circle for a different status (e.g., Reviewed) */}
                                <span
                                    className={`confirmation-circle2 ${gig.chatCreated ? 'chatCreated' : 'not-chatCreated'}`}
                                    onClick={() => toggleChatCircle(gig.id)}
                                ></span>
                                <span className="confirmation-label">
                                    {gig.chatCreated ? 'Chat Created' : 'Chat Not Created'}
                                </span>
                                <br />
                                <br />
                                {/* Third clickable circle for a different status (e.g., Reviewed) */}
                                <span
                                    className={`confirmation-circle3 ${gig.paid ? 'paid' : 'not-paid'}`}
                                    onClick={() => togglePaidCircle(gig.id)}
                                ></span>
                                <span className="confirmation-label">
                                    {gig.paid ? 'Staff Paid' : 'Staff Not Paid'}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            ):(
              <p>No upcoming gigs available</p>
            )}

            
            {/* Include UserList component for displaying users */}
            <UserList users={users} />
        </div>
    );
};

export default AdminGigs;
