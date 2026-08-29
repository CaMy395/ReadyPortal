import React, { useEffect, useState } from 'react';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [newClient, setNewClient] = useState({ full_name: '', email: '', phone: '', category: 'StemwithLyn'});
    const [editClient, setEditClient] = useState(null);
    const [clientHistory, setClientHistory] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [historyError, setHistoryError] = useState('');

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
        setClientHistory(null);
        setHistoryError('');
        setIsModalOpen(true);
        fetchClientHistory(clientId);
    };
    
    const fetchClientHistory = async (clientId) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/client-history/${clientId}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to load client details');

            const generalPaymentsTotal = (data.payments || []).reduce(
                (sum, payment) => sum + Number(payment.amount || 0), 0
            );
            const quotePaymentsTotal = (data.quotes || []).reduce(
                (sum, quote) => sum + Number(quote.amount_paid || 0), 0
            );
            const quoteTotal = (data.quotes || []).reduce(
                (sum, quote) => sum + Number(quote.total_amount || 0), 0
            );
            const outstandingBalance = (data.quotes || []).reduce(
                (sum, quote) => sum + Number(quote.balance_due || 0), 0
            );
            const gigRecordedPayments = (data.gigs || []).reduce(
                (sum, gig) => sum + Number(gig.client_payment || 0), 0
            );

            setClientHistory({
                ...data,
                summary: {
                    totalReceived: generalPaymentsTotal + quotePaymentsTotal,
                    generalPaymentsTotal,
                    quotePaymentsTotal,
                    quoteTotal,
                    outstandingBalance,
                    gigRecordedPayments,
                },
            });
        } catch (error) {
            console.error("Error fetching client history:", error);
            setHistoryError(error.message || 'Failed to load client details');
        }
    };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setClientHistory(null);
        setHistoryError('');
    };

    const formatDate = (value) => value
        ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString()
        : 'Not recorded';

    const formatMoney = (value) => Number(value || 0).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });

    useEffect(() => {
        fetchClients();
    }, []);

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
    const filteredClients = clients
    .filter((client) => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
            client.full_name?.toLowerCase().includes(term) ||
            client.email?.toLowerCase().includes(term) ||
            client.phone?.toLowerCase().includes(term)
        );
    })
    .sort((a, b) => {
        const nameA = (a.full_name || '').toLowerCase();
        const nameB = (b.full_name || '').toLowerCase();
        return nameA.localeCompare(nameB);
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

                                <div className="client-history-contact">
                                    <p><strong>Client ID:</strong> {clientHistory.client.id}</p>
                                    <p><strong>Email:</strong> {clientHistory.client.email || 'Not recorded'}</p>
                                    <p><strong>Phone:</strong> {clientHistory.client.phone || 'Not recorded'}</p>
                                    <p><strong>SMS consent:</strong> {clientHistory.client.sms_opt_in ? 'Opted in' : 'Not opted in'}</p>
                                </div>

                                <div className="client-history-summary">
                                    <div><span>Total received</span><strong>{formatMoney(clientHistory.summary.totalReceived)}</strong><small>Quote + standalone payments</small></div>
                                    <div><span>Outstanding quotes</span><strong>{formatMoney(clientHistory.summary.outstandingBalance)}</strong><small>Current quote balances</small></div>
                                    <div><span>Gigs</span><strong>{clientHistory.gigs.length}</strong><small>{formatMoney(clientHistory.summary.gigRecordedPayments)} recorded on gigs</small></div>
                                    <div><span>Appointments</span><strong>{clientHistory.appointments.length}</strong><small>{clientHistory.quotes.length} quotes total</small></div>
                                </div>

                                <p className="client-history-accounting-note">
                                    Total received counts linked quote payments and standalone general-payment records. Gig-recorded amounts are displayed separately to prevent double-counting.
                                </p>

                                <details className="client-history-section" open>
                                    <summary>Gigs <span>{clientHistory.gigs.length}</span></summary>
                                    <div className="client-history-list">
                                {clientHistory.gigs?.length ? <ul>
                                    {clientHistory.gigs.map((gig) => (
                                        <li key={gig.id}>
                                            <strong>{gig.event_type || 'Gig'} #{gig.id}</strong> on {formatDate(gig.date)}
                                            {gig.time ? ` at ${String(gig.time).slice(0, 5)}` : ''}
                                            {gig.location ? ` — ${gig.location}` : ''}
                                            <br />
                                            Staffing: {Array.isArray(gig.claimed_by) ? gig.claimed_by.length : 0} of {Number(gig.staff_needed || 0)} claimed
                                            {' · '}Payment status: {gig.paid ? 'Paid in full' : 'Not marked paid'}
                                            {gig.client_payment != null ? ` · Recorded payment: ${formatMoney(gig.client_payment)}` : ''}
                                        </li>
                                    ))}
                                </ul> : <p>No matching gigs found.</p>}
                                    </div>
                                </details>

                                <details className="client-history-section">
                                    <summary>Quotes <span>{clientHistory.quotes.length}</span></summary>
                                    <div className="client-history-list">
                                {clientHistory.quotes?.length ? <ul>
                                    {clientHistory.quotes.map((quote) => (
                                        <li key={quote.id}>
                                            <strong>Quote {quote.quote_number || `#${quote.id}`}</strong> dated {formatDate(quote.date)}
                                            {' · '}Total: {formatMoney(quote.total_amount)}
                                            {' · '}Paid: {formatMoney(quote.amount_paid)}
                                            {' · '}Balance: {formatMoney(quote.balance_due)}
                                            {' · '}Status: {quote.status || 'Not recorded'}
                                        </li>
                                    ))}
                                </ul> : <p>No quotes found.</p>}
                                    </div>
                                </details>

                                <details className="client-history-section">
                                    <summary>Standalone payments <span>{clientHistory.payments.length}</span></summary>
                                    <div className="client-history-list">
                                    <p><strong>Standalone payment total: {formatMoney(clientHistory.summary.generalPaymentsTotal)}</strong></p>
                                {clientHistory.payments?.length ? <ul>
                                    {clientHistory.payments.map((payment) => (
                                        <li key={payment.id}>
                                            {formatMoney(payment.amount)} on {formatDate(payment.created_at)}
                                            {' · '}{payment.status || 'Status not recorded'}
                                            {payment.description ? ` · ${payment.description}` : ''}
                                        </li>
                                    ))}
                                </ul> : <p>No standalone payment records found.</p>}
                                    </div>
                                </details>

                                <details className="client-history-section">
                                    <summary>Appointments <span>{clientHistory.appointments.length}</span></summary>
                                    <div className="client-history-list">
                                {clientHistory.appointments?.length ? <ul>
                                    {clientHistory.appointments.map((appointment) => (
                                        <li key={appointment.id}>
                                            <strong>{appointment.title || 'Appointment'} #{appointment.id}</strong> on {formatDate(appointment.date)}
                                            {appointment.time ? ` at ${String(appointment.time).slice(0, 5)}` : ''}
                                            {' · '}{appointment.status || 'Status not recorded'}
                                            {' · '}{appointment.paid ? 'Paid' : 'Not marked paid'}
                                            {appointment.total_cost != null || appointment.price != null
                                                ? ` · Total: ${formatMoney(appointment.total_cost ?? appointment.price)}`
                                                : ''}
                                            {appointment.description ? <><br />{appointment.description}</> : null}
                                        </li>
                                    ))}
                                </ul> : <p>No appointments found.</p>}
                                    </div>
                                </details>
                            </div>
                        </div>
                    ) : historyError ? (
                        <div className="modal-overlay" onClick={closeModal}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <button className="modal-close" onClick={closeModal}>X</button>
                                <div>{historyError}</div>
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
