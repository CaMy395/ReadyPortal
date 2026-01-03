import React, { useState, useEffect, useCallback, useMemo } from 'react';
import '../../App.css';

const Profits = () => {
  const [profits, setProfits] = useState([]);
  const [filteredProfits, setFilteredProfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchCategory, setSearchCategory] = useState('');
  const [startDate, setStartDate] = useState(''); // yyyy-mm-dd
  const [endDate, setEndDate] = useState('');     // yyyy-mm-dd
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Use paid_at when available; fallback to created_at
  const getEffectiveDate = useCallback((profit) => {
    const raw = profit?.paid_at || profit?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, []);

  // Parse amount reliably (even if backend sends it as string)
  const parseAmount = useCallback((val) => {
    const n = parseFloat(String(val ?? '').replace(/[$,]/g, ''));
    return Number.isNaN(n) ? 0 : n;
  }, []);

  // Convert yyyy-mm-dd to local start/end of day
  const startOfDay = useCallback((yyyyMmDd) => {
    if (!yyyyMmDd) return null;
    const d = new Date(yyyyMmDd);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const endOfDay = useCallback((yyyyMmDd) => {
    if (!yyyyMmDd) return null;
    const d = new Date(yyyyMmDd);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // Fetch profits
  useEffect(() => {
    const fetchProfits = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/profits`);
        if (!response.ok) throw new Error('Failed to fetch profits data');
        const data = await response.json();

        // Sort newest-first by effective date
        data.sort((a, b) => {
          const da = getEffectiveDate(a)?.getTime() ?? 0;
          const db = getEffectiveDate(b)?.getTime() ?? 0;
          return db - da;
        });

        setProfits(data);
        setFilteredProfits(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const updateProfits = async () => {
      try {
        await fetch(`${apiUrl}/api/update-profits-from-transactions`, { method: 'POST' });
      } catch (e) {
        console.error('Error updating profits from transactions:', e);
      } finally {
        fetchProfits();
      }
    };

    updateProfits();
  }, [apiUrl, getEffectiveDate]);

  // Apply filters
  useEffect(() => {
    let result = profits;

    // Search filter
    if (searchCategory.trim() !== '') {
      const q = searchCategory.toLowerCase();
      result = result.filter((p) => {
        const cat = String(p.category || '').toLowerCase();
        const desc = String(p.description || '').toLowerCase();
        const type = String(p.type || '').toLowerCase();
        return cat.includes(q) || desc.includes(q) || type.includes(q);
      });
    }

    // Date range filter
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    if (start || end) {
      result = result.filter((p) => {
        const d = getEffectiveDate(p);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    // Keep sorted newest-first
    result = [...result].sort((a, b) => {
      const da = getEffectiveDate(a)?.getTime() ?? 0;
      const db = getEffectiveDate(b)?.getTime() ?? 0;
      return db - da;
    });

    setFilteredProfits(result);
  }, [profits, searchCategory, startDate, endDate, getEffectiveDate, startOfDay, endOfDay]);

  // ✅ Totals derived from filteredProfits (no separate state needed)
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredProfits.forEach((p) => {
      const amt = parseAmount(p.amount);
      const t = String(p.type || '').toLowerCase().trim();

      // Accept common variants just in case: "income", "gig income", "Income ", etc.
      const isIncome = t === 'income' || t.includes('income');
      const isExpense = t === 'expense' || t.includes('expense');

      if (isIncome) income += amt;
      else if (isExpense) expense += Math.abs(amt);
      else {
        // fallback: treat positive as income, negative as expense
        if (amt >= 0) income += amt;
        else expense += Math.abs(amt);
      }
    });

    const net = income - expense;

    return {
      income,
      expense,
      net,
    };
  }, [filteredProfits, parseAmount]);

  return (
    <div className="payouts-container">
      <h1>Profits</h1>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
          placeholder="Search by Category / Description / Type"
          className="filter-input"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="filter-input"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="filter-input"
        />
        <button
          type="button"
          className="filter-input"
          onClick={() => {
            setSearchCategory('');
            setStartDate('');
            setEndDate('');
          }}
        >
          Clear
        </button>
      </div>

      {/* Totals */}
      <div className="totals">
        <p>
          <strong>Total Income: </strong>
          <span style={{ color: 'green' }}>${totals.income.toFixed(2)}</span>
        </p>
        <p>
          <strong>Total Expense: </strong>
          <span style={{ color: 'red' }}>${totals.expense.toFixed(2)}</span>
        </p>
        <p>
          <strong>Net Profit: </strong>
          <span style={{ color: totals.net < 0 ? 'red' : 'green' }}>
            ${totals.net.toFixed(2)}
          </span>
        </p>
      </div>

      {loading && <p>Loading profits...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && filteredProfits.length === 0 && <p>No profits found.</p>}

      {filteredProfits.length > 0 && (
        <div className="table-container">
          <table className="payouts-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Type</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfits.map((p) => {
                const d = getEffectiveDate(p);
                return (
                  <tr key={p.id}>
                    <td>{p.category}</td>
                    <td>{p.description}</td>
                    <td>${parseAmount(p.amount).toFixed(2)}</td>
                    <td>{p.type}</td>
                    <td>{d ? d.toLocaleString() : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Profits;
