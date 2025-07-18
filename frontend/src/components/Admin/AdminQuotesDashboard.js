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
              const total = parseFloat(quote.total_amount) || 0;
              const deposit = quote.paid_in_full ? total : parseFloat(quote.deposit_amount) || 0;
              const balance = quote.paid_in_full ? 0 : (total - deposit).toFixed(2);
              const isPaid = quote.paid_in_full;

              return (
                <tr key={quote.id} style={{ borderBottom: '1px solid #ccc' }}>
                  <td>
                    <Link to={`/admin/quote-preview/${quote.id}`}>
                      {quote.quote_number}
                    </Link>
                  </td>
<td>
  {quote.event_date
    ? `${quote.event_date.slice(5, 7)}/${quote.event_date.slice(8, 10)}/${quote.event_date.slice(0, 4)}`
    : 'N/A'}
</td>
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
                      value={deposit || ''}
                      onChange={(e) => onInputChange(quote.id, 'deposit_amount', e.target.value)}
                      disabled={isPaid}
                    />
                  </td>
                  <td style={{ color: Number(balance) > 0 ? 'red' : 'green' }}>
                    ${balance}
                  </td>
                  <td>
                    <input
                      type="date"
                      value={quote.deposit_date || ''}
                      onChange={(e) => onInputChange(quote.id, 'deposit_date', e.target.value)}
                      disabled={isPaid}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const updates = {
                          paid_in_full: checked,
                          deposit_amount: checked ? total : quote.deposit_amount,
                          status: checked ? 'Confirmed' : quote.status
                        };
                        Object.entries(updates).forEach(([field, val]) => onInputChange(quote.id, field, val));
                      }}
                    />
                  </td>
                  <td>
                    <button onClick={() => onUpdate({ ...quote, deposit_amount: deposit, paid_in_full: isPaid })}>💾 Update</button>{' '}
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
      alert(`✅ Quote ${quote.quote_number} updated`);

    } catch (err) {
      console.error('❌ Failed to update quote:', err);
      alert('❌ Failed to update quote');
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
    if (!quote.client_email) {
      alert('❌ Cannot send quote: missing client email.');
      return;
    }

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

      const text = await response.text();

      if (!response.ok) throw new Error(text);

      alert(`✅ Quote #${quote.quote_number} sent to ${quote.client_email}`);
      console.log("✅ Email sent:", text);
    } catch (error) {
      console.error('❌ Failed to send quote email:', error);
      alert('❌ Failed to send quote email.');
    }
  };


  const handleRecalculateTotals = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/admin/recalculate-totals`, {
        method: 'POST',
      });

      const msg = await res.text();
      if (!res.ok) throw new Error(msg);
      alert("✅ Totals recalculated successfully.");

      const refreshed = await fetch(`${apiUrl}/api/quotes`);
      const updatedQuotes = await refreshed.json();
      setQuotes(updatedQuotes);
    } catch (err) {
      console.error("❌ Recalculation failed:", err);
      alert("❌ Failed to recalculate totals");
    }
  };

  const groupedClients = [...new Set(quotes.map(q => q.client_name))];

  return (
    <div style={{ padding: '20px' }}>
      <h2>All Quotes</h2>
      <button
        style={{ marginBottom: '15px', padding: '8px', backgroundColor: '#8B0000', color: 'white', border: 'none', cursor: 'pointer' }}
        onClick={handleRecalculateTotals}
      >
        🔄 Recalculate All Totals
      </button>
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
