import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaCalendarCheck, FaChevronDown, FaChevronRight, FaEnvelope, FaFileInvoiceDollar, FaSearch } from 'react-icons/fa';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;
const recordDate = (row) => row.created_at || row.event_date || '';
const isPendingQuote = (row) => String(row.status || '').trim().toLowerCase() === 'pending';
// Payment totals come from the payment ledger, never from a client's name.
const normalizeQuotePayment = (row) => {
  const total = Number(row.total_amount || 0);
  const pendingApproval = isPendingQuote(row);
  return {
    ...row,
    amount_paid: Number(row.amount_paid || 0),
    track_balance: total > 0,
    pending_approval: pendingApproval,
  };
};
const balanceOf = (row) => row.track_balance ? Math.max(0, Number(row.total_amount || 0) - Number(row.amount_paid || 0)) : 0;
const displayedBalanceOf = (row) => row.source === 'appointment'
  ? Math.max(0, Number(row.balance_due ?? row.total_amount ?? 0) - (row.balance_due == null ? Number(row.amount_paid || 0) : 0))
  : balanceOf(row);
const groupKey = (row) => row.client_id ? `client:${row.client_id}` : row.client_email ? `email:${String(row.client_email).trim().toLowerCase()}` : `name:${String(row.client_name || 'Unknown').trim().toLowerCase()}`;

function ClientBalanceGroup({ group, changeQuote, updateQuote, deleteQuote, sendQuote, savingId, sendingId }) {
  const [open, setOpen] = useState(false);
  const tracked = group.records.filter((row) => row.track_balance);
  const total = tracked.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  const paid = tracked.reduce((sum, row) => sum + Number(row.amount_paid || 0), 0);
  const balance = tracked.reduce((sum, row) => sum + balanceOf(row), 0);
  const hasBalance = balance > 0.005;
  const hasPendingApproval = group.records.some((row) => row.source === 'quote' && row.pending_approval);
  const quoteCount = group.records.filter((row) => row.source === 'quote').length;
  const bookingCount = group.records.length - quoteCount;

  return <article className={`quote-client-group ${open ? 'open' : ''} ${hasBalance ? 'outstanding' : 'settled'}`}>
    <button type="button" className="quote-client-summary" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="quote-expand-icon">{open ? <FaChevronDown /> : <FaChevronRight />}</span>
      <span className="quote-client-copy"><strong>{group.client}</strong><small>{quoteCount ? `${quoteCount} quote${quoteCount === 1 ? '' : 's'}` : ''}{quoteCount && bookingCount ? ' · ' : ''}{bookingCount ? `${bookingCount} booking${bookingCount === 1 ? '' : 's'}` : ''}</small></span>
      <span className="quote-client-metric"><small>TOTAL</small><strong>{money(total)}</strong></span>
      <span className="quote-client-metric"><small>PAID</small><strong>{money(paid)}</strong></span>
      <span className={`quote-client-metric balance ${hasBalance ? 'due' : ''}`}><small>BALANCE</small><strong>{money(balance)}</strong></span>
      <span className={`quote-status-pill ${hasPendingApproval ? 'pending' : hasBalance ? 'due' : 'paid'}`}>{hasPendingApproval ? 'Pending approval' : hasBalance ? 'Balance due' : tracked.length ? 'Settled' : 'Estimate only'}</span>
    </button>
    {open && <div className="quote-detail-wrap"><table className="quote-detail-table"><thead><tr><th>Record</th><th>Event</th><th>Status</th><th>Add payment</th><th>Balance</th><th>Payment date</th><th>Paid</th><th>Actions</th></tr></thead><tbody>{group.records.map((row) => {
      const appointment = row.source === 'appointment';
      const balanceDue = displayedBalanceOf(row);
      const paidInFull = row.track_balance && balanceDue <= 0.005;
      return <tr key={`${row.source}-${row.id}`}>
        <td>{appointment ? <span className="booking-record-label"><FaCalendarCheck /> {row.title || 'Appointment'}</span> : <Link to={`/admin/quote-preview/${row.id}`}>{row.quote_number}</Link>}</td>
        <td>{row.event_date ? new Date(`${String(row.event_date).slice(0, 10)}T12:00:00`).toLocaleDateString() : 'N/A'}</td>
        <td>{appointment ? <span className="record-source-pill booking">Booked</span> : <select value={row.status || 'Pending'} onChange={(event) => changeQuote(row.id, 'status', event.target.value)}><option>Pending</option><option>Accepted</option><option>Deposit Paid</option><option>Cancelled</option><option>Confirmed</option></select>}</td>
        <td>{appointment ? money(row.amount_paid) : <input type="number" min="0" step="0.01" value={row.deposit_amount || ''} onChange={(event) => changeQuote(row.id, 'deposit_amount', event.target.value)} placeholder="0.00" />}</td>
        <td className={paidInFull ? 'paid-value' : (row.track_balance || appointment) && balanceDue > 0.005 ? 'due-value' : ''}>{appointment || row.track_balance ? money(balanceDue) : 'Not outstanding'}</td>
        <td>{appointment ? (row.payment_method || 'Recorded at booking') : <input type="date" value={row.deposit_date || ''} onChange={(event) => changeQuote(row.id, 'deposit_date', event.target.value)} disabled={paidInFull} />}</td>
        <td><input type="checkbox" checked={paidInFull} readOnly /></td>
        <td>{appointment ? <Link className="booking-manage-link" to="/admin/scheduling-page" state={{ appointmentId: row.id }}>Manage booking</Link> : <div className="quote-row-actions"><button onClick={() => updateQuote(row)} disabled={savingId === row.id}>{savingId === row.id ? 'Saving...' : 'Update'}</button><button onClick={() => sendQuote(row)} disabled={sendingId === row.id} title="Email quote">{sendingId === row.id ? 'Sending...' : <FaEnvelope />}</button><button className="danger" onClick={() => deleteQuote(row.id)}>Delete</button></div>}</td>
      </tr>;
    })}</tbody></table></div>}
  </article>;
}

export default function AdminQuotesDashboard() {
  const [quotes, setQuotes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState(null);
  const [sendingId, setSendingId] = useState(null);
  const pendingActions = useRef(new Set());
  const pageSize = 15;

  const loadRecords = async () => {
    setLoading(true); setError('');
    try {
      const [quoteResult, appointmentResult] = await Promise.allSettled([
        fetch(`${apiUrl}/api/quotes`),
        fetch(`${apiUrl}/api/client-appointment-balances`),
      ]);
      if (quoteResult.status !== 'fulfilled') throw new Error('Failed to connect to the quotes service.');
      const quoteResponse = quoteResult.value;
      if (!quoteResponse.ok) throw new Error('Failed to load quotes.');
      const quoteData = await quoteResponse.json();
      setQuotes(Array.isArray(quoteData) ? quoteData.map((row) => ({ ...normalizeQuotePayment(row), source: 'quote', deposit_amount: '' })) : []);

      if (appointmentResult.status === 'fulfilled' && appointmentResult.value.ok) {
        const appointmentData = await appointmentResult.value.json();
        setAppointments(Array.isArray(appointmentData) ? appointmentData.map((row) => ({ ...row, source: 'appointment', track_balance: true })) : []);
      } else {
        // Keep the existing quotes usable while a newly deployed appointment route catches up.
        setAppointments([]);
        console.warn('Appointment balances are temporarily unavailable. Quotes were loaded normally.');
      }
    } catch (loadError) { setError(loadError.message); } finally { setLoading(false); }
  };

  useEffect(() => { loadRecords(); }, []);
  useEffect(() => { setPage(1); }, [query, balanceFilter, sortBy]);
  const changeQuote = (id, field, value) => setQuotes((current) => current.map((row) => row.id === id ? { ...row, [field]: value } : row));
  const updateQuote = async (quote) => {
    const action = `update:${quote.id}`;
    if (pendingActions.current.has(action)) return;
    pendingActions.current.add(action);
    let statusSaved = false;
    try {
      setSavingId(quote.id);
      const payment = Number(quote.deposit_amount || 0);
      if (!Number.isFinite(payment) || payment < 0) throw new Error('Enter a valid payment amount.');
      const checkResponse = async (response, fallback) => {
        if (response.ok) return;
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || fallback);
      };
      // Save status first so a failed status update cannot leave a payment to be
      // submitted twice on retry. Only the payment endpoint changes paid totals.
      const response = await fetch(`${apiUrl}/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: quote.status || 'Pending' }),
      });
      await checkResponse(response, 'Failed to save quote status');
      statusSaved = true;
      if (payment > 0) {
        const paymentResponse = await fetch(`${apiUrl}/api/quotes/${quote.id}/payments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: payment, payment_method: 'Manual', payment_date: quote.deposit_date || new Date().toISOString().slice(0, 10), note: 'Payment received' }),
        });
        await checkResponse(paymentResponse, 'Failed to save payment');
        changeQuote(quote.id, 'deposit_amount', '');
      }
      await loadRecords();
    } catch (updateError) {
      alert(`${statusSaved ? 'Quote status saved, but payment could not be confirmed. Check the payment history before retrying' : 'Failed to update quote'}: ${updateError.message}`);
    } finally {
      pendingActions.current.delete(action);
      setSavingId(null);
    }
  };
  const deleteQuote = async (id) => { if (!window.confirm('Delete this quote? This cannot be undone.')) return; const response = await fetch(`${apiUrl}/api/quotes/${id}`, { method: 'DELETE' }); if (response.ok) setQuotes((current) => current.filter((row) => row.id !== id)); };
  const sendQuote = async (quote) => {
    if (!quote.client_email) return alert('Cannot send quote: missing client email.');
    const action = `send:${quote.id}`;
    if (pendingActions.current.has(action)) return;
    pendingActions.current.add(action); setSendingId(quote.id);
    try {
      const response = await fetch(`${apiUrl}/api/send-quote-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: quote.client_email, quote }) });
      alert(response.ok ? `Quote ${quote.quote_number} sent.` : 'Failed to send quote.');
    } catch (sendError) { alert('Failed to send quote.'); }
    finally { pendingActions.current.delete(action); setSendingId(null); }
  };

  const records = useMemo(() => [...quotes, ...appointments], [quotes, appointments]);
  const allGroups = useMemo(() => { const map = new Map(); records.forEach((row) => { const key = groupKey(row); if (!map.has(key)) map.set(key, []); map.get(key).push(row); }); return [...map.entries()].map(([key, rows]) => ({ key, client: rows.find((row) => row.client_name)?.client_name || 'Unknown client', records: rows.sort((a, b) => String(recordDate(b)).localeCompare(String(recordDate(a)))), balance: rows.reduce((sum, row) => sum + balanceOf(row), 0), latest: Math.max(...rows.map((row) => new Date(recordDate(row) || 0).getTime() || 0)) })); }, [records]);
  const groups = useMemo(() => { const search = query.trim().toLowerCase(); return allGroups.filter((group) => { const searchable = `${group.client} ${group.records.map((row) => `${row.quote_number || ''} ${row.title || ''} ${row.client_email || ''}`).join(' ')}`.toLowerCase(); if (search && !searchable.includes(search)) return false; if (balanceFilter === 'outstanding' && group.balance <= 0.005) return false; if (balanceFilter === 'paid' && group.balance > 0.005) return false; return true; }).sort((a, b) => sortBy === 'name' ? a.client.localeCompare(b.client) : sortBy === 'balance' ? b.balance - a.balance : b.latest - a.latest); }, [allGroups, query, balanceFilter, sortBy]);
  const totals = useMemo(() => records.filter((row) => row.track_balance).reduce((sum, row) => ({ total: sum.total + Number(row.total_amount || 0), paid: sum.paid + Number(row.amount_paid || 0), balance: sum.balance + balanceOf(row) }), { total: 0, paid: 0, balance: 0 }), [records]);
  const outstandingClients = allGroups.filter((group) => group.balance > 0.005).length;
  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize));
  const visibleGroups = groups.slice((page - 1) * pageSize, page * pageSize);

  return <main className="quotes-workspace"><header className="quotes-workspace-header"><div><span>CLIENT FINANCE</span><h1>Client balances</h1><p>Track accepted quotes and appointment bookings together without counting estimates as money owed.</p></div><Link className="quotes-create-link" to="/admin/quotes"><FaFileInvoiceDollar /> Create quote</Link></header><section className="quotes-summary"><article><small>TRACKED TOTAL</small><strong>{money(totals.total)}</strong></article><article><small>COLLECTED</small><strong>{money(totals.paid)}</strong></article><article className="due"><small>OUTSTANDING · {outstandingClients} CLIENTS</small><strong>{money(totals.balance)}</strong></article><article><small>ALL CLIENTS</small><strong>{allGroups.length}</strong></article></section><section className="quotes-panel"><div className="quotes-tools"><label><FaSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, email, quote, or booking..." /></label><select value={balanceFilter} onChange={(event) => setBalanceFilter(event.target.value)}><option value="all">All balances</option><option value="outstanding">Outstanding only</option><option value="paid">Settled / estimate</option></select><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="recent">Most recent</option><option value="balance">Highest balance</option><option value="name">Client name</option></select></div><div className="quotes-results-heading"><strong>Quotes & bookings</strong><span>{groups.length} clients · {quotes.length} quotes · {appointments.length} bookings</span></div>{error ? <div className="quotes-empty quote-load-error">{error}</div> : loading ? <div className="quotes-empty">Loading balances...</div> : visibleGroups.length ? visibleGroups.map((group) => <ClientBalanceGroup key={group.key} group={group} changeQuote={changeQuote} updateQuote={updateQuote} deleteQuote={deleteQuote} sendQuote={sendQuote} savingId={savingId} sendingId={sendingId} />) : <div className="quotes-empty">No records match these filters.</div>}{pageCount > 1 && <div className="quotes-pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div>}</section></main>;
}
