import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, CircleDollarSign, Plus, Search, Tags, X } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const dateInput = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const amountOf = (value) => Math.abs(Number.parseFloat(String(value ?? '').replace(/[$,]/g, '')) || 0);
const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;
const rowDate = (row) => {
  const raw = String(row?.expense_date || '').slice(0, 10);
  return raw ? new Date(`${raw}T12:00:00`) : null;
};

const categories = ['Auto', 'Building', 'Business', 'Legal', 'Loans', 'Rent', 'Refunds', 'Reimbursements', 'Utilities', 'Office Supplies', 'Marketing / Advertising', 'Software / Subscriptions', 'Travel', 'Inventory / Bar Supplies', 'Taxes / Fees', 'Other'];
const paymentMethods = ['Chase Debit Card', 'Chase Credit Card', 'Capital One Credit Card', 'Capital One Spark Card', 'PayPal Credit', 'Cash', 'ACH / Bank Transfer', 'Other'];
const emptyForm = () => ({ date: dateInput(), category: '', customCategory: '', amount: '', description: '', vendor: '', paymentMethod: '', notes: '' });

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/expenses`);
      if (!response.ok) throw new Error('Failed to load expenses.');
      const data = await response.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setNotice({ type: 'error', message: 'Expenses could not be loaded. Please refresh and try again.' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, []);
  useEffect(() => {
    if (!modalOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape' && !saving) setModalOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [modalOpen, saving]);

  const summary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    let monthTotal = 0; let yearTotal = 0; let allTimeTotal = 0; let monthCount = 0;
    const byCategory = {};
    expenses.forEach((row) => {
      const date = rowDate(row); const amount = amountOf(row.amount);
      allTimeTotal += amount;
      if (date && date >= yearStart && date <= now) yearTotal += amount;
      if (date && date >= monthStart && date <= now) { monthTotal += amount; monthCount += 1; }
      const category = String(row.category || 'Other');
      byCategory[category] = (byCategory[category] || 0) + amount;
    });
    return { monthTotal, yearTotal, allTimeTotal, monthCount, categories: Object.entries(byCategory).sort((a, b) => b[1] - a[1]) };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const search = query.trim().toLowerCase();
    return [...expenses].filter((row) => !search || `${row.description || ''} ${row.vendor || ''} ${row.category || ''} ${row.payment_method || ''}`.toLowerCase().includes(search)).sort((a, b) => String(b.expense_date || '').localeCompare(String(a.expense_date || ''))).slice(0, 50);
  }, [expenses, query]);
  const visibleCategories = showAllCategories ? summary.categories : summary.categories.slice(0, 6);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = amountOf(form.amount);
    if (!form.date || !form.category || !amount || !form.description.trim()) return setNotice({ type: 'error', message: 'Date, category, amount, and description are required.' });
    const category = form.category === 'Other' && form.customCategory.trim() ? form.customCategory.trim() : form.category;
    try {
      setSaving(true); setNotice({ type: '', message: '' });
      const response = await fetch(`${API_URL}/api/expenses`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expense_date: form.date, category, amount, description: form.description.trim(), vendor: form.vendor.trim(), payment_method: form.paymentMethod || null, notes: form.notes.trim() }) });
      if (!response.ok) throw new Error('Failed to save expense.');
      setForm(emptyForm()); setModalOpen(false); setNotice({ type: 'success', message: 'Expense recorded successfully.' });
      await fetchExpenses();
      window.setTimeout(() => setNotice({ type: '', message: '' }), 4000);
    } catch (error) {
      console.error('Error adding expense:', error);
      setNotice({ type: 'error', message: 'The expense could not be saved. Please try again.' });
    } finally { setSaving(false); }
  };

  return <main className="expenses-workspace">
    <header className="expenses-header"><div><span>FINANCE</span><h1>Manual expenses</h1><p>Record expenses that were not imported automatically and review spending activity.</p></div><div className="expenses-header-actions"><Link to="/admin/transactions">Transactions <ArrowUpRight size={16} /></Link><button type="button" onClick={() => { setNotice({ type: '', message: '' }); setModalOpen(true); }}><Plus size={17} /> Add expense</button></div></header>
    {notice.message && !modalOpen && <div className={`expenses-notice ${notice.type}`}>{notice.message}</div>}

    <section className="expenses-summary">
      <article><span><CalendarDays /></span><div><small>THIS MONTH</small><strong>{money(summary.monthTotal)}</strong><p>{summary.monthCount} manual {summary.monthCount === 1 ? 'entry' : 'entries'}</p></div></article>
      <article><span><CircleDollarSign /></span><div><small>YEAR TO DATE</small><strong>{money(summary.yearTotal)}</strong><p>{new Date().getFullYear()} manual expenses</p></div></article>
      <article><span><Tags /></span><div><small>ALL-TIME RECORDED</small><strong>{money(summary.allTimeTotal)}</strong><p>{expenses.length} total {expenses.length === 1 ? 'entry' : 'entries'}</p></div></article>
    </section>

    <section className="expenses-layout">
      <article className="expenses-panel expenses-category-panel"><div className="expenses-panel-heading"><div><span>BREAKDOWN</span><h2>Spending by category</h2><p>All-time manual expense totals</p></div>{summary.categories.length > 6 && <button type="button" onClick={() => setShowAllCategories((value) => !value)}>{showAllCategories ? 'Show top 6' : 'Show all'}</button>}</div>{visibleCategories.length ? <div className="expenses-category-list">{visibleCategories.map(([name, total]) => { const percent = summary.allTimeTotal ? (total / summary.allTimeTotal) * 100 : 0; return <div key={name}><div><strong>{name}</strong><span>{money(total)}</span></div><div className="expense-category-bar"><span style={{ width: `${Math.max(2, percent)}%` }} /></div><small>{percent.toFixed(1)}% of recorded expenses</small></div>; })}</div> : <div className="expenses-empty">No expense categories yet.</div>}</article>

      <article className="expenses-panel expenses-ledger"><div className="expenses-panel-heading"><div><span>ACTIVITY</span><h2>Recent manual expenses</h2><p>Up to 50 most recent entries</p></div><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search expenses..." /></label></div>{loading ? <div className="expenses-empty">Loading expenses...</div> : filteredExpenses.length ? <div className="expenses-table-wrap"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Vendor / method</th><th>Amount</th></tr></thead><tbody>{filteredExpenses.map((row) => <tr key={row.id}><td>{rowDate(row)?.toLocaleDateString() || '—'}</td><td><strong>{row.description || 'Expense'}</strong>{row.notes && <small>{row.notes}</small>}</td><td><span className="expense-category-pill">{row.category || 'Other'}</span></td><td>{row.vendor || '—'}{row.payment_method && <small>{row.payment_method}</small>}</td><td>{money(amountOf(row.amount))}</td></tr>)}</tbody></table></div> : <div className="expenses-empty">No expenses match your search.</div>}</article>
    </section>

    {modalOpen && <div className="expense-modal-backdrop" onMouseDown={() => !saving && setModalOpen(false)}><section className="expense-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="expense-modal-title"><header><div><span>MANUAL ENTRY</span><h2 id="expense-modal-title">Add an expense</h2></div><button type="button" onClick={() => !saving && setModalOpen(false)} aria-label="Close"><X /></button></header>{notice.message && <div className={`expenses-notice ${notice.type}`}>{notice.message}</div>}<form onSubmit={handleSubmit}><div className="expense-form-grid"><label>Date<input type="date" value={form.date} onChange={(event) => updateForm('date', event.target.value)} required /></label><label>Amount<input type="number" min="0.01" step="0.01" value={form.amount} onChange={(event) => updateForm('amount', event.target.value)} placeholder="0.00" required /></label><label>Category<select value={form.category} onChange={(event) => updateForm('category', event.target.value)} required><option value="">Select category</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>{form.category === 'Other' && <label>Custom category<input value={form.customCategory} onChange={(event) => updateForm('customCategory', event.target.value)} placeholder="Cleaning, licenses, etc." /></label>}<label className="wide">Description<input value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="What was purchased?" required /></label><label>Vendor <small>Optional</small><input value={form.vendor} onChange={(event) => updateForm('vendor', event.target.value)} placeholder="Amazon, landlord, etc." /></label><label>Payment method <small>Optional</small><select value={form.paymentMethod} onChange={(event) => updateForm('paymentMethod', event.target.value)}><option value="">Select method</option>{paymentMethods.map((item) => <option key={item}>{item}</option>)}</select></label><label className="wide">Notes <small>Optional</small><textarea rows="3" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder="Receipt, purpose, or additional details" /></label></div><footer><button type="button" onClick={() => !saving && setModalOpen(false)}>Cancel</button><button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save expense'}</button></footer></form></section></div>}
  </main>;
}
