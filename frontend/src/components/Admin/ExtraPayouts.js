import React, { useState, useEffect } from 'react';

const ExtraPayouts = () => {
    const [users, setUsers] = useState([]);
    const [gigs, setGigs] = useState([]);
    const [userId, setUserId] = useState('');
    const [gigId, setGigId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch users and gigs on component mount
    useEffect(() => {
        const fetchUsersAndGigs = async () => {
            try {
                const usersResponse = await fetch(`${process.env.REACT_APP_API_URL}/users`);
                const gigsResponse = await fetch(`${process.env.REACT_APP_API_URL}/gigs`);

                if (!usersResponse.ok || !gigsResponse.ok) {
                    throw new Error('Failed to fetch data');
                }

                const usersData = await usersResponse.json();
                const gigsData = await gigsResponse.json();

                setUsers(usersData);
                setGigs(gigsData);
            } catch (error) {
                console.error('Error fetching users or gigs:', error);
            }
        };

        fetchUsersAndGigs();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
    
        if (!userId || !gigId || !amount || !description) {
            alert("All fields are required.");
            return;
        }
    
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/extra-payouts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId, gigId, amount, description }),
            });
    
            if (!response.ok) {
                throw new Error('Failed to add extra payout');
            }
    
            const data = await response.json();
            console.log('Extra payout added:', data);
    
            // Set the success message and clear the form fields
            setSuccessMessage('Extra payout added successfully!');
            setUserId('');
            setGigId('');
            setAmount('');
            setDescription('');
    
            // Clear the success message after 5 seconds
            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the extra payout. Please try again.');
        }
    };
    
    

    return (
        <div>
            <h2>Add Extra Payout</h2>
            {successMessage && <p>{successMessage}</p>}
            <form onSubmit={handleSubmit}>
                <label>
                    User:
                    <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
                        <option value="">Select User</option>
                        {users.map((user) => (
                            <option key={user.id} value={user.id}>
                                {user.name}
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Gig (Optional):
                    <select value={gigId} onChange={(e) => setGigId(e.target.value)} >
                        <option value="">Select Gig</option>
                        {gigs.map((gig) => (
                            <option key={gig.id} value={gig.id}>
                                {gig.client} - {gig.event_type} ({gig.date})
                            </option>
                        ))}
                    </select>
                </label>
                <label>
                    Amount:
                    <input
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                </label>
                <label>
                    Description:
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                    />
                </label>
                <button type="submit">Add Payout</button>
            </form>
        </div>
    );
};

export default ExtraPayouts;
