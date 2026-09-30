import { API_BASE_URL } from '../../apiConfig';
// src/components/Admin/Transactions.js
import React, { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import DepositReview from './DepositReview';
import BankingMfa from './BankingMfa';

const Transactions = () => {
  const API_URL = API_BASE_URL;

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
  const [, setCsvRows] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [importing, setImporting] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [plaidItems, setPlaidItems] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidMessage, setPlaidMessage] = useState('');
  const [bankDataLoading, setBankDataLoading] = useState(true);
  const [bankDataError, setBankDataError] = useState('');
  const [reconciliationChoices, setReconciliationChoices] = useState({});

  // ---- Existing expenses controls ----
  const [existingSearch, setExistingSearch] = useState('');
  const [existingLimit, setExistingLimit] = useState(50);

  // ---------------- Helpers ----------------
  const plaidHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('internalAuthToken') || ''}`,
  });
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
      setErrorMessage(error.message);
    }
  };

  const fetchPlaidData = async () => {
    setBankDataLoading(true);
    setBankDataError('');
    try {
      const [itemsResponse, transactionsResponse] = await Promise.all([
        fetch(`${API_URL}/api/plaid/items`, { headers: plaidHeaders() }),
        fetch(`${API_URL}/api/plaid/accounting-transactions?limit=100`, { headers: plaidHeaders() }),
      ]);
      if (!itemsResponse.ok || !transactionsResponse.ok) {
        throw new Error('Failed to load connected bank data');
      }
      const [items, transactions] = await Promise.all([
        itemsResponse.json(),
        transactionsResponse.json(),
      ]);
      setPlaidItems(Array.isArray(items) ? items : []);
      setBankTransactions(Array.isArray(transactions) ? transactions : []);
    } catch (error) {
      console.error('Error fetching Plaid data:', error);
      setBankDataError(error.message);
    } finally {
      setBankDataLoading(false);
    }
  };

  const loadPlaidScript = () => new Promise((resolve, reject) => {
    if (window.Plaid) return resolve();
    const existing = document.querySelector('script[data-ready-plaid-link]');
    if (existing) {
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.dataset.readyPlaidLink = 'true';
    script.onload = resolve;
    script.onerror = () => {
      script.remove();
      reject(new Error('Could not load Plaid. Please check your connection and try again.'));
    };
    document.head.appendChild(script);
  });

  const connectBank = async () => {
    setPlaidLoading(true);
    setPlaidMessage('');
    try {
      await loadPlaidScript();
      const response = await fetch(`${API_URL}/api/plaid/create-link-token`, {
        method: 'POST',
        headers: plaidHeaders(),
        body: JSON.stringify({ userId: 'ready-admin' }),
      });
      const data = await response.json();
      if (!response.ok || !data.link_token) throw new Error(data.error || 'Could not start bank connection');

      const handler = window.Plaid.create({
        token: data.link_token,
        onSuccess: async (publicToken, metadata) => {
          try {
            const exchange = await fetch(`${API_URL}/api/plaid/exchange-token`, {
              method: 'POST',
              headers: plaidHeaders(),
              body: JSON.stringify({ public_token: publicToken, metadata }),
            });
            const exchangeData = await exchange.json();
            if (!exchange.ok) throw new Error(exchangeData.error || 'Could not finish bank connection');
            setPlaidMessage('Bank connected. Transactions are now syncing automatically.');
            await Promise.all([fetchPlaidData(), fetchExpenses()]);
          } catch (error) {
            setErrorMessage(error.message);
          } finally {
            setPlaidLoading(false);
          }
        },
        onExit: () => setPlaidLoading(false),
      });
      handler.open();
    } catch (error) {
      setPlaidLoading(false);
      setErrorMessage(error.message || 'Could not connect bank');
    }
  };

  const syncBanks = async () => {
    setPlaidLoading(true);
    setPlaidMessage('');
    try {
      const response = await fetch(`${API_URL}/api/plaid/sync`, {
        method: 'POST',
        headers: plaidHeaders(),
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Bank sync failed');
      setPlaidMessage('Bank transactions are up to date.');
      await Promise.all([fetchPlaidData(), fetchExpenses()]);
    } catch (error) {
      setErrorMessage(error.message || 'Bank sync failed');
    } finally {
      setPlaidLoading(false);
    }
  };

  const reviewBankTransaction = async (transactionId, action, appCategory, profitId) => {
    try {
      const response = await fetch(`${API_URL}/api/plaid/accounting-transactions/${transactionId}`, {
        method: 'PATCH',
        headers: plaidHeaders(),
        body: JSON.stringify({ action, appCategory, profitId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update transaction');
      await Promise.all([fetchPlaidData(), fetchExpenses()]);
    } catch (error) {
      setErrorMessage(error.message || 'Could not update transaction');
    }
  };

  const loadReconciliationCandidates = async (transactionId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/plaid/accounting-transactions/${transactionId}/reconciliation-candidates`,
        { headers: plaidHeaders() }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not find payment matches');
      setReconciliationChoices((current) => ({
        ...current,
        [transactionId]: {
          options: Array.isArray(data) ? data : [],
          selected: data?.[0]?.id ? String(data[0].id) : '',
        },
      }));
    } catch (error) {
      setErrorMessage(error.message || 'Could not find payment matches');
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchPlaidData();
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
    <div className="transactions-workspace finance-table-workspace" style={{ padding: '1rem' }}>
      <h2>Banking &amp; Transactions</h2>
      <p style={{ opacity: 0.85, marginTop: 0 }}>
        Connected bank transactions flow into Expenses and Profits automatically.
      </p>

      {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
      {errorMessage && <p style={{ color: 'crimson' }}>{errorMessage}</p>}

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 16, marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0 }}>Plaid Bank Connections</h3>
            <p style={{ margin: '6px 0 0', opacity: 0.8 }}>
              Purchases are categorized automatically. Deposits match existing payments first, then use your saved rules. Unknown deposits stay in review.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" onClick={connectBank} disabled={plaidLoading}>
              Connect bank with Plaid
            </button>
            <button type="button" onClick={syncBanks} disabled={plaidLoading || plaidItems.length === 0}>
              {plaidLoading ? 'Working…' : 'Sync now'}
            </button>
          </div>
        </div>
        {plaidMessage && <p role="status">{plaidMessage}</p>}
        {bankDataLoading ? <p role="status">Loading bank connections...</p> : bankDataError ? (
          <div role="alert"><p>{bankDataError}</p><button type="button" onClick={fetchPlaidData}>Retry bank connections</button></div>
        ) : plaidItems.length === 0 ? (
          <p style={{ marginBottom: 0, opacity: 0.75 }}>No bank is connected yet.</p>
        ) : (
          <div style={{ marginTop: 12 }}>
            {plaidItems.map((item) => (
              <div key={item.item_id} style={{ marginBottom: 8 }}>
                <strong>{item.institution_name || 'Connected institution'}</strong>
                {' — '}{item.status === 'active' ? 'Connected' : `Needs attention (${item.error_code || item.status})`}
                {item.last_synced_at && ` · Last synced ${new Date(item.last_synced_at).toLocaleString()}`}
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  {(item.accounts || []).map((account) => `${account.name}${account.mask ? ` ••••${account.mask}` : ''}`).join(', ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {!bankDataLoading && !bankDataError && <DepositReview transactions={bankTransactions} onUpdated={fetchPlaidData} />}
        {bankTransactions.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: 14 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Date</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Account</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Transaction</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Amount</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Category</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Status</th>
                  <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bankTransactions.map((transaction) => (
                  <tr key={transaction.transaction_id}>
                    <td style={{ padding: '0.4rem' }}>{transaction.transaction_date}</td>
                    <td style={{ padding: '0.4rem' }}>
                      {transaction.account_name || 'Account'}{transaction.mask ? ` ••••${transaction.mask}` : ''}
                    </td>
                    <td style={{ padding: '0.4rem' }}>{transaction.merchant_name || transaction.name}</td>
                    <td style={{ padding: '0.4rem' }}>${Math.abs(Number(transaction.amount || 0)).toFixed(2)}</td>
                    <td style={{ padding: '0.4rem' }}>
                      {Number(transaction.amount) < 0 ? (transaction.deposit_kind || 'Deposit') : <select
                        value={transaction.app_category || 'Other'}
                        onChange={(event) => setBankTransactions((rows) => rows.map((row) => (
                          row.transaction_id === transaction.transaction_id
                            ? { ...row, app_category: event.target.value }
                            : row
                        )))}
                      >
                        {categories.map((category) => <option key={category}>{category}</option>)}
                      </select>}
                    </td>
                    <td style={{ padding: '0.4rem' }}>
                      {transaction.pending ? 'Pending' : transaction.review_status}
                      {transaction.linked_profit_description && (
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          Matched: {transaction.linked_profit_description}
                        </div>
                      )}
                      {transaction.linked_square_payout_id && (
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          Verified through Square payout
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.4rem', whiteSpace: 'nowrap' }}>
                      {!transaction.pending && Number(transaction.amount) > 0 && (
                        <button type="button" onClick={() => reviewBankTransaction(
                          transaction.transaction_id,
                          'approve',
                          transaction.app_category
                        )}>Save</button>
                      )}
                      <button
                        type="button"
                        style={{ marginLeft: 6 }}
                        onClick={() => reviewBankTransaction(transaction.transaction_id, 'ignore', transaction.app_category)}
                      >Ignore</button>
                      {['bank_reconciled', 'square_payout_reconciled'].includes(transaction.review_status) && (
                        <button
                          type="button"
                          style={{ marginLeft: 6 }}
                          onClick={() => reviewBankTransaction(transaction.transaction_id, 'unreconcile')}
                        >Unmatch</button>
                      )}
                      {transaction.review_status === 'deposit_unmatched' && !reconciliationChoices[transaction.transaction_id] && (
                        <button
                          type="button"
                          style={{ marginLeft: 6 }}
                          onClick={() => loadReconciliationCandidates(transaction.transaction_id)}
                        >Find payment</button>
                      )}
                      {reconciliationChoices[transaction.transaction_id] && (
                        <div style={{ marginTop: 6 }}>
                          {reconciliationChoices[transaction.transaction_id].options.length ? (
                            <>
                              <select
                                value={reconciliationChoices[transaction.transaction_id].selected}
                                onChange={(event) => setReconciliationChoices((current) => ({
                                  ...current,
                                  [transaction.transaction_id]: {
                                    ...current[transaction.transaction_id],
                                    selected: event.target.value,
                                  },
                                }))}
                              >
                                {reconciliationChoices[transaction.transaction_id].options.map((candidate) => (
                                  <option key={candidate.id} value={candidate.id}>
                                    {candidate.description} · ${Number(candidate.amount).toFixed(2)} · {String(candidate.paid_at || candidate.created_at).slice(0, 10)}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                style={{ marginLeft: 6 }}
                                onClick={() => reviewBankTransaction(
                                  transaction.transaction_id,
                                  'reconcile',
                                  null,
                                  Number(reconciliationChoices[transaction.transaction_id].selected)
                                )}
                              >Match</button>
                            </>
                          ) : <span style={{ fontSize: 12 }}>No same-amount payments found within 7 days.</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CSV Upload */}
      <details style={{ marginTop: 18 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 800 }}>CSV import fallback</summary>
      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: 800 }}>Upload CSV</label>
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
      </details>

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

export { Transactions };
export default function ProtectedTransactions() {
  return <BankingMfa><Transactions /></BankingMfa>;
}
