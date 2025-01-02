import React, { useEffect, useState } from 'react';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [error, setError] = useState('');

    const fetchClients = async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/clients`);
            if (response.ok) {
                const data = await response.json();
                setClients(data);
            } else {
                throw new Error('Failed to fetch clients');
            }
        } catch (error) {
            console.error('Error fetching clients:', error);
            setError('Could not fetch clients. Please try again later.');
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    return (
        <div className="userlist-container">
            <h1>Clients</h1>
            {error && <p className="error-message">{error}</p>}
            {clients.length > 0 ? (
                <table className="userlist-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map((client) => (
                            <tr key={client.id}>
                                <td>{client.full_name}</td>
                                <td>{client.email}</td>
                                <td>{client.phone}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No clients available yet.</p>
            )}
        </div>
    );
};

export default Clients;
