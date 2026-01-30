import React, { useState, useEffect, useCallback } from 'react';
import '../../App.css';

const Payouts = () => {
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // ✅ mode toggle
  const [mode, setMode] = useState('contractors'); // 'contractors' | 'vendors'

  // Contractors
  const [payouts, setPayouts] = useState([]);
  const [filteredPayouts, setFilteredPayouts] = useState([]);

  // Vendors (Business expenses from profits)
  const [vendorExpenses, setVendorExpenses] = useState([]);
  const [filteredVendorExpenses, setFilteredVendorExpenses] = useState([]);

  // Shared
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Vendor actions state
  const [syncingVendors, setSyncingVendors] = useState(false);
  const [addingVendorName, setAddingVendorName] = useState(null);

  // Filter States
  const [searchName, setSearchName] = useState(''); // staff OR vendor
  const [searchGig, setSearchGig] = useState('');   // contractors only
  const [searchDesc, setSearchDesc] = useState(''); // vendors only

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
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);

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

  // Fetch vendor expenses (Business)
  const fetchVendorExpenses = useCallback(async () => {
    const response = await fetch(`${apiUrl}/api/vendor-expenses`);
    if (!response.ok) throw new Error('Failed to fetch vendor expenses');
    const data = await response.json();

    // Only rows with a vendor value
    const vendorRows = (Array.isArray(data) ? data : []).filter(
      (e) => String(e.vendor || '').trim() !== ''
    );

    setVendorExpenses(vendorRows);
    setFilteredVendorExpenses(vendorRows);
  }, [apiUrl]);

  // Fetch contractor payouts
  const fetchPayouts = useCallback(async () => {
    const response = await fetch(`${apiUrl}/api/payouts`);
    if (!response.ok) throw new Error('Failed to fetch payouts');
    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    setPayouts(rows);
    setFilteredPayouts(rows);
  }, [apiUrl]);

  // ✅ Fetch data for current mode
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        if (mode === 'contractors') {
          await fetchPayouts();
        } else {
          await fetchVendorExpenses();
        }
      } catch (err) {
        setError(err.message || 'Error loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mode, fetchPayouts, fetchVendorExpenses]);

  // ✅ Filter contractors
  useEffect(() => {
    if (mode !== 'contractors') return;

    let result = payouts;

    if (searchName.trim() !== '') {
      const lower = searchName.toLowerCase();
      result = result.filter((p) => String(p.name || '').toLowerCase().includes(lower));
    }

    if (searchGig.trim() !== '') {
      const lower = searchGig.toLowerCase();
      result = result.filter((p) => String(p.gig_name || '').toLowerCase().includes(lower));
    }

    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    if (start || end) {
      result = result.filter((p) => {
        const d = new Date(p.payout_date);
        if (Number.isNaN(d.getTime())) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    setFilteredPayouts(result);
  }, [mode, payouts, searchName, searchGig, startDate, endDate, startOfDay, endOfDay]);

  // ✅ Filter vendors
  useEffect(() => {
    if (mode !== 'vendors') return;

    let result = vendorExpenses;

    if (searchName.trim() !== '') {
      const lower = searchName.toLowerCase();
      result = result.filter((e) => String(e.vendor || '').toLowerCase().includes(lower));
    }

    if (searchDesc.trim() !== '') {
      const lower = searchDesc.toLowerCase();
      result = result.filter((e) => {
        const desc = String(e.description || '').toLowerCase();
        const cat = String(e.category || '').toLowerCase();
        return desc.includes(lower) || cat.includes(lower);
      });
    }

    const start = startOfDay(startDate);
    const end = endOfDay(endDate);

    if (start || end) {
      result = result.filter((e) => {
        const d = new Date(e.expense_date);
        if (Number.isNaN(d.getTime())) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    setFilteredVendorExpenses(result);
  }, [mode, vendorExpenses, searchName, searchDesc, startDate, endDate, startOfDay, endOfDay]);

  // Totals (contractors)
  const calculateTotalsPerContractor = () => {
    const totals = {};
    filteredPayouts.forEach((p) => {
      const name = p.name || 'Unknown';
      if (!totals[name]) totals[name] = 0;
      totals[name] += parseFloat(p.payout_amount) || 0;
    });
    return totals;
  };

  const calculateTotalContractorsOverall = () => {
    return filteredPayouts.reduce((sum, p) => sum + (parseFloat(p.payout_amount) || 0), 0);
  };

  // Totals (vendors)
  const calculateTotalsPerVendor = () => {
    const totals = {};
    filteredVendorExpenses.forEach((e) => {
      const vendor = e.vendor || 'Unknown Vendor';
      if (!totals[vendor]) totals[vendor] = 0;
      totals[vendor] += parseFloat(e.amount) || 0;
    });
    return totals;
  };

  const calculateTotalVendorsOverall = () => {
    return filteredVendorExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  };

  const handleClearToCurrentYear = useCallback(() => {
    const { start, end } = getDefaultDateRange();
    setSearchName('');
    setSearchGig('');
    setSearchDesc('');
    setStartDate(start);
    setEndDate(end);
  }, [getDefaultDateRange]);

  // ✅ Add vendor from row (creates user role=vendor)
  const handleAddVendorFromRow = async (vendorName) => {
    const clean = String(vendorName || '').trim();
    if (!clean) return;

    try {
      setAddingVendorName(clean);

      const res = await fetch(`${apiUrl}/api/vendors/from-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clean }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to add vendor');
      }

      await fetchVendorExpenses(); // refresh badges
    } catch (err) {
      console.error('Add vendor from row failed:', err);
      alert('Failed to add vendor. Check server logs.');
    } finally {
      setAddingVendorName(null);
    }
  };

  // ✅ Bulk sync vendors from Business expenses
  const handleSyncVendors = async () => {
    try {
      setSyncingVendors(true);

      const res = await fetch(`${apiUrl}/api/vendors/sync-from-business-expenses`, {
        method: 'POST',
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to sync vendors');
      }

      const payload = await res.json().catch(() => null);
      if (payload?.created != null) {
        alert(`Vendor sync complete: created ${payload.created}, skipped ${payload.skipped || 0}`);
      } else {
        alert('Vendor sync complete.');
      }

      await fetchVendorExpenses(); // refresh badges
    } catch (err) {
      console.error('Vendor sync failed:', err);
      alert('Vendor sync failed. Check server logs.');
    } finally {
      setSyncingVendors(false);
    }
  };

  const title =
    mode === 'contractors'
      ? 'Contractor Payouts (Staff)'
      : 'Vendor Expenses (Business)';

  return (
    <div className="payouts-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ margin: 0 }}>{title}</h1>

          {mode === 'vendors' && (
            <button
              type="button"
              onClick={handleSyncVendors}
              disabled={syncingVendors}
              style={{ opacity: syncingVendors ? 0.7 : 1 }}
            >
              {syncingVendors ? 'Syncing…' : 'Sync Vendors'}
            </button>
          )}
        </div>

        {/* Toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setMode('contractors')}
            style={{ fontWeight: mode === 'contractors' ? 700 : 400, opacity: mode === 'contractors' ? 1 : 0.75 }}
          >
            Contractors
          </button>
          <button
            type="button"
            onClick={() => setMode('vendors')}
            style={{ fontWeight: mode === 'vendors' ? 700 : 400, opacity: mode === 'vendors' ? 1 : 0.75 }}
          >
            Vendors
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          placeholder={mode === 'contractors' ? 'Search by Staff Name' : 'Search by Vendor Name'}
          className="filter-input"
        />

        {mode === 'contractors' ? (
          <input
            type="text"
            value={searchGig}
            onChange={(e) => setSearchGig(e.target.value)}
            placeholder="Search by Gig Name"
            className="filter-input"
          />
        ) : (
          <input
            type="text"
            value={searchDesc}
            onChange={(e) => setSearchDesc(e.target.value)}
            placeholder="Search by Category / Description"
            className="filter-input"
          />
        )}

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
            <span className="totals-label">
              {mode === 'contractors' ? 'Total Payout Amount' : 'Total Vendor Expense Amount'}
            </span>
            <span className="totals-value">
              $
              {mode === 'contractors'
                ? calculateTotalContractorsOverall().toFixed(2)
                : calculateTotalVendorsOverall().toFixed(2)}
            </span>
          </p>
        </div>

        <div className="staff-totals-grid">
          {Object.entries(mode === 'contractors' ? calculateTotalsPerContractor() : calculateTotalsPerVendor())
            .sort((a, b) => b[1] - a[1])
            .map(([name, total]) => (
              <div className="staff-total-pill" key={name} title={name}>
                <span className="staff-name">{name}</span>
                <span className="staff-amount">${Number(total).toFixed(2)}</span>
              </div>
            ))}
        </div>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {/* Contractors table */}
      {!loading && !error && mode === 'contractors' && (
        <>
          {filteredPayouts.length === 0 ? (
            <p>No payouts found.</p>
          ) : (
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
                  {filteredPayouts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.name}</td>
                      <td>{p.gig_name || 'N/A'}</td>
                      <td>${parseFloat(p.payout_amount).toFixed(2)}</td>
                      <td>{new Date(p.payout_date).toLocaleDateString()}</td>
                      <td>{p.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Vendors table */}
      {!loading && !error && mode === 'vendors' && (
        <>
          {filteredVendorExpenses.length === 0 ? (
            <p>No vendor expenses found.</p>
          ) : (
            <div className="table-container">
              <table className="payouts-table">
                <thead>
                  <tr>
                    <th>Vendor</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendorExpenses.map((e) => {
                    const vendorName = e.vendor || '';
                    const exists = e.exists_in_users === true;

                    return (
                      <tr key={e.id}>
                        <td>{vendorName}</td>
                        <td>
                          {exists ? (
                            <span style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid #2e7d32' }}>
                              In Vendors
                            </span>
                          ) : (
                            <span style={{ padding: '4px 8px', borderRadius: 999, border: '1px solid #b71c1c' }}>
                              Not in Vendors
                            </span>
                          )}
                        </td>
                        <td>{e.category || '-'}</td>
                        <td>${parseFloat(e.amount).toFixed(2)}</td>
                        <td>{new Date(e.expense_date).toLocaleDateString()}</td>
                        <td>{e.description || '-'}</td>
                        <td>{e.payment_method || '-'}</td>
                        <td>
                          {exists ? (
                            <span style={{ opacity: 0.7 }}>—</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddVendorFromRow(vendorName)}
                              disabled={addingVendorName === vendorName}
                              style={{ opacity: addingVendorName === vendorName ? 0.7 : 1 }}
                            >
                              {addingVendorName === vendorName ? 'Adding…' : 'Add as Vendor'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            “Sync Vendors” creates vendor users from Business expenses. “Add as Vendor” creates just that vendor.
          </p>
        </>
      )}
    </div>
  );
};

export default Payouts;
