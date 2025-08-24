// QuotesPreviewPage.js
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';

const toISODate = (val) => {
  if (!val) return '';
  // Accept Date, ISO string, or yyyy-mm-dd
  try {
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return String(val).slice(0, 10) || '';
    return d.toISOString().slice(0, 10);
  } catch {
    return String(val).slice(0, 10) || '';
  }
};

const emptyItem = () => ({
  name: '',
  description: '',
  quantity: 1,
  amount: ''
});

const Row = ({ label, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, alignItems: 'center', marginBottom: 8 }}>
    <div style={{ fontWeight: 600 }}>{label}</div>
    <div>{children}</div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{ marginTop: 22, marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: 6 }}>{children}</h3>
);

const QuotesPreviewPage = () => {
  const { id } = useParams();
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  const startInEdit = params.get('edit') === 'true';

  const [quote, setQuote] = useState(null);
  const [editQuote, setEditQuote] = useState(null);
  const [isEditing, setIsEditing] = useState(startInEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Fetch quote
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/quotes/${id}`);
        const data = await res.json();
        setQuote(data);
        setEditQuote({
          // normalize into editable state
          quote_number: data.quote_number || '',
          quote_date: toISODate(data.quote_date || data.date), // some DBs use "date"
          client_name: data.client_name || '',
          client_email: data.client_email || '',
          client_phone: data.client_phone || '',
          client_id: data.client_id || null,

          event_date: toISODate(data.event_date),
          event_time: data.event_time || '',
          location: data.location || '',

          status: data.status || 'Pending',

          // amounts
          total_amount: data.total_amount || '',

          // payment flags
          deposit_amount: data.deposit_amount || '',
          deposit_date: toISODate(data.deposit_date),
          paid_in_full: !!data.paid_in_full,

          // items
          items: Array.isArray(data.items) ? data.items.map(it => ({
            name: it.name ?? '',
            description: it.description ?? '',
            quantity: it.quantity ?? 1,
            amount: it.amount ?? ''
          })) : []
        });
      } catch (e) {
        console.error('Failed to fetch quote:', e);
        setError('Failed to load quote.');
      }
    })();
  }, [id, apiUrl]);

  const calculatedTotal = useMemo(() => {
    if (!quote) return 0;
    const dbTotal = quote.total_amount && parseFloat(quote.total_amount);
    if (dbTotal && dbTotal > 0) return dbTotal;
    const sum = (quote.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    return sum || 0;
  }, [quote]);

  const editingCalculatedTotal = useMemo(() => {
    if (!editQuote) return 0;
    const dbTotal = editQuote.total_amount && parseFloat(editQuote.total_amount);
    if (dbTotal && dbTotal > 0) return dbTotal;
    const sum = (editQuote.items || []).reduce((s, it) => s + (parseFloat(it.amount) || 0), 0);
    return sum || 0;
  }, [editQuote]);

  const deposit = useMemo(() => parseFloat((quote?.deposit_amount ?? 0) || 0) || 0, [quote]);
  const editingDeposit = useMemo(() => parseFloat((editQuote?.deposit_amount ?? 0) || 0) || 0, [editQuote]);

  const balance = useMemo(() => (calculatedTotal - deposit).toFixed(2), [calculatedTotal, deposit]);
  const editingBalance = useMemo(() => (editingCalculatedTotal - editingDeposit).toFixed(2), [editingCalculatedTotal, editingDeposit]);

  const handleItemChange = (idx, field, value) => {
    setEditQuote(q => {
      const next = { ...q };
      const items = [...(next.items || [])];
      items[idx] = { ...items[idx], [field]: field === 'quantity' ? (value === '' ? '' : parseInt(value || 0, 10)) : value };
      next.items = items;
      return next;
    });
  };

  const addItem = () => {
    setEditQuote(q => ({ ...q, items: [...(q.items || []), emptyItem()] }));
  };
  const removeItem = (idx) => {
    setEditQuote(q => {
      const next = { ...q, items: [...(q.items || [])] };
      next.items.splice(idx, 1);
      return next;
    });
  };

  const handleSave = async () => {
    if (!editQuote) return;
    setSaving(true);
    setError('');
    try {
      // Compose a payload that matches the backend PUT route you add
      const payload = {
        client_id: editQuote.client_id ?? null,
        quoteDate: editQuote.quote_date || null, // maps to quotes.date
        total_amount: editQuote.total_amount === '' ? null : editQuote.total_amount,
        status: editQuote.status || 'Pending',
        quote_number: editQuote.quote_number || '',
        items: editQuote.items || [],

        clientName: editQuote.client_name || '',
        clientEmail: editQuote.client_email || '',
        clientPhone: editQuote.client_phone || '',

        eventDate: editQuote.event_date || null,
        eventTime: editQuote.event_time || '',
        location: editQuote.location || '',

        // deposit / payment flags
        deposit_amount: editQuote.deposit_amount === '' ? null : editQuote.deposit_amount,
        deposit_date: editQuote.deposit_date || null,
        paid_in_full: !!editQuote.paid_in_full
      };

      const res = await fetch(`${apiUrl}/api/quotes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to save');
      }
      const updated = await res.json();
      setQuote(updated);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    // Reset edit copy from current quote
    if (quote) {
      setEditQuote({
        quote_number: quote.quote_number || '',
        quote_date: toISODate(quote.quote_date || quote.date),
        client_name: quote.client_name || '',
        client_email: quote.client_email || '',
        client_phone: quote.client_phone || '',
        client_id: quote.client_id || null,

        event_date: toISODate(quote.event_date),
        event_time: quote.event_time || '',
        location: quote.location || '',

        status: quote.status || 'Pending',
        total_amount: quote.total_amount || '',

        deposit_amount: quote.deposit_amount || '',
        deposit_date: toISODate(quote.deposit_date),
        paid_in_full: !!quote.paid_in_full,

        items: Array.isArray(quote.items) ? quote.items.map(it => ({
          name: it.name ?? '',
          description: it.description ?? '',
          quantity: it.quantity ?? 1,
          amount: it.amount ?? ''
        })) : []
      });
    }
    setIsEditing(false);
    setError('');
  };

  if (!quote || !editQuote) return <p style={{ padding: 20 }}>Loading quote...</p>;

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Quote {isEditing ? 'Editor' : 'Preview'}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer' }}>
              ✏️ Edit
            </button>
          )}
          {isEditing && (
            <>
              <button
                onClick={cancelEdit}
                disabled={saving}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ccc', cursor: 'pointer', background: '#fafafa' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #1b7', background: '#1b7', color: 'white', cursor: 'pointer' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div style={{ marginTop: 12, color: 'crimson' }}>{error}</div>}

      <SectionTitle>Header</SectionTitle>
      {isEditing ? (
        <>
          <Row label="Quote #">
            <input
              value={editQuote.quote_number}
              onChange={e => setEditQuote(q => ({ ...q, quote_number: e.target.value }))}
              style={{ width: '100%' }}
              placeholder="e.g. RB-2025-0012"
            />
          </Row>
          <Row label="Quote Date">
            <input
              type="date"
              value={editQuote.quote_date || ''}
              onChange={e => setEditQuote(q => ({ ...q, quote_date: e.target.value }))}
            />
          </Row>
          <Row label="Status">
            <select
              value={editQuote.status}
              onChange={e => setEditQuote(q => ({ ...q, status: e.target.value }))}
            >
              <option>Pending</option>
              <option>Sent</option>
              <option>Accepted</option>
              <option>Declined</option>
              <option>Cancelled</option>
            </select>
          </Row>
        </>
      ) : (
        <>
          <Row label="Quote #">{quote.quote_number}</Row>
          <Row label="Quote Date">{quote.quote_date || quote.date}</Row>
          <Row label="Status">{quote.status}</Row>
        </>
      )}

      <SectionTitle>Bill To</SectionTitle>
      {isEditing ? (
        <>
          <Row label="Name">
            <input
              value={editQuote.client_name}
              onChange={e => setEditQuote(q => ({ ...q, client_name: e.target.value }))}
              style={{ width: '100%' }}
            />
          </Row>
          <Row label="Email">
            <input
              type="email"
              value={editQuote.client_email}
              onChange={e => setEditQuote(q => ({ ...q, client_email: e.target.value }))}
              style={{ width: '100%' }}
            />
          </Row>
          <Row label="Phone">
            <input
              value={editQuote.client_phone}
              onChange={e => setEditQuote(q => ({ ...q, client_phone: e.target.value }))}
              style={{ width: '100%' }}
            />
          </Row>
        </>
      ) : (
        <>
          <Row label="Name">{quote.client_name}</Row>
          <Row label="Email">{quote.client_email}</Row>
          <Row label="Phone">{quote.client_phone}</Row>
        </>
      )}

      <SectionTitle>Event</SectionTitle>
      {isEditing ? (
        <>
          <Row label="Event Date">
            <input
              type="date"
              value={editQuote.event_date || ''}
              onChange={e => setEditQuote(q => ({ ...q, event_date: e.target.value }))}
            />
          </Row>
          <Row label="Event Time">
            <input
              value={editQuote.event_time}
              onChange={e => setEditQuote(q => ({ ...q, event_time: e.target.value }))}
              placeholder="e.g. 11:30am - 3:30pm"
              style={{ width: '100%' }}
            />
          </Row>
          <Row label="Location">
            <input
              value={editQuote.location}
              onChange={e => setEditQuote(q => ({ ...q, location: e.target.value }))}
              style={{ width: '100%' }}
            />
          </Row>
        </>
      ) : (
        <>
          <Row label="Event Date">{quote.event_date}</Row>
          <Row label="Event Time">{quote.event_time}</Row>
          <Row label="Location">{quote.location}</Row>
        </>
      )}

      <SectionTitle>Items</SectionTitle>
      {isEditing ? (
        <>
          {(editQuote.items || []).length === 0 && <p style={{ marginTop: 0 }}>No items yet.</p>}
          {(editQuote.items || []).map((item, idx) => (
            <div key={idx} style={{ border: '1px solid #eee', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <Row label="Name">
                <input
                  value={item.name}
                  onChange={e => handleItemChange(idx, 'name', e.target.value)}
                  style={{ width: '100%' }}
                />
              </Row>
              <Row label="Description">
                <input
                  value={item.description}
                  onChange={e => handleItemChange(idx, 'description', e.target.value)}
                  style={{ width: '100%' }}
                />
              </Row>
              <Row label="Quantity">
                <input
                  type="number"
                  min="0"
                  value={item.quantity}
                  onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                  style={{ width: 120 }}
                />
              </Row>
              <Row label="Amount ($)">
                <input
                  type="number"
                  step="0.01"
                  value={item.amount}
                  onChange={e => handleItemChange(idx, 'amount', e.target.value)}
                  style={{ width: 160 }}
                />
              </Row>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => removeItem(idx)}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #c33', background: '#fff', color: '#c33', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addItem}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #555', cursor: 'pointer' }}
          >
            + Add Item
          </button>
        </>
      ) : (
        <>
          {quote.items && quote.items.length > 0 ? (
            <ul style={{ marginTop: 8 }}>
              {quote.items.map((item, i) => (
                <li key={i}>
                  {item.quantity} x {item.name} — {item.description} — ${item.amount}
                </li>
              ))}
            </ul>
          ) : <p>No items listed.</p>}
        </>
      )}

      <SectionTitle>Totals</SectionTitle>
      {isEditing ? (
        <>
          <Row label="Total Amount ($)">
            <input
              type="number"
              step="0.01"
              placeholder="Leave blank to auto-sum items"
              value={editQuote.total_amount}
              onChange={e => setEditQuote(q => ({ ...q, total_amount: e.target.value }))}
              style={{ width: 220 }}
            />
          </Row>
          <Row label="Auto Total (view)">
            <div>${editingCalculatedTotal.toFixed(2)}</div>
          </Row>
        </>
      ) : (
        <Row label="Total">${calculatedTotal.toFixed(2)}</Row>
      )}

      <SectionTitle>Payment</SectionTitle>
      {isEditing ? (
        <>
          <Row label="Deposit Amount ($)">
            <input
              type="number"
              step="0.01"
              value={editQuote.deposit_amount}
              onChange={e => setEditQuote(q => ({ ...q, deposit_amount: e.target.value }))}
              style={{ width: 180 }}
            />
          </Row>
          <Row label="Deposit Date">
            <input
              type="date"
              value={editQuote.deposit_date || ''}
              onChange={e => setEditQuote(q => ({ ...q, deposit_date: e.target.value }))}
            />
          </Row>
          <Row label="Paid in Full">
            <input
              type="checkbox"
              checked={!!editQuote.paid_in_full}
              onChange={e => setEditQuote(q => ({ ...q, paid_in_full: e.target.checked }))}
            />
          </Row>
          <Row label="Balance (view)">
            <div style={{ color: parseFloat(editingBalance) > 0 ? 'red' : 'green' }}>${editingBalance}</div>
          </Row>
        </>
      ) : (
        <>
          {quote.deposit_amount && <Row label="Deposit Paid">${deposit.toFixed(2)}</Row>}
          {quote.deposit_date && <Row label="Deposit Date">{quote.deposit_date}</Row>}
          <Row label="Balance">
            <span style={{ color: balance > 0 ? 'red' : 'green' }}>${balance}</span>
          </Row>
          {quote.paid_in_full && (
            <p style={{ color: 'green', marginTop: 6 }}><strong>✅ Paid in Full</strong></p>
          )}
        </>
      )}
    </div>
  );
};

export default QuotesPreviewPage;
