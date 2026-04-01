import React, { useState, useEffect, useCallback, useMemo } from 'react';
import '../../App.css';

const Profits = () => {
  const [profits, setProfits] = useState([]);
  const [filteredProfits, setFilteredProfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    category: '',
    description: '',
    amount: '',
    type: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const toDateInputValue = useCallback((d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const getDefaultDateRange = useCallback(() => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    const future = new Date(now);
    future.setDate(future.getDate() + 7);

    return {
      start: toDateInputValue(jan1),
      end: toDateInputValue(future),
    };
  }, [toDateInputValue]);

  const [searchCategory, setSearchCategory] = useState('');
  const [{ start: defaultStart, end: defaultEnd }] = useState(() => getDefaultDateRange());
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

  const getEffectiveDate = useCallback((profit) => {
    const raw = profit?.paid_at || profit?.created_at;
    if (!raw) return null;
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }, []);

  const parseAmount = useCallback((val) => {
    const n = parseFloat(String(val ?? '').replace(/[$,]/g, ''));
    return Number.isNaN(n) ? 0 : n;
  }, []);

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

  const fetchProfits = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${apiUrl}/api/profits`);
      if (!response.ok) throw new Error('Failed to fetch profits data');

      const data = await response.json();

      data.sort((a, b) => {
        const da = getEffectiveDate(a)?.getTime() ?? 0;
        const db = getEffectiveDate(b)?.getTime() ?? 0;
        return db - da;
      });

      setProfits(data);
      setFilteredProfits(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch profits data');
    } finally {
      setLoading(false);
    }
  }, [apiUrl, getEffectiveDate]);

  useEffect(() => {
    fetchProfits();
  }, [fetchProfits]);

  useEffect(() => {
    let result = profits;

    if (searchCategory.trim() !== '') {
      const q = searchCategory.toLowerCase();
      result = result.filter((p) => {
        const cat = String(p.category || '').toLowerCase();
        const desc = String(p.description || '').toLowerCase();
        const type = String(p.type || '').toLowerCase();
        return cat.includes(q) || desc.includes(q) || type.includes(q);
      });
    }

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

    result = [...result].sort((a, b) => {
      const da = getEffectiveDate(a)?.getTime() ?? 0;
      const db = getEffectiveDate(b)?.getTime() ?? 0;
      return db - da;
    });

    setFilteredProfits(result);
  }, [profits, searchCategory, startDate, endDate, getEffectiveDate, startOfDay, endOfDay]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;

    filteredProfits.forEach((p) => {
      const amount = parseAmount(p.amount);
      const tt = String(p.type || '').toLowerCase().trim();

      const isIncome = tt.includes('income');
      const isExpense =
        tt.includes('expense') ||
        tt.includes('staff payment') ||
        tt.includes('payout') ||
        tt.includes('pay out');

      if (isIncome) income += amount;
      else if (isExpense) expense += Math.abs(amount);
      else {
        if (amount < 0) expense += Math.abs(amount);
        else income += amount;
      }
    });

    const net = income - expense;
    return { income, expense, net };
  }, [filteredProfits, parseAmount]);

  const handleClearToCurrentYear = useCallback(() => {
    const { start, end } = getDefaultDateRange();
    setSearchCategory('');
    setStartDate(start);
    setEndDate(end);
  }, [getDefaultDateRange]);

  const handleShowAllDates = useCallback(() => {
    setSearchCategory('');
    setStartDate('');
    setEndDate('');
  }, []);

  const startEdit = (profit) => {
    setEditingId(profit.id);
    setEditForm({
      category: profit.category || '',
      description: profit.description || '',
      amount: profit.amount ?? '',
      type: profit.type || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({
      category: '',
      description: '',
      amount: '',
      type: '',
    });
  };

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async (id) => {
    try {
      setSavingEdit(true);
      setError(null);

      const response = await fetch(`${apiUrl}/api/profits/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: editForm.category.trim(),
          description: editForm.description.trim(),
          amount: parseAmount(editForm.amount),
          type: editForm.type.trim(),
        }),
      });

      const updated = await response.json();
      if (!response.ok) {
        throw new Error(updated?.error || 'Failed to update profit.');
      }

      setProfits((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
      );

      cancelEdit();
    } catch (err) {
      setError(err.message || 'Failed to update profit.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Delete this profit row? This cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError(null);

      const response = await fetch(`${apiUrl}/api/profits/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to delete profit.');
      }

      setProfits((prev) => prev.filter((p) => p.id !== id));

      if (editingId === id) {
        cancelEdit();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete profit.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="payouts-container">
      <h1>Profits</h1>

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

        <button type="button" className="filter-input" onClick={handleClearToCurrentYear}>
          Clear (This Year)
        </button>

        <button type="button" className="filter-input" onClick={handleShowAllDates}>
          Show All Dates
        </button>
      </div>

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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfits.map((p) => {
                const d = getEffectiveDate(p);
                const isEditing = editingId === p.id;
                const isDeleting = deletingId === p.id;

                return (
                  <tr key={p.id}>
                    <td>
                      {isEditing ? (
                        <input
                          value={editForm.category}
                          onChange={(e) => handleEditChange('category', e.target.value)}
                        />
                      ) : (
                        p.category
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          value={editForm.description}
                          onChange={(e) => handleEditChange('description', e.target.value)}
                          style={{ width: '100%' }}
                        />
                      ) : (
                        p.description
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={(e) => handleEditChange('amount', e.target.value)}
                        />
                      ) : (
                        `$${parseAmount(p.amount).toFixed(2)}`
                      )}
                    </td>

                    <td>
                      {isEditing ? (
                        <input
                          value={editForm.type}
                          onChange={(e) => handleEditChange('type', e.target.value)}
                        />
                      ) : (
                        p.type
                      )}
                    </td>

                    <td>{d ? d.toLocaleString() : '-'}</td>

                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => saveEdit(p.id)}
                            disabled={savingEdit || isDeleting}
                          >
                            {savingEdit ? 'Saving...' : 'Save'}
                          </button>

                          <button
                            onClick={cancelEdit}
                            disabled={savingEdit || isDeleting}
                          >
                            Cancel
                          </button>

                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={savingEdit || isDeleting}
                            style={{
                              background: '#8B0000',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button onClick={() => startEdit(p)} disabled={isDeleting}>
                            Edit
                          </button>

                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={isDeleting}
                            style={{
                              background: '#8B0000',
                              color: '#fff',
                              border: 'none',
                              padding: '6px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                            }}
                          >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
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