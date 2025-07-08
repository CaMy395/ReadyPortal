import React, { useEffect, useState } from 'react';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '', category: 'StemwithLyn'});
    const [editClient, setEditClient] = useState(null);
    const [clientHistory, setClientHistory] = useState(null); // State for client history
    const [isModalOpen, setIsModalOpen] = useState(false); // State for modal visibility

    // Fetch clients from the API
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
        }
    };

    const openClientHistory = (clientId) => {
        console.log("Fetching history for client:", clientId);  // Log to verify clientId
        fetchClientHistory(clientId);  // Pass clientId to fetch function
        setIsModalOpen(true);  // Open the modal
    };
    
    const fetchClientHistory = async (clientId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/client-history/${clientId}`);
            const data = await response.json();
            
            console.log("Client History:", data);  // Log the fetched data
    
            setClientHistory(data);  // Set the data to display in the modal
        } catch (error) {
            console.error("Error fetching client history:", error);
        }
    };
    
    // Close the modal
    const closeModal = () => {
        setIsModalOpen(false);
        setClientHistory(null); // Clear client history when the modal closes
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setNewClient((prev) => ({ ...prev, [name]: value }));
    };

    const addOrUpdateClient = async () => {
        const clientData = {
            full_name: newClient.full_name,
            email: newClient.email,
            phone: newClient.phone,
        };
    
        const isEditing = !!editClient; // Check if editing an existing client
        const url = isEditing
            ? `${process.env.REACT_APP_API_URL || "http://localhost:3001"}/api/clients/${editClient.id}`
            : `${process.env.REACT_APP_API_URL || "http://localhost:3001"}/api/clients`;
    
        const method = isEditing ? "PATCH" : "POST"; // Use PATCH for updates, POST for new clients
    
        console.log(`Sending ${method} request to:`, url);
        console.log("Client Data Being Sent:", clientData);
    
        try {
            const response = await fetch(url, {
                method: method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(clientData),
            });
    
            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(`Failed to ${isEditing ? "update" : "add"} client: ${errorMessage}`);
            }
    
            console.log(`✅ Client ${isEditing ? "updated" : "added"} successfully!`);
            fetchClients(); // Refresh the client list
            setShowForm(false);
            setNewClient({ full_name: "", email: "", phone: "" });
            setEditClient(null);
        } catch (error) {
            console.error(`❌ Error ${isEditing ? "updating" : "adding"} client:`, error);
        }
    };

    const handleEdit = (client) => {
        setNewClient(client);
        setEditClient(client);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this client?")) return;

        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/clients/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setClients(clients.filter((client) => client.id !== id));
            } else {
                throw new Error('Failed to delete client');
            }
        } catch (error) {
            console.error('Error deleting client:', error);
        }
    };

     return (
        <div className="userlist-container">
            <h1>Clients</h1>
            <button
                onClick={() => {
                    setNewClient({ full_name: '', email: '', phone: ''});
                    setShowForm(!showForm);
                    setEditClient(null);
                }}
            >
                {showForm ? 'Cancel' : 'Add New Client'}
            </button>

            {showForm && (
                <div className="new-client-form">
                    <h2>{editClient ? 'Edit Client' : 'Add New Client'}</h2>
                    <form onSubmit={(e) => { e.preventDefault(); addOrUpdateClient(); }}>
                        <label>Full Name:
                            <input type="text" name="full_name" value={newClient.full_name} onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })} required />
                        </label>
                        <label>Email:
                            <input type="email" name="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                        </label>
                        <label>Phone:
                            <input type="tel" name="phone" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                        </label>
                        <button type="submit">{editClient ? 'Update' : 'Save'}</button>
                    </form>
                </div>
            )}

            {clients.length > 0 ? (
                <table className="userlist-table">
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Email</th>
                            <th>Phone</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map((client) => (
                            <tr key={client.id}>
                                <td>
                                <button onClick={() => openClientHistory(client.id)} style={{ background: 'none', border: 'none', color: 'white', textDecoration: 'underline', cursor: 'pointer' }}>
                                    {client.full_name}
                                </button>
                                </td>
                                <td>{client.email}</td>
                                <td>{client.phone}</td>
                                <td>
                                    <button onClick={() => handleEdit(client)}>Edit</button>
                                    <button onClick={() => handleDelete(client.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            ) : (
                <p>No clients available yet.</p>
            )}

            {/* Modal for client history */}
            {isModalOpen && clientHistory && clientHistory.client ? (
    <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>X</button>
            <h2>{clientHistory.client.full_name} - History</h2>

            <h3>Gigs</h3>
            <ul>
                {clientHistory.gigs?.map((gig) => (
                    <li key={gig.id}>
                        {gig.event_type} on {gig.date} - Total Paid: {gig.total_paid}
                    </li>
                ))}
            </ul>

            <h3>Quotes</h3>
            <ul>
                {clientHistory.quotes?.map((quote) => (
                    <li key={quote.id}>
                        Quote for {quote.date} - Total Amount: {quote.total_amount} - Status: {quote.status}
                    </li>
                ))}
            </ul>

            <h3>Payments</h3>
            <ul>
                {clientHistory.payments?.map((payment) => (
                    <li key={payment.id}>
                        Payment of {payment.amount} on {payment.created_at}
                    </li>
                ))}
            </ul>

            <h3>Appointments</h3>
            <ul>
                {clientHistory.appointments?.map((appointment) => (
                    <li key={appointment.id}>
                        {appointment.title} on {appointment.date} at {appointment.time} - {appointment.description}
                    </li>
                ))}
            </ul>
        </div>
    </div>
) : (
    <div>Loading...</div>  // Display loading message if data is not yet loaded
)}

        </div>
    );
};

export default Clients;
