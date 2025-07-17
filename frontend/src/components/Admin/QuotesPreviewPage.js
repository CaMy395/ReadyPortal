// QuotesPreviewPage.js
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const QuotesPreviewPage = () => {
  const { id } = useParams();
  const [quote, setQuote] = useState(null);
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetch(`${apiUrl}/api/quotes/${id}`)
      .then(res => res.json())
      .then(data => setQuote(data))
      .catch(err => console.error('Failed to fetch quote:', err));
  }, [id, apiUrl]);

  if (!quote) return <p>Loading quote...</p>;

  const calculatedTotal = quote.total_amount && parseFloat(quote.total_amount) > 0
    ? parseFloat(quote.total_amount)
    : quote.items?.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0) || 0;

  const deposit = parseFloat(quote.deposit_amount) || 0;
  const balance = (calculatedTotal - deposit).toFixed(2);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Quote Preview</h2>
      <p><strong>Quote #:</strong> {quote.quote_number}</p>
      <p><strong>Quote Date:</strong> {quote.quote_date}</p>
      <p><strong>Event Date:</strong> {quote.event_date}</p>
      <p><strong>Event Time:</strong> {quote.event_time}</p>
      <p><strong>Location:</strong> {quote.location}</p>

      <hr />
      <h3>Bill To</h3>
      <p><strong>Name:</strong> {quote.client_name}</p>
      <p><strong>Email:</strong> {quote.client_email}</p>
      <p><strong>Phone:</strong> {quote.client_phone}</p>
      {quote.entity_type === 'business' && (
        <>
          <p><strong>Organization:</strong> {quote.bill_to_organization}</p>
          <p><strong>Attention:</strong> {quote.bill_to_contact}</p>
        </>
      )}

      <hr />
      <h3>Items</h3>
      {quote.items && quote.items.length > 0 ? (
        <ul>
          {quote.items.map((item, i) => (
            <li key={i}>
              {item.quantity} x {item.name} – {item.description} – ${item.amount}
            </li>
          ))}
        </ul>
      ) : <p>No items listed.</p>}

      <hr />
      <p><strong>Total:</strong> ${calculatedTotal.toFixed(2)}</p>

      {quote.deposit_amount && (
        <p><strong>Deposit Paid:</strong> ${deposit.toFixed(2)}</p>
      )}
      {quote.deposit_date && (
        <p><strong>Deposit Date:</strong> {quote.deposit_date}</p>
      )}

      <p><strong>Balance:</strong> <span style={{ color: balance > 0 ? 'red' : 'green' }}>${balance}</span></p>

      {quote.paid_in_full && (
        <p style={{ color: 'green' }}><strong>✅ Paid in Full</strong></p>
      )}
    </div>
  );
};

export default QuotesPreviewPage;
