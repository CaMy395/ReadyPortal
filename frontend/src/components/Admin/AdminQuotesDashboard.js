import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChevronDown, FaChevronRight, FaEnvelope, FaFileInvoiceDollar, FaSearch } from 'react-icons/fa';

const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;
const quoteBalance = (quote) => Math.max(0, (Number(quote.total_amount) || 0) - (Number(quote.amount_paid) || 0));
const quoteDate = (quote) => quote.created_at || quote.event_date || '';

const ClientQuoteGroup = ({ client, quotes, onInputChange, onUpdate, onDelete, onSendQuote, savingQuoteId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const quoted = quotes.reduce((sum, quote) => sum + (Number(quote.total_amount) || 0), 0);
  const paid = quotes.reduce((sum, quote) => sum + (Number(quote.amount_paid) || 0), 0);
  const balance = quotes.reduce((sum, quote) => sum + quoteBalance(quote), 0);
  const latest = [...quotes].sort((a, b) => String(quoteDate(b)).localeCompare(String(quoteDate(a))))[0];
  const hasBalance = balance > 0.005;

  return <article className={`quote-client-group ${isOpen ? 'open' : ''} ${hasBalance ? 'outstanding' : 'settled'}`}>
    <button type="button" className="quote-client-summary" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
      <span className="quote-expand-icon">{isOpen ? <FaChevronDown /> : <FaChevronRight />}</span>
      <span className="quote-client-copy"><strong>{client || 'Unknown client'}</strong><small>{quotes.length} quote{quotes.length === 1 ? '' : 's'} · Latest {latest?.quote_number || 'N/A'}</small></span>
      <span className="quote-client-metric"><small>QUOTED</small><strong>{money(quoted)}</strong></span>
      <span className="quote-client-metric"><small>PAID</small><strong>{money(paid)}</strong></span>
      <span className={`quote-client-metric balance ${hasBalance ? 'due' : ''}`}><small>BALANCE</small><strong>{money(balance)}</strong></span>
      <span className={`quote-status-pill ${hasBalance ? 'due' : 'paid'}`}>{hasBalance ? 'Balance due' : 'Paid'}</span>
    </button>
    {isOpen && <div className="quote-detail-wrap"><table className="quote-detail-table"><thead><tr><th>Quote</th><th>Event</th><th>Status</th><th>Add payment</th><th>Balance</th><th>Payment date</th><th>Paid</th><th>Actions</th></tr></thead><tbody>{quotes.map((quote) => {
      const balanceDue = quoteBalance(quote); const isPaid = balanceDue <= 0.005;
      return <tr key={quote.id}><td><Link to={`/admin/quote-preview/${quote.id}`}>{quote.quote_number}</Link></td><td>{quote.event_date ? new Date(`${quote.event_date.slice(0, 10)}T12:00:00`).toLocaleDateString() : 'N/A'}</td><td><select value={quote.status || 'Pending'} onChange={(event) => onInputChange(quote.id, 'status', event.target.value)}><option>Pending</option><option>Deposit Paid</option><option>Cancelled</option><option>Confirmed</option></select></td><td><input type="number" min="0" step="0.01" value={quote.deposit_amount || ''} onChange={(event) => onInputChange(quote.id, 'deposit_amount', event.target.value)} placeholder="0.00" /></td><td className={isPaid ? 'paid-value' : 'due-value'}>{money(balanceDue)}</td><td><input type="date" value={quote.deposit_date || ''} onChange={(event) => onInputChange(quote.id, 'deposit_date', event.target.value)} disabled={isPaid} /></td><td><input type="checkbox" checked={isPaid} readOnly /></td><td><div className="quote-row-actions"><button onClick={() => onUpdate({ ...quote, paid_in_full: isPaid })} disabled={savingQuoteId === quote.id}>Update</button><button onClick={() => onSendQuote(quote)} title="Email quote"><FaEnvelope /></button><button className="danger" onClick={() => onDelete(quote.id)}>Delete</button></div></td></tr>;
    })}</tbody></table></div>}
  </article>;
};

const AdminQuotesDashboard = () => {
  const [quotes, setQuotes] = useState([]); const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(''); const [balanceFilter, setBalanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); const [page, setPage] = useState(1);
  const [savingQuoteId, setSavingQuoteId] = useState(null); const pageSize = 15;
  const loadQuotes = async () => { setLoading(true); try { const response = await fetch(`${apiUrl}/api/quotes`); const data = await response.json(); setQuotes(Array.isArray(data) ? data.map((quote) => ({ ...quote, deposit_amount: '' })) : []); } finally { setLoading(false); } };
  useEffect(() => { loadQuotes(); }, []); useEffect(() => { setPage(1); }, [query, balanceFilter, sortBy]);
  const handleInputChange = (id, field, value) => setQuotes((current) => current.map((quote) => quote.id === id ? { ...quote, [field]: value } : quote));
  const handleUpdate = async (quote) => { try { setSavingQuoteId(quote.id); const paymentAmount = Number(quote.deposit_amount) || 0; if (paymentAmount > 0) { const response = await fetch(`${apiUrl}/api/quotes/${quote.id}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: paymentAmount, payment_method: 'Manual', payment_date: quote.deposit_date || new Date().toISOString().slice(0, 10), note: 'Payment received' }) }); if (!response.ok) throw new Error((await response.text()) || 'Failed to save payment'); } const remainingAfterPayment = Math.max(0, quoteBalance(quote) - paymentAmount); const statusResponse = await fetch(`${apiUrl}/api/quotes/${quote.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: quote.status || 'Pending', paid_in_full: remainingAfterPayment <= 0.005 }) }); if (!statusResponse.ok) throw new Error('Failed to save quote status'); await loadQuotes(); } catch (error) { alert(`Failed to update quote: ${error.message}`); } finally { setSavingQuoteId(null); } };
  const handleDelete = async (id) => { if (!window.confirm('Delete this quote? This cannot be undone.')) return; const response = await fetch(`${apiUrl}/api/quotes/${id}`, { method: 'DELETE' }); if (response.ok) setQuotes((current) => current.filter((quote) => quote.id !== id)); };
  const handleSendQuote = async (quote) => { if (!quote.client_email) return alert('Cannot send quote: missing client email.'); const response = await fetch(`${apiUrl}/api/send-quote-email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: quote.client_email, quote }) }); alert(response.ok ? `Quote ${quote.quote_number} sent.` : 'Failed to send quote.'); };

  const clientGroups = useMemo(() => { const groups = new Map(); quotes.forEach((quote) => { const key = String(quote.client_name || 'Unknown client').trim() || 'Unknown client'; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(quote); }); const search = query.trim().toLowerCase(); return [...groups.entries()].map(([client, clientQuotes]) => ({ client, quotes: clientQuotes.sort((a, b) => String(quoteDate(b)).localeCompare(String(quoteDate(a)))), balance: clientQuotes.reduce((sum, quote) => sum + quoteBalance(quote), 0), latest: Math.max(...clientQuotes.map((quote) => new Date(quoteDate(quote) || 0).getTime() || 0)) })).filter((group) => { if (search && !`${group.client} ${group.quotes.map((quote) => `${quote.quote_number} ${quote.client_email}`).join(' ')}`.toLowerCase().includes(search)) return false; if (balanceFilter === 'outstanding' && group.balance <= 0.005) return false; if (balanceFilter === 'paid' && group.balance > 0.005) return false; return true; }).sort((a, b) => sortBy === 'name' ? a.client.localeCompare(b.client) : sortBy === 'balance' ? b.balance - a.balance : b.latest - a.latest); }, [quotes, query, balanceFilter, sortBy]);
  const totals = useMemo(() => quotes.reduce((sum, quote) => { sum.quoted += Number(quote.total_amount) || 0; sum.paid += Number(quote.amount_paid) || 0; sum.balance += quoteBalance(quote); return sum; }, { quoted: 0, paid: 0, balance: 0 }), [quotes]);
  const pageCount = Math.max(1, Math.ceil(clientGroups.length / pageSize)); const visibleGroups = clientGroups.slice((page - 1) * pageSize, page * pageSize);

  return <main className="quotes-workspace"><header className="quotes-workspace-header"><div><span>CLIENT FINANCE</span><h1>All quotes</h1><p>Find balances and update quotes without scrolling through every client.</p></div><Link className="quotes-create-link" to="/admin/quotes"><FaFileInvoiceDollar /> Create quote</Link></header><section className="quotes-summary"><article><small>TOTAL QUOTED</small><strong>{money(totals.quoted)}</strong></article><article><small>COLLECTED</small><strong>{money(totals.paid)}</strong></article><article className="due"><small>OUTSTANDING</small><strong>{money(totals.balance)}</strong></article><article><small>CLIENTS</small><strong>{clientGroups.length}</strong></article></section><section className="quotes-panel"><div className="quotes-tools"><label><FaSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search client, email, or quote number…" /></label><select value={balanceFilter} onChange={(event) => setBalanceFilter(event.target.value)}><option value="all">All balances</option><option value="outstanding">Outstanding only</option><option value="paid">Paid only</option></select><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="recent">Most recent</option><option value="balance">Highest balance</option><option value="name">Client name</option></select></div><div className="quotes-results-heading"><strong>Client quotes</strong><span>{clientGroups.length} clients · {quotes.length} quotes</span></div>{loading ? <div className="quotes-empty">Loading quotes…</div> : visibleGroups.length ? visibleGroups.map((group) => <ClientQuoteGroup key={group.client} client={group.client} quotes={group.quotes} onInputChange={handleInputChange} onUpdate={handleUpdate} onDelete={handleDelete} onSendQuote={handleSendQuote} savingQuoteId={savingQuoteId} />) : <div className="quotes-empty">No quotes match these filters.</div>}{pageCount > 1 && <div className="quotes-pagination"><button disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>Next</button></div>}</section></main>;
};

export default AdminQuotesDashboard;
