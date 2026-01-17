import React, { useState, useEffect, useCallback } from 'react';
import '../../App.css';

const Payouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter States
  const [searchName, setSearchName] = useState('');
  const [searchGig, setSearchGig] = useState('');
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // yyyy-mm-dd formatter for <input type="date" />
  const toDateInputValue = useCallback((d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const getDefaultDateRange = useCallback(() => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    return {
      start: toDateInputValue(jan1),
      end: toDateInputValue(now),
    };
  }, [toDateInputValue]);

  const [{ start: defaultStart, end: defaultEnd }] = useState(() => getDefaultDateRange());
  const [startDate, setStartDate] = useState(defaultStart); // yyyy-mm-dd
  const [endDate, setEndDate] = useState(defaultEnd);       // yyyy-mm-dd

  // Helpers to interpret date inputs as local day boundaries
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

  // Filter payouts based on criteria
  useEffect(() => {
    let result = payouts;

    if (searchName.trim() !== '') {
      const lowerSearch = searchName.toLowerCase();
      result = result.filter((payout) =>
        String(payout.name || '').toLowerCase().includes(lowerSearch)
      );
    }

    if (searchGig.trim() !== '') {
      const lowerSearch = searchGig.toLowerCase();
      result = result.filter((payout) =>
        String(payout.gig_name || '').toLowerCase().includes(lowerSearch)
      );
    }

    // Date range filter (payout_date)
    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    if (start || end) {
      result = result.filter((payout) => {
        const d = new Date(payout.payout_date);
        if (Number.isNaN(d.getTime())) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    setFilteredPayouts(result);
  }, [searchName, searchGig, startDate, endDate, payouts, startOfDay, endOfDay]);

  // Calculate total payouts per user
  const calculateTotalsPerUser = () => {
    const totals = {};
    filteredPayouts.forEach((payout) => {
      const name = payout.name || 'Unknown';
      if (!totals[name]) totals[name] = 0;
      totals[name] += parseFloat(payout.payout_amount) || 0;
    });
    return totals;
  };

  // Calculate total payouts overall
  const calculateTotalOverall = () => {
    return filteredPayouts.reduce(
      (sum, payout) => sum + (parseFloat(payout.payout_amount) || 0),
      0
    );
  };

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/payouts`);
        if (!response.ok) throw new Error('Failed to fetch payouts');
        const data = await response.json();
        setPayouts(data);
        setFilteredPayouts(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [apiUrl]);

  const handleClearToCurrentYear = useCallback(() => {
    const { start, end } = getDefaultDateRange();
    setSearchName('');
    setSearchGig('');
    setStartDate(start);
    setEndDate(end);
  }, [getDefaultDateRange]);

  return (
    <div className="payouts-container">
      <h1>Staff Payouts Directory</h1>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder="Search by Staff Name"
          className="filter-input"
        />
        <input
          type="text"
          value={searchGig}
          onChange={(e) => setSearchGig(e.target.value)}
          placeholder="Search by Gig Name"
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
      </div>

      {/* Totals */}
      <div className="totals">
        <div className="totals-header">
          <p className="totals-overall">
            <span className="totals-label">Total Payout Amount</span>
            <span className="totals-value">${calculateTotalOverall().toFixed(2)}</span>
          </p>
        </div>

        <div className="staff-totals-grid">
          {Object.entries(calculateTotalsPerUser())
            .sort((a, b) => b[1] - a[1])
            .map(([name, total]) => (
              <div className="staff-total-pill" key={name} title={name}>
                <span className="staff-name">{name}</span>
                <span className="staff-amount">${Number(total).toFixed(2)}</span>
              </div>
            ))}
        </div>
      </div>

      {loading && <p>Loading payouts...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && filteredPayouts.length === 0 && <p>No payouts found.</p>}

      {filteredPayouts.length > 0 && (
        <div className="table-container">
          <table className="payouts-table">
            <thead>
              <tr>
                <th>Staff</th>
                <th>Gig</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayouts.map((payout) => (
                <tr key={payout.id}>
                  <td>{payout.name}</td>
                  <td>{payout.gig_name || 'N/A'}</td>
                  <td>${parseFloat(payout.payout_amount).toFixed(2)}</td>
                  <td>{new Date(payout.payout_date).toLocaleDateString()}</td>
                  <td>{payout.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Payouts;
