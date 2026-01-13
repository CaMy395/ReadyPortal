// src/components/Admin/Transactions.js
import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

const Transactions = () => {
  const API_URL = process.env.REACT_APP_API_URL;

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

  // ---------------- State ----------------
  const [csvRows, setCsvRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [importing, setImporting] = useState(false);
  const [expenses, setExpenses] = useState([]);

  // ---- Existing expenses controls ----
  const [existingSearch, setExistingSearch] = useState('');
  const [existingLimit, setExistingLimit] = useState(50);

  // ---------------- Helpers ----------------
  const safeTrim = (v) => String(v ?? '').trim();

  const getField = (row, candidates) => {
    if (!row) return '';
    const keys = Object.keys(row);
    for (const c of candidates) {
      const found = keys.find((k) => k.toLowerCase() === String(c).toLowerCase());
      if (
        found &&
        row[found] !== undefined &&
        row[found] !== null &&
        String(row[found]).trim() !== ''
      )
        return row[found];
    }
    return '';
  };

  const normalizeDateToYYYYMMDD = (raw) => {
    const s = safeTrim(raw);
    if (!s) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
      const mm = String(mdy[1]).padStart(2, '0');
      const dd = String(mdy[2]).padStart(2, '0');
      const yyyy = mdy[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    return '';
  };

  const parseMoney = (raw) => {
    const n = parseFloat(String(raw ?? '').replace(/[$,]/g, ''));
    return Number.isNaN(n) ? 0 : n;
  };

  const normalizePaymentMethod = (raw) => {
    const s = safeTrim(raw).toLowerCase();
    if (!s) return '';

    if (s.includes('chase') && s.includes('debit')) return 'Chase Debit Card';
    if (s.includes('chase') && s.includes('credit')) return 'Chase Credit Card';
    if (s.includes('capital one') && s.includes('spark')) return 'Capital One Spark Card';
    if (s.includes('capital one')) return 'Capital One Credit Card';
    if (s.includes('paypal')) return 'PayPal Credit';

    return '';
  };

  const normalizeCategory = (raw) => {
    const s = safeTrim(raw).toLowerCase();
    if (!s) return 'Other';

    const map = [
      { match: ['uber', 'lyft', 'gas', 'auto'], cat: 'Auto' },
      { match: ['rent', 'lease'], cat: 'Rent' },
      { match: ['refund'], cat: 'Refunds' },
      { match: ['reimburse'], cat: 'Reimbursements' },
      { match: ['utility', 'internet', 'electric', 'water'], cat: 'Utilities' },
      { match: ['office'], cat: 'Office Supplies' },
      { match: ['ads', 'marketing', 'promo'], cat: 'Marketing / Advertising' },
      { match: ['software', 'subscription', 'saas'], cat: 'Software / Subscriptions' },
      { match: ['flight', 'hotel', 'travel'], cat: 'Travel' },
      { match: ['liquor', 'inventory', 'bar', 'supplies'], cat: 'Inventory / Bar Supplies' },
      { match: ['tax', 'fee'], cat: 'Taxes / Fees' },
      { match: ['legal'], cat: 'Legal' },
      { match: ['loan'], cat: 'Loans' },
    ];

    for (const m of map) {
      if (m.match.some((x) => s.includes(x))) return m.cat;
    }
    return 'Other';
  };

  // ---------------- Fetch existing expenses ----------------
  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/expenses`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      setExpenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- Duplicate detection ----------------
  const existingExpenseKeySet = useMemo(() => {
    const set = new Set();
    for (const e of expenses) {
      const date = normalizeDateToYYYYMMDD(e.expense_date);
      const amt = Number(e.amount);
      const desc = safeTrim(e.description).toLowerCase();
      if (date && Number.isFinite(amt) && desc) set.add(`${date}|${amt.toFixed(2)}|${desc}`);
    }
    return set;
  }, [expenses]);

  // ---------------- CSV parsing + preview ----------------
  const handleCsvFile = (file) => {
    setSuccessMessage('');
    setErrorMessage('');
    setFileName(file?.name || '');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = Array.isArray(results?.data) ? results.data : [];
        setCsvRows(rows);

        const normalized = rows.map((row, idx) => {
          const date = normalizeDateToYYYYMMDD(getField(row, ['Date', 'Transaction Date', 'Posting Date']));
          const description = safeTrim(getField(row, ['Description', 'Name', 'Merchant', 'Transaction']));
          const vendor = safeTrim(getField(row, ['Merchant', 'Vendor', 'Name']));
          const rmCategory = safeTrim(getField(row, ['Category', 'RocketMoney Category', 'RM Category']));
          const amount = parseMoney(getField(row, ['Amount', 'Debit', 'Charge', 'Spent']));

          const payment = normalizePaymentMethod(getField(row, ['Account', 'Card', 'Payment Method']));
          const cat = normalizeCategory(rmCategory || description);

          const key = `${date}|${Number(amount).toFixed(2)}|${description.toLowerCase()}`;
          const isDuplicate = existingExpenseKeySet.has(key);

          return {
            _rowId: `${idx}-${date}-${amount}-${description}`,
            expense_date: date,
            description,
            vendor,
            rmCategory,
            amount,
            category: cat,
            payment_method: payment,
            isDuplicate,
            // ✅ NEW: selection checkbox (default ON for non-duplicates, OFF for duplicates)
            selected: !isDuplicate,
          };
        });

        setPreviewRows(normalized);
      },
      error: (err) => {
        console.error('CSV parse error:', err);
        setErrorMessage('Failed to parse CSV.');
      },
    });
  };

  const updateRow = (rowId, patch) => {
    setPreviewRows((prev) => prev.map((r) => (r._rowId === rowId ? { ...r, ...patch } : r)));
  };

  // ✅ NEW: bulk selection helpers
  const selectAllNonDuplicates = () => {
    setPreviewRows((prev) => prev.map((r) => ({ ...r, selected: !r.isDuplicate })));
  };

  const selectNone = () => {
    setPreviewRows((prev) => prev.map((r) => ({ ...r, selected: false })));
  };

  const selectedCount = useMemo(() => previewRows.filter((r) => r.selected).length, [previewRows]);
  const duplicateSelectedCount = useMemo(
    () => previewRows.filter((r) => r.selected && r.isDuplicate).length,
    [previewRows]
  );

  const submitImport = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    // ✅ Import only selected rows
    const cleaned = previewRows
      .filter((r) => r.selected)
      .filter((r) => r.expense_date && r.description && Number.isFinite(Number(r.amount)));

    if (cleaned.length === 0) {
      setErrorMessage('No selected rows to import.');
      return;
    }

    try {
      setImporting(true);

      for (const r of cleaned) {
        const resp = await fetch(`${API_URL}/api/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expense_date: r.expense_date,
            category: r.category,
            amount: Number(r.amount),
            description: r.description,
            vendor: r.vendor,
            payment_method: r.payment_method || null,
          }),
        });

        if (!resp.ok) {
          const txt = await resp.text().catch(() => '');
          throw new Error(`Import failed: ${txt || resp.status}`);
        }
      }

      setSuccessMessage(`Imported ${cleaned.length} expenses successfully.`);
      setPreviewRows([]);
      setCsvRows([]);
      setFileName('');
      await fetchExpenses();
    } catch (e) {
      console.error(e);
      setErrorMessage(String(e?.message || 'Import failed.'));
    } finally {
      setImporting(false);
    }
  };

  // ---------------- Existing expenses table ----------------
  const existingFiltered = useMemo(() => {
    const q = String(existingSearch || '').trim().toLowerCase();

    const sorted = [...expenses].sort((a, b) => {
      const da = a?.expense_date ? new Date(a.expense_date).getTime() : 0;
      const db = b?.expense_date ? new Date(b.expense_date).getTime() : 0;
      if (db !== da) return db - da;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });

    if (!q) return sorted;

    return sorted.filter((e) => {
      const hay = [
        e?.category,
        e?.description,
        e?.vendor,
        e?.payment_method,
        e?.expense_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [expenses, existingSearch]);

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Transactions</h2>
      <p style={{ opacity: 0.85, marginTop: 0 }}>
        Import CSV → review rows → fix categories → choose what to import.
      </p>

      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {errorMessage && <p style={{ color: 'crimson' }}>{errorMessage}</p>}

      {/* CSV Upload */}
      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: 800 }}>Upload CSV:</label>
        <div style={{ marginTop: 8 }}>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
          />
          {fileName && <p style={{ fontSize: 12, opacity: 0.8 }}>Loaded: {fileName}</p>}
        </div>
      </div>

      {/* Preview */}
      {previewRows.length > 0 && (
        <>
          <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={submitImport} disabled={importing} style={{ padding: '10px 14px', fontWeight: 900 }}>
              {importing ? 'Importing…' : `Import Selected (${selectedCount})`}
            </button>

            <button type="button" onClick={selectAllNonDuplicates} disabled={importing}>
              Select all non-duplicates
            </button>

            <button type="button" onClick={selectNone} disabled={importing}>
              Select none
            </button>

            {duplicateSelectedCount > 0 && (
              <span style={{ fontSize: 13, color: '#b00020' }}>
                ⚠ You selected {duplicateSelectedCount} duplicates (you can still import them if you want).
              </span>
            )}
          </div>

          <div style={{ overflowX: 'auto', marginTop: 12 }}>
            <table style={{ width: '100%', maxWidth: 1200, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Import? </th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Duplicate? </th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Date</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Amount</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Description</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Vendor</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>RM Category</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Category</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Payment</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r) => (
                  <tr key={r._rowId} style={{ opacity: r.isDuplicate ? 0.6 : 1 }}>
                    <td style={{ padding: '0.35rem 0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={!!r.selected}
                        onChange={(e) => updateRow(r._rowId, { selected: e.target.checked })}
                      />
                    </td>

                    <td style={{ padding: '0.35rem 0.5rem' }}>{r.isDuplicate ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '0.35rem 0.5rem' }}>{r.expense_date}</td>
                    <td style={{ padding: '0.35rem 0.5rem' }}>${Number(r.amount || 0).toFixed(2)}</td>
                    <td style={{ padding: '0.35rem 0.5rem' }}>{r.description}</td>
                    <td style={{ padding: '0.35rem 0.5rem' }}>{r.vendor || '-'}</td>
                    <td style={{ padding: '0.35rem 0.5rem' }}>{r.rmCategory || '-'}</td>

                    <td style={{ padding: '0.35rem 0.5rem' }}>
                      <select
                        value={r.category}
                        onChange={(e) => updateRow(r._rowId, { category: e.target.value })}
                      >
                        {categories.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: '0.35rem 0.5rem' }}>
                      <select
                        value={r.payment_method || ''}
                        onChange={(e) => updateRow(r._rowId, { payment_method: e.target.value })}
                      >
                        {paymentMethods.map((pm) => (
                          <option key={pm} value={pm}>
                            {pm || 'Select method'}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 10, maxWidth: 1100 }}>
            Tip: Rows marked “Duplicate” are detected using Date + Amount + Description against your existing expenses.
            They default to unselected, but you can still check them if you intentionally want to import.
          </p>
        </>
      )}

      {/* Existing (Recent) expenses feed */}
      <hr style={{ margin: '1.5rem 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Recent Expenses</h3>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search description/vendor/category…"
            value={existingSearch}
            onChange={(e) => setExistingSearch(e.target.value)}
            style={{ padding: '8px 10px', minWidth: 240 }}
          />
          <select
            value={existingLimit}
            onChange={(e) => setExistingLimit(Number(e.target.value))}
            style={{ padding: '8px 10px' }}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>

      {expenses.length === 0 ? (
        <p style={{ marginTop: 10, opacity: 0.8 }}>No expenses found yet.</p>
      ) : (
        <div style={{ overflowX: 'auto', maxWidth: 1100, marginTop: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Date</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Category</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Description</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Amount</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Vendor</th>
                <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Payment</th>
              </tr>
            </thead>
            <tbody>
              {existingFiltered.slice(0, existingLimit).map((exp) => (
                <tr key={exp.id || `${exp.expense_date}-${exp.amount}-${exp.description}`}>
                  <td style={{ padding: '0.35rem 0.5rem' }}>
                    {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : ''}
                  </td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>{exp.category || '-'}</td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>{exp.description || '-'}</td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>${Number(exp.amount || 0).toFixed(2)}</td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>{exp.vendor || '-'}</td>
                  <td style={{ padding: '0.35rem 0.5rem' }}>{exp.payment_method || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {existingFiltered.length > existingLimit && (
            <p style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
              Showing {existingLimit} of {existingFiltered.length} matching expenses.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Transactions;
