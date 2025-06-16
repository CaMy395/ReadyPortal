import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const ClientQuoteGroup = ({ client, quotes, onInputChange, onUpdate, onDelete, onSendQuote }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = () => setIsOpen(prev => !prev);

  return (
    <div style={{ marginBottom: '20px', border: '1px solid #ddd', padding: '10px', borderRadius: '8px' }}>
      <h3 onClick={toggle} style={{ cursor: 'pointer' }}>
        {isOpen ? '▼' : '▶'} {client || 'Unknown'}
      </h3>

      {isOpen && (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr>
              <th>Quote #</th>
              <th>Event Date</th>
              <th>Status</th>
              <th>Deposit</th>
              <th>Balance</th>
              <th>Deposit Date</th>
              <th>Paid in Full</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(quote => {
              const total = Number(quote.total_amount || 0);
              const deposit = Number(quote.deposit_amount || 0);
              const balance = (total - deposit).toFixed(2);

              return (
                <tr key={quote.id} style={{ borderBottom: '1px solid #ccc' }}>
                  <td>
                    <Link to={`/admin/quote-preview/${quote.id}`}>
                      {quote.quote_number}
                    </Link>
                  </td>
                  <td>{quote.event_date ? new Date(quote.event_date).toLocaleDateString('en-US') : 'N/A'}</td>
                  <td>
                    <select
                      value={quote.status || 'Pending'}
                      onChange={(e) => onInputChange(quote.id, 'status', e.target.value)}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Deposit Paid">Deposit Paid</option>
                      <option value="Cancelled">Cancelled</option>
                      <option value="Confirmed">Confirmed</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={quote.deposit_amount || ''}
                      onChange={(e) => onInputChange(quote.id, 'deposit_amount', e.target.value)}
                    />
                  </td>
                  <td style={{ color: balance === '0.00' ? 'green' : 'black' }}>
                    ${balance}
                  </td>
                  <td>
                    <input
                      type="date"
                      value={quote.deposit_date || ''}
                      onChange={(e) => onInputChange(quote.id, 'deposit_date', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={quote.paid_in_full || false}
                      onChange={(e) => onInputChange(quote.id, 'paid_in_full', e.target.checked)}
                    />
                  </td>
                  <td>
                    <button onClick={() => onUpdate(quote)}>💾 Update</button>{' '}
                    <button onClick={() => onDelete(quote.id)}>🗑 Delete</button>{' '}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

const AdminQuotesDashboard = () => {
  const [quotes, setQuotes] = useState([]);

  useEffect(() => {
    fetch(`${apiUrl}/api/quotes`)
      .then(res => res.json())
      .then(data => setQuotes(data))
      .catch(err => console.error('Error fetching quotes:', err));
  }, []);

  const handleInputChange = (id, field, value) => {
    setQuotes(prev =>
      prev.map(q => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  const handleUpdate = async (quote) => {
    try {
      const { status, deposit_amount, deposit_date, paid_in_full } = quote;

      await fetch(`${apiUrl}/api/quotes/${quote.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, deposit_amount, deposit_date, paid_in_full })
      });

      console.log(`✅ Quote ${quote.quote_number} updated`);
    } catch (err) {
      console.error('Failed to update quote:', err);
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

  const handleSendQuote = async (quote) => {
    try {
      const response = await fetch(`${apiUrl}/api/send-quote-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: quote.client_email,
          quote: {
            ...quote,
            quote_number: quote.quote_number || `Q-${Date.now()}`,
            client_name: quote.client_name || '',
          },
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      alert(`✅ Quote #${quote.quote_number} sent to ${quote.client_email}`);
    } catch (error) {
      console.error('❌ Failed to send updated quote:', error);
      alert('❌ Failed to send updated quote');
    }
  };

  const groupedClients = [...new Set(quotes.map(q => q.client_name))];

  return (
    <div style={{ padding: '20px' }}>
      <h2>All Quotes</h2>
      {groupedClients.map((client, index) => {
        const clientQuotes = quotes.filter(q => q.client_name === client);
        return (
          <ClientQuoteGroup
            key={index}
            client={client}
            quotes={clientQuotes}
            onInputChange={handleInputChange}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onSendQuote={handleSendQuote}
          />
        );
      })}
    </div>
  );
};

export default AdminQuotesDashboard;
