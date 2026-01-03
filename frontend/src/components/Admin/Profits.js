import React, { useState, useEffect, useCallback } from 'react';
import '../../App.css';

const Profits = () => {
  const [profits, setProfits] = useState([]);
  const [filteredProfits, setFilteredProfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totals, setTotals] = useState({
    income: 0,
    expense: 0,
    net: 0,
  });

  // Filter states
  const [searchCategory, setSearchCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Use paid_at when available; fallback to created_at
  const getEffectiveDate = useCallback((profit) => {
    const raw = profit?.paid_at || profit?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, []);

  // Calculate totals (use profit.type instead of category)
  const calculateTotals = useCallback(() => {
    let income = 0;
    let expense = 0;

    filteredProfits.forEach((profit) => {
      const amount = parseFloat(profit.amount);
      if (Number.isNaN(amount)) {
        console.warn('Invalid amount detected:', profit.amount);
        return;
      }

      const t = String(profit.type || '').toLowerCase();

      if (t === 'income') {
        income += amount;
      } else if (t === 'expense') {
        expense += Math.abs(amount); // treat expenses as positive for total
      }
    });

    return {
      income: income.toFixed(2),
      expense: expense.toFixed(2),
      net: (income - expense).toFixed(2),
    };
  }, [filteredProfits]);

  // Fetch profits data
  useEffect(() => {
    const fetchProfits = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/profits`);
        if (!response.ok) {
          throw new Error('Failed to fetch profits data');
        }
        const data = await response.json();

        // Optional: client-side sort by effective date newest-first
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

    // Fetch and update profits with credit card transactions
    const updateProfits = async () => {
      try {
        await fetch(`${apiUrl}/api/update-profits-from-transactions`, {
          method: 'POST',
        });

        // Refresh profits data
        fetchProfits();
      } catch (error) {
        console.error('Error updating profits from transactions:', error);
      }
    };

    updateProfits();
    fetchProfits();
  }, [apiUrl, getEffectiveDate]);

  // Update totals whenever filtered changes
  useEffect(() => {
    if (filteredProfits.length > 0) {
      setTotals(calculateTotals());
    } else {
      setTotals({ income: 0, expense: 0, net: 0 });
    }
  }, [filteredProfits, calculateTotals]);

  // Filter profits data based on criteria
  useEffect(() => {
    let result = profits;

    if (searchCategory.trim() !== '') {
      const lowerSearch = searchCategory.toLowerCase();
      result = result.filter((profit) => {
        const cat = String(profit.category || '').toLowerCase();
        const desc = String(profit.description || '').toLowerCase();
        const type = String(profit.type || '').toLowerCase();
        return (
          cat.includes(lowerSearch) ||
          desc.includes(lowerSearch) ||
          type.includes(lowerSearch)
        );
      });
    }

    if (startDate) {
      const start = new Date(startDate);
      result = result.filter((profit) => {
        const d = getEffectiveDate(profit);
        return d ? d >= start : false;
      });
    }

    // Keep sorted by effective date
    result = [...result].sort((a, b) => {
      const da = getEffectiveDate(a)?.getTime() ?? 0;
      const db = getEffectiveDate(b)?.getTime() ?? 0;
      return db - da;
    });

    setFilteredProfits(result);
  }, [searchCategory, startDate, profits, getEffectiveDate]);

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
      </div>

      {/* Totals */}
      <div className="totals">
        <p>
          <strong>Total Income: </strong>
          <span style={{ color: 'green' }}>${totals.income}</span>
        </p>
        <p>
          <strong>Total Expense: </strong>
          <span style={{ color: 'red' }}>${totals.expense}</span>
        </p>
        <p>
          <strong>Net Profit: </strong>
          <span style={{ color: Number(totals.net) < 0 ? 'red' : 'green' }}>
            ${totals.net}
          </span>
        </p>
      </div>

      {/* Show loading, error, or the data */}
      {loading && <p>Loading profits...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && filteredProfits.length === 0 && <p>No profits found.</p>}

      {/* Display table if profits exist */}
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
              {filteredProfits.map((profit) => {
                const d = getEffectiveDate(profit);
                return (
                  <tr key={profit.id}>
                    <td>{profit.category}</td>
                    <td>{profit.description}</td>
                    <td>${parseFloat(profit.amount).toFixed(2)}</td>
                    <td>{profit.type}</td>
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
