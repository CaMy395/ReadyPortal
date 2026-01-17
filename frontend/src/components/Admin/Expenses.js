// src/components/Admin/Expenses.js
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const Expenses = () => {
  const API_URL = process.env.REACT_APP_API_URL;

  // ---- Manual form state ----
  const [expenseDate, setExpenseDate] = useState('');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ✅ NEW: toggle top vs all categories
  const [showAllCategories, setShowAllCategories] = useState(true);

  const categories = useMemo(
    () => [
      'Auto',
      'Building',
      'Business',
      'Legal',
      'Loans',
      'Rent',
      'Refunds',
      'Reimbursements',
      'Utilities',
      'Office Supplies',
      'Marketing / Advertising',
      'Software / Subscriptions',
      'Travel',
      'Inventory / Bar Supplies',
      'Taxes / Fees',
      'Other',
    ],
    []
  );

  const paymentMethods = useMemo(
    () => [
      '',
      'Chase Debit Card',
      'Chase Credit Card',
      'Capital One Credit Card',
      'Capital One Spark Card',
      'PayPal Credit',
    ],
    []
  );

  const parseAmount = (val) => {
    const n = parseFloat(String(val ?? '').replace(/[$,]/g, ''));
    return Number.isNaN(n) ? 0 : Math.abs(n);
  };

  const money = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '$0.00';
    return `$${num.toFixed(2)}`;
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const resp = await fetch(`${API_URL}/api/expenses`);
      if (!resp.ok) throw new Error('Failed to fetch expenses');
      const data = await resp.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching expenses:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Summary + Category totals ----
  const summary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    const last30Start = new Date(now);
    last30Start.setDate(now.getDate() - 30);

    const startOfDay = (d) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };
    const endOfDay = (d) => {
      const x = new Date(d);
      x.setHours(23, 59, 59, 999);
      return x;
    };

    const monthStartD = startOfDay(monthStart);
    const ytdStartD = startOfDay(ytdStart);
    const last30StartD = startOfDay(last30Start);
    const nowEnd = endOfDay(now);

    let monthTotal = 0;
    let last30Total = 0;
    let ytdTotal = 0;

    const byCategory = {};

    for (const e of expenses) {
      const d = e?.expense_date ? new Date(e.expense_date) : null;
      if (!d || Number.isNaN(d.getTime())) continue;

      const amt = parseAmount(e.amount);

      if (d >= monthStartD && d <= nowEnd) monthTotal += amt;
      if (d >= last30StartD && d <= nowEnd) last30Total += amt;
      if (d >= ytdStartD && d <= nowEnd) ytdTotal += amt;

      const cat = String(e.category || 'Other');
      byCategory[cat] = (byCategory[cat] || 0) + amt;
    }

    // ✅ ALL categories sorted
    const allCategoriesSorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

    return { monthTotal, last30Total, ytdTotal, allCategoriesSorted };
  }, [expenses]);

  const visibleCategories = useMemo(() => {
    if (showAllCategories) return summary.allCategoriesSorted;
    return summary.allCategoriesSorted.slice(0, 6);
  }, [summary.allCategoriesSorted, showAllCategories]);

  const closeModal = () => {
    setIsModalOpen(false);
    setErrorMessage('');
  };

  // Esc closes modal
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    if (isModalOpen) window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!expenseDate || !category || !amount || !description) {
      setErrorMessage('Please fill in date, category, amount, and description.');
      setSuccessMessage('');
      return;
    }

    const finalCategory =
      category === 'Other' && customCategory.trim()
        ? customCategory.trim()
        : category;

    try {
      const resp = await fetch(`${API_URL}/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_date: expenseDate,
          category: finalCategory,
          amount: parseFloat(amount),
          description,
          vendor,
          payment_method: paymentMethod || null,
          notes,
        }),
      });

      if (!resp.ok) throw new Error('Failed to add expense');

      setSuccessMessage('Expense added successfully!');
      setErrorMessage('');

      // Reset fields
      setExpenseDate('');
      setCategory('');
      setCustomCategory('');
      setAmount('');
      setDescription('');
      setVendor('');
      setPaymentMethod('');
      setNotes('');

      setIsModalOpen(false);
      await fetchExpenses();

      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Error adding expense:', err);
      setErrorMessage('Failed to add expense. Please try again.');
      setSuccessMessage('');
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>Business Summary</h2>
          <p style={{ marginTop: 0, opacity: 0.85 }}>
            Snapshot of expenses + quick actions. Full activity is on the Transactions page.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setIsModalOpen(true)} style={{ padding: '10px 14px', fontWeight: 800 }}>
            + Add Manual Expense
          </button>

          <Link to="/admin/transactions" style={{ textDecoration: 'none' }}>
            <button type="button" style={{ padding: '10px 14px' }}>
              View Transactions
            </button>
          </Link>
        </div>
      </div>

      {(successMessage || errorMessage) && (
        <div style={{ marginTop: 10 }}>
          {successMessage && <p style={{ color: 'green', margin: 0 }}>{successMessage}</p>}
          {errorMessage && <p style={{ color: 'crimson', margin: 0 }}>{errorMessage}</p>}
        </div>
      )}

      {/* Summary totals */}
      <div style={{ marginTop: 14, maxWidth: 1100 }}>
        <div style={{ overflowX: 'auto', border: '1px solid #ddd', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #ddd' }}>Metric</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', borderBottom: '1px solid #ddd' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '10px 12px' }}>This month</td>
                <td style={{ padding: '10px 12px', fontWeight: 800 }}>{money(summary.monthTotal)}</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 12px' }}>Last 30 days</td>
                <td style={{ padding: '10px 12px', fontWeight: 800 }}>{money(summary.last30Total)}</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 12px' }}>Year-to-date</td>
                <td style={{ padding: '10px 12px', fontWeight: 800 }}>{money(summary.ytdTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {loading && <p style={{ fontSize: 13, opacity: 0.75, marginTop: 10 }}>Loading…</p>}

        {/* Categories (ALL, with toggle) */}
        {summary.allCategoriesSorted.length > 0 && (
          <div style={{ marginTop: 14, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 800 }}>Category totals</div>

              {summary.allCategoriesSorted.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((s) => !s)}
                  style={{ padding: '8px 10px' }}
                >
                  {showAllCategories ? 'Show top 6' : 'Show all'}
                </button>
              )}
            </div>

            <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {visibleCategories.map(([cat, total]) => (
                <div
                  key={cat}
                  style={{
                    border: '1px solid #eee',
                    borderRadius: 8,
                    padding: 10,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{cat}</span>
                  <span>{money(total)}</span>
                </div>
              ))}
            </div>

            {!showAllCategories && summary.allCategoriesSorted.length > 6 && (
              <p style={{ fontSize: 12, opacity: 0.75, marginTop: 10 }}>
                Showing top 6 of {summary.allCategoriesSorted.length} categories.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ---- Modal: Add Expense ---- */}
      {isModalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 560,
              background: '#fff',
              borderRadius: 12,
              padding: 16,
              boxShadow: '0 12px 35px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <h3 style={{ margin: 0 }}>Add Expense</h3>
              <button type="button" onClick={closeModal} style={{ fontSize: 18, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', marginTop: 12 }}>
              <label>
                Date:
                <input type="date" value={expenseDate} onChange={(ev) => setExpenseDate(ev.target.value)} required />
              </label>

              <label>
                Category:
                <select value={category} onChange={(ev) => setCategory(ev.target.value)} required>
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              {category === 'Other' && (
                <label>
                  Custom Category:
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(ev) => setCustomCategory(ev.target.value)}
                    placeholder="Ex: Licenses, Cleaning, etc."
                  />
                </label>
              )}

              <label>
                Amount:
                <input type="number" step="0.01" value={amount} onChange={(ev) => setAmount(ev.target.value)} required />
              </label>

              <label>
                Description:
                <input
                  type="text"
                  value={description}
                  onChange={(ev) => setDescription(ev.target.value)}
                  placeholder="Ex: Studio rent"
                  required
                />
              </label>

              <label>
                Vendor (optional):
                <input type="text" value={vendor} onChange={(ev) => setVendor(ev.target.value)} placeholder="Ex: Amazon" />
              </label>

              <label>
                Payment Method (optional):
                <select value={paymentMethod} onChange={(ev) => setPaymentMethod(ev.target.value)}>
                  {paymentMethods.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm || 'Select method'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Notes (optional):
                <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={3} />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" style={{ fontWeight: 900 }}>
                  Save
                </button>
              </div>
            </form>

            <p style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              Tip: Press <b>Esc</b> to close.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;
