import React, { useState, useEffect } from 'react';
import SearchableClientSelect from './SearchableClientSelect';

const ExtraIncome = () => {
    const [clients, setClients] = useState([]);
    const [gigs, setGigs] = useState([]);
    const [clientId, setClientId] = useState('');
    const [gigId, setGigId] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchClientsAndGigs = async () => {
            try {
                const clientsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/clients`);
                const gigsResponse = await fetch(`${process.env.REACT_APP_API_URL}/gigs`);

                if (!clientsResponse.ok || !gigsResponse.ok) {
                    throw new Error('Failed to fetch data');
                }

                const clientsData = await clientsResponse.json();
                const gigsData = await gigsResponse.json();

                setClients(clientsData);
                setGigs(gigsData);
            } catch (error) {
                console.error('Error fetching clients or gigs:', error);
            }
        };

        fetchClientsAndGigs();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
    
        if (!clientId || !amount || !description) {
            alert("Client, amount, and description are required.");
            return;
        }

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/extra-income`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                clientId,
                gigId: gigId ? Number(gigId) : null,  // ✅ empty string -> null
                amount,
                description
                }),

            });

            if (!response.ok) {
                throw new Error('Failed to add extra income');
            }

            setSuccessMessage('Extra income added successfully!');
            setClientId('');
            setGigId('');
            setAmount('');
            setDescription('');

            setTimeout(() => setSuccessMessage(''), 5000);
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred while adding the extra income. Please try again.');
        }
    };

    return (
        <div className="finance-form-workspace manual-income-workspace">
            <h2>Add Income</h2>
            {successMessage && <p>{successMessage}</p>}
            <form onSubmit={handleSubmit}>
                <label>
                    Client:
                    <SearchableClientSelect
                        items={clients}
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        getLabel={(client) => client.full_name}
                        getSearchText={(client) => `${client.full_name || ''} ${client.email || ''}`}
                        placeholder="Select Client"
                        required
                    />
                </label>
                <label>
                    Gig (Optional):
                    <SearchableClientSelect
                        items={gigs}
                        value={gigId}
                        onChange={(e) => setGigId(e.target.value)}
                        getLabel={(gig) => `${gig.client} - ${gig.event_type} (${gig.date})`}
                        placeholder="None"
                        searchPlaceholder="Search clients or events"
                    />
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
                <button type="submit">Add Income</button>
            </form>
        </div>
    );
};

export default ExtraIncome;
