import React, { useEffect, useState } from 'react';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '', category: 'StemwithLyn'});
    const [editClient, setEditClient] = useState(null);
    const [clientHistory, setClientHistory] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 🔍 NEW: search state
    const [searchTerm, setSearchTerm] = useState('');

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
        console.log("Fetching history for client:", clientId);
        fetchClientHistory(clientId);
        setIsModalOpen(true);
    };
    
    const fetchClientHistory = async (clientId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/client-history/${clientId}`);
            const data = await response.json();
            
            console.log("Client History:", data);
            setClientHistory(data);
        } catch (error) {
            console.error("Error fetching client history:", error);
        }
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setClientHistory(null);
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
    
        const isEditing = !!editClient;
        const url = isEditing
            ? `${process.env.REACT_APP_API_URL || "http://localhost:3001"}/api/clients/${editClient.id}`
            : `${process.env.REACT_APP_API_URL || "http://localhost:3001"}/api/clients`;
    
        const method = isEditing ? "PATCH" : "POST";
    
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
            fetchClients();
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

    // 🔍 NEW: filtered clients based on searchTerm
    const filteredClients = clients.filter((client) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            client.full_name?.toLowerCase().includes(term) ||
            client.email?.toLowerCase().includes(term) ||
            client.phone?.toLowerCase().includes(term)
        );
    });

    return (
        <div className="userlist-container">
            <h1>Clients</h1>

            {/* Top bar with Add + Search */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                }}
            >
                <button
                    onClick={() => {
                        setNewClient({ full_name: '', email: '', phone: '' });
                        setShowForm(!showForm);
                        setEditClient(null);
                    }}
                >
                    {showForm ? 'Cancel' : 'Add New Client'}
                </button>

                {/* 🔍 NEW: search input */}
                <input
                    type="text"
                    placeholder="Search by name, email, or phone"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '0.4rem 0.6rem',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        minWidth: '220px',
                    }}
                />
            </div>

            {showForm && (
                <div className="new-client-form">
                    <h2>{editClient ? 'Edit Client' : 'Add New Client'}</h2>
                    <form onSubmit={(e) => { e.preventDefault(); addOrUpdateClient(); }}>
                        <label>Full Name:
                            <input
                                type="text"
                                name="full_name"
                                value={newClient.full_name}
                                onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })}
                                required
                            />
                        </label>
                        <label>Email:
                            <input
                                type="email"
                                name="email"
                                value={newClient.email}
                                onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                            />
                        </label>
                        <label>Phone:
                            <input
                                type="tel"
                                name="phone"
                                value={newClient.phone}
                                onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                            />
                        </label>
                        <button type="submit">{editClient ? 'Update' : 'Save'}</button>
                    </form>
                </div>
            )}

            {filteredClients.length > 0 ? (
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
                        {filteredClients.map((client) => (
                            <tr key={client.id}>
                                <td>
                                    <button
                                        onClick={() => openClientHistory(client.id)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'white',
                                            textDecoration: 'underline',
                                            cursor: 'pointer',
                                            padding: 0,
                                        }}
                                    >
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
                <p>{clients.length === 0 ? 'No clients available yet.' : 'No clients match your search.'}</p>
            )}

            {/* Modal for client history */}
            {isModalOpen && (
                <>
                    {clientHistory && clientHistory.client ? (
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
                        // Only show "Loading..." if modal is open but history not loaded yet
                        <div className="modal-overlay" onClick={closeModal}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <button className="modal-close" onClick={closeModal}>X</button>
                                <div>Loading...</div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Clients;
