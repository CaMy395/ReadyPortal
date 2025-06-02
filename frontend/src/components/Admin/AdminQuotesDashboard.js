import React, { useEffect, useState } from 'react';

const AdminQuotesDashboard = () => {
  const [quotes, setQuotes] = useState([]);
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${apiUrl}/api/quotes`)
      .then(res => res.json())
      .then(data => setQuotes(data))
      .catch(err => console.error('Error fetching quotes:', err));
  }, [apiUrl]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await fetch(`${apiUrl}/api/quotes/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      setQuotes(prev =>
        prev.map(q => (q.id === id ? { ...q, status: newStatus } : q))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this quote?')) return;
    try {
      await fetch(`${apiUrl}/api/quotes/${id}`, { method: 'DELETE' });
      setQuotes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Failed to delete quote:', err);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>All Quotes</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>Quote #</th>
            <th>Client</th>
            <th>Event Date</th>
            <th>Event Time</th>
            <th>Balance</th>
            <th>Location</th>
            <th>Organization</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map(quote => (
            <tr key={quote.id} style={{ borderBottom: '1px solid #ccc' }}>
              <td>{quote.quote_number}</td>
              <td>{quote.client_name || 'Unknown'}</td>
              <td>{quote.event_date || 'N/A'}</td>
              <td>{quote.event_time || 'N/A'}</td>
              <td>{quote.total_amount || 'N/A'}</td>             
              <td>{quote.location || 'N/A'}</td>
              <td>{quote.bill_to_organization || '—'}</td>
              <td>
                <select
                  value={quote.status || 'Pending'}
                  onChange={(e) => handleStatusChange(quote.id, e.target.value)}
                >
                  <option value="Pending">Pending</option>
                  <option value="Deposit Paid">Deposit Paid</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Confirmed">Confirmed</option>
                </select>
              </td>
              <td>
                <button onClick={() => handleDelete(quote.id)}>🗑 Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminQuotesDashboard;
