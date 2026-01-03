// src/components/Admin/Transactions.js
import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';

const Transactions = () => {
  const API_URL = process.env.REACT_APP_API_URL;

  // ---- Page constants (RESTORED) ----
  const categories = useMemo(
    () => [
      'Auto',
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
      'Legal Fees',
      'Loans',
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

  // ---- CSV import state ----
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expenses, setExpenses] = useState([]);

  const [csvError, setCsvError] = useState('');
  const [csvInfo, setCsvInfo] = useState('');
  const [csvRows, setCsvRows] = useState([]); // normalized preview rows
  const [importing, setImporting] = useState(false);

  const [skipIncome, setSkipIncome] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // ---------------- Helpers ----------------
  const safeTrim = (v) => (v === null || v === undefined ? '' : String(v).trim());

  const getField = (row, candidates) => {
    for (const c of candidates) {
      if (row[c] !== undefined && row[c] !== null && String(row[c]).trim() !== '') return row[c];
    }
    const keys = Object.keys(row || {});
    for (const c of candidates) {
      const found = keys.find((k) => k.toLowerCase() === String(c).toLowerCase());
      if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') return row[found];
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

  const normalizeAmount = (raw) => {
    const s = safeTrim(raw);
    if (!s) return NaN;
    const cleaned = s.replace(/[$,]/g, '');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  // ✅ Fix: Rocket Money exports often have no Type and all amounts positive.
  // Since this page is "Expenses import", default to EXPENSE.
  const normalizeType = (rawType, rawAmount) => {
    const t = safeTrim(rawType).toLowerCase();

    if (t) {
      if (t.includes('income') || t.includes('credit') || t.includes('deposit')) return 'income';
      if (t.includes('expense') || t.includes('debit') || t.includes('withdraw')) return 'expense';
    }

    const amt = normalizeAmount(rawAmount);
    if (Number.isFinite(amt) && amt < 0) return 'expense';

    return 'expense';
  };

  // Map Rocket Money categories to your portal categories (edit anytime)
  const CATEGORY_MAP = useMemo(
    () => ({
      Advertising: 'Marketing / Advertising',
      Business: 'Business',
      'Dining & Drinks': 'Dining & Drinks',
      Education: 'Education',
      'Home Improvement': 'Home Improvement', 
      Marketing: 'Marketing / Advertising',
      Miscellaneous: 'Miscellaneous',
      Software: 'Software / Subscriptions',
      Subscriptions: 'Software / Subscriptions',
      Office: 'Office Supplies',
      'Office Supplies': 'Office Supplies',
      Travel: 'Travel',
      Transportation: 'Auto',
      Gas: 'Auto',
      Auto: 'Auto',
      Utilities: 'Utilities',
      Fees: 'Taxes / Fees',
      Taxes: 'Taxes / Fees',
      'Bar Supplies': 'Inventory / Bar Supplies',
      Inventory: 'Inventory / Bar Supplies',
      Rent: 'Rent',
      Refunds: 'Refunds',
      Reimbursement: 'Reimbursements',
      Reimbursements: 'Reimbursements',
      Legal: 'Legal Fees',
      'Loan Payment': 'Loans',
    }),
    []
  );

  const mapCategory = (rmCategory) => {
    const c = safeTrim(rmCategory);
    if (!c) return 'Other';

    if (CATEGORY_MAP[c]) return CATEGORY_MAP[c];

    const lower = c.toLowerCase();
    const keys = Object.keys(CATEGORY_MAP);
    const fuzzy = keys.find((k) => lower.includes(k.toLowerCase()));
    if (fuzzy) return CATEGORY_MAP[fuzzy];

    if (categories.includes(c)) return c;

    return 'Other';
  };

  const guessPaymentMethod = (accountRaw) => {
    const a = safeTrim(accountRaw).toLowerCase();
    if (!a) return null;

    if (a.includes('chase') && a.includes('debit')) return 'Chase Debit Card';
    if (a.includes('chase') && (a.includes('credit') || a.includes('sapphire') || a.includes('ink'))) return 'Chase Credit Card';

    if (a.includes('capital one') && a.includes('spark')) return 'Capital One Spark Card';
    if (a.includes('capital one') && (a.includes('credit') || a.includes('card'))) return 'Capital One Credit Card';

    if (a.includes('paypal')) return 'PayPal Credit';

    // super light fallback: if first word matches
    const pm = paymentMethods.find((p) => p && a.includes(p.toLowerCase().split(' ')[0]));
    return pm || null;
  };

  // Build a duplicate key from existing expenses (date+amount+description)
  const existingExpenseKeySet = useMemo(() => {
    const set = new Set();
    for (const e of expenses) {
      const date = e.expense_date ? normalizeDateToYYYYMMDD(e.expense_date) : '';
      const amt = Number(e.amount);
      const desc = safeTrim(e.description).toLowerCase();
      if (date && Number.isFinite(amt) && desc) set.add(`${date}|${amt.toFixed(2)}|${desc}`);
    }
    return set;
  }, [expenses]);

  // ---------------- Fetch existing expenses (for duplicate checking) ----------------
  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/expenses`);
      if (!response.ok) throw new Error('Failed to fetch expenses');
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- CSV parsing + preview ----------------
  const handleCsvFile = (file) => {
    setSuccessMessage('');
    setErrorMessage('');
    setCsvError('');
    setCsvInfo('');
    setCsvRows([]);

    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data || [];
          if (!Array.isArray(data) || data.length === 0) {
            setCsvError('CSV parsed but no rows were found.');
            return;
          }

          const normalized = data
            .map((row, idx) => {
              const dateRaw = getField(row, ['Date', 'Transaction Date', 'Posted Date']);
              const descRaw = getField(row, ['Description', 'Name', 'Details', 'Transaction', 'Original Description']);
              const merchantRaw = getField(row, ['Merchant', 'Vendor', 'Payee', 'Counterparty', 'Description']);
              const categoryRaw = getField(row, ['Category', 'Categories']);
              const amountRaw = getField(row, ['Amount', 'Transaction Amount', 'Value']);
              const typeRaw = getField(row, ['Type', 'Transaction Type', 'Flow']);
              const accountRaw = getField(row, ['Account', 'Account Name', 'Source', 'Payment Method']);
              const notesRaw = getField(row, ['Notes', 'Memo', 'Tags']);

              const date = normalizeDateToYYYYMMDD(dateRaw);
              const txType = normalizeType(typeRaw, amountRaw);
              const amt = normalizeAmount(amountRaw);
              const amountAbs = Number.isFinite(amt) ? Math.abs(amt) : NaN;

              const mappedCategory = mapCategory(categoryRaw);
              const pm = guessPaymentMethod(accountRaw);

              const descriptionFinal = safeTrim(descRaw) || safeTrim(merchantRaw) || 'CSV Import';
              const vendorFinal = safeTrim(merchantRaw) || safeTrim(descRaw) || '';

              const duplicateKey =
                date && Number.isFinite(amountAbs)
                  ? `${date}|${amountAbs.toFixed(2)}|${safeTrim(descriptionFinal).toLowerCase()}`
                  : '';

              const isDuplicate = duplicateKey ? existingExpenseKeySet.has(duplicateKey) : false;

              return {
                _rowId: `${Date.now()}-${idx}`,
                selected: txType === 'expense', // default select only expenses
                date,
                txType,
                category: mappedCategory,
                customCategory: mappedCategory === 'Other' ? safeTrim(categoryRaw) : '',
                amount: amountAbs,
                description: descriptionFinal,
                vendor: vendorFinal,
                payment_method: pm,
                notes: safeTrim(notesRaw),
                rmCategory: safeTrim(categoryRaw),
                account: safeTrim(accountRaw),
                isDuplicate,
              };
            })
            .filter((r) => r.date && Number.isFinite(r.amount) && r.description);

          if (normalized.length === 0) {
            setCsvError('No usable rows found (need Date + Amount + Description).');
            return;
          }

          setCsvRows(normalized);
          setCsvInfo(`Loaded ${normalized.length} rows from CSV.`);
        } catch (e) {
          console.error(e);
          setCsvError('Failed to normalize CSV rows. Check console for details.');
        }
      },
      error: (err) => {
        console.error(err);
        setCsvError('CSV parse error.');
      },
    });
  };

  const toggleAll = (value) => {
    setCsvRows((prev) => prev.map((r) => ({ ...r, selected: value })));
  };

  const updateRow = (rowId, patch) => {
    setCsvRows((prev) => prev.map((r) => (r._rowId === rowId ? { ...r, ...patch } : r)));
  };

  const rowsFilteredForImport = useMemo(() => {
    return csvRows.filter((r) => {
      if (!r.selected) return false;
      if (skipIncome && r.txType === 'income') return false;
      if (skipDuplicates && r.isDuplicate) return false;
      return true;
    });
  }, [csvRows, skipIncome, skipDuplicates]);

  const importSelected = async () => {
    setCsvError('');
    setCsvInfo('');
    setErrorMessage('');
    setSuccessMessage('');

    const toImport = rowsFilteredForImport;
    if (toImport.length === 0) {
      setCsvError('No rows selected to import (or all were filtered out).');
      return;
    }

    setImporting(true);

    try {
      const BATCH_SIZE = 10;
      let importedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < toImport.length; i += BATCH_SIZE) {
        const batch = toImport.slice(i, i + BATCH_SIZE);

        // eslint-disable-next-line no-await-in-loop
        const results = await Promise.allSettled(
          batch.map((r) => {
            const finalCategory =
              r.category === 'Other' && safeTrim(r.customCategory) ? safeTrim(r.customCategory) : r.category;

            return fetch(`${API_URL}/api/expenses`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                expense_date: r.date,
                category: finalCategory,
                amount: Number(r.amount),
                description: r.description,
                vendor: r.vendor,
                payment_method: r.payment_method || null,
                notes: r.notes || `Imported from CSV${r.rmCategory ? ` (RM: ${r.rmCategory})` : ''}`,
              }),
            }).then(async (res) => {
              if (!res.ok) {
                const txt = await res.text().catch(() => '');
                throw new Error(`POST /api/expenses failed: ${res.status} ${txt}`);
              }
              return res.json().catch(() => ({}));
            });
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled') importedCount += 1;
          else failedCount += 1;
        }
      }

      await fetchExpenses();

      setSuccessMessage(`CSV import complete: ${importedCount} imported, ${failedCount} failed.`);
      setCsvRows((prev) =>
        prev.map((r) => {
          const shouldHaveBeenImported =
            r.selected && !(skipIncome && r.txType === 'income') && !(skipDuplicates && r.isDuplicate);
          return shouldHaveBeenImported ? { ...r, selected: false } : r;
        })
      );
    } catch (e) {
      console.error(e);
      setCsvError('Import failed. Check console for details.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h2>Import Expenses from Rocket Money CSV</h2>
      <p style={{ maxWidth: 900 }}>
        Upload your Rocket Money export, review rows, then import selected rows into your existing expenses table.
        <strong> No new backend routes needed.</strong>
      </p>

      {(successMessage || errorMessage) && (
        <div style={{ marginBottom: 12 }}>
          {successMessage && <p style={{ color: 'green', margin: 0 }}>{successMessage}</p>}
          {errorMessage && <p style={{ color: 'crimson', margin: 0 }}>{errorMessage}</p>}
        </div>
      )}

      <div style={{ display: 'grid', gap: 10, maxWidth: 900 }}>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => handleCsvFile(e.target.files?.[0])}
        />

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={skipIncome} onChange={(e) => setSkipIncome(e.target.checked)} />
            Skip income rows (recommended)
          </label>

          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
            Skip duplicates (Date + Amount + Description)
          </label>

          <button type="button" onClick={() => toggleAll(true)} disabled={csvRows.length === 0}>
            Select all
          </button>
          <button type="button" onClick={() => toggleAll(false)} disabled={csvRows.length === 0}>
            Select none
          </button>

          <button
            type="button"
            onClick={importSelected}
            disabled={importing || csvRows.length === 0 || rowsFilteredForImport.length === 0}
          >
            {importing ? 'Importing…' : `Import selected (${rowsFilteredForImport.length})`}
          </button>
        </div>

        {csvInfo && <div style={{ color: '#0a6', fontSize: 13 }}>{csvInfo}</div>}
        {csvError && <div style={{ color: 'crimson', fontSize: 13 }}>{csvError}</div>}
      </div>

      {csvRows.length > 0 && (
        <>
          <h3 style={{ marginTop: 16 }}>CSV Preview</h3>

          <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
            <table style={{ width: '100%', maxWidth: 1200, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Import</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Date</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Type</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Amount</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Description</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Vendor</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>RM Category</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Portal Category</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Payment Method</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Duplicate?</th>
                </tr>
              </thead>

              <tbody>
                {csvRows.map((r) => {
                  const rowDisabled =
                    (skipIncome && r.txType === 'income') || (skipDuplicates && r.isDuplicate);

                  return (
                    <tr key={r._rowId} style={{ opacity: rowDisabled ? 0.55 : 1 }}>
                      <td style={{ padding: '0.35rem 0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={(e) => updateRow(r._rowId, { selected: e.target.checked })}
                        />
                      </td>

                      <td style={{ padding: '0.35rem 0.5rem' }}>{r.date}</td>
                      <td style={{ padding: '0.35rem 0.5rem' }}>{r.txType}</td>
                      <td style={{ padding: '0.35rem 0.5rem' }}>${Number(r.amount).toFixed(2)}</td>
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

                        {r.category === 'Other' && (
                          <div style={{ marginTop: 6 }}>
                            <input
                              type="text"
                              placeholder="Custom category"
                              value={r.customCategory}
                              onChange={(e) => updateRow(r._rowId, { customCategory: e.target.value })}
                              style={{ width: '100%' }}
                            />
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '0.35rem 0.5rem' }}>
                        <select
                          value={r.payment_method || ''}
                          onChange={(e) => updateRow(r._rowId, { payment_method: e.target.value || null })}
                        >
                          {paymentMethods.map((pm) => (
                            <option key={pm} value={pm}>
                              {pm || 'Select method'}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td style={{ padding: '0.35rem 0.5rem' }}>
                        {r.isDuplicate ? 'Yes' : 'No'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p style={{ fontSize: 12, opacity: 0.8, marginTop: 10, maxWidth: 1000 }}>
            Tip: Duplicate is detected using Date + Amount + Description against your existing expenses list.
          </p>
        </>
      )}
    </div>
  );
};

export default Transactions;
