// src/components/AdminGigs.js
import React, { useState, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import GigAttendance from './GigAttendance';
import AdminsGigs from './AdminsGigs';


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
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

 
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await fetch(`${apiUrl}/users`);
                if (!response.ok) throw new Error('Failed to fetch users');
                const data = await response.json();
                setUsers(data); // Populate users state
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, [apiUrl]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewGig(prevGig => ({
            ...prevGig,
            [name]: name === 'needs_cert' || name === 'confirmed' ? value === 'Yes' : value
        }));
    };
    
    

    const handleSubmit = async (event) => {
        event.preventDefault();
    
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
            backup_claimed_by: newGig.backup_claimed_by ? [newGig.backup_claimed_by] : [],
        };
    
        try {
            const response = await fetch(`${apiUrl}/gigs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gigData),
            });
    
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to add gig. Status: ${response.status}, Message: ${errorText}`);
            }
    
            const newGigResponse = await response.json();

            console.log('New gig added:', newGigResponse);
    
            // Show success alert
            alert('Gig added successfully!');
    
            // Reset the form state after submission
            setNewGig({
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
                backup_claimed_by: '',
            });
        } catch (error) {
            console.error('Error adding gig:', error);
        }
    };
    

    return (
        <div >
             <h1>Admin Dashboard</h1>
            <p>Add a new gig below.</p>
          
            {/* Define routes within AdminGigs for each section */}
            <Routes>
                <Route path="attendance" element={<GigAttendance />} />
                <Route path="admins-gigs" element={<AdminsGigs />} />
            </Routes>


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

        </div>
    );
};

export default AdminGigs;
