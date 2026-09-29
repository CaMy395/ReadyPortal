import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../apiConfig';

const labels = { tips: 'Tips', refund: 'Refund received', transfer: 'Transfer', owner_contribution: 'Owner contribution', other_income: 'Other income' };
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('internalAuthToken') || ''}` });

export default function DepositReview({ transactions, onUpdated }) {
  const [rules, setRules] = useState([]);
  const [editing, setEditing] = useState(null);
  const [kind, setKind] = useState('');
  const [saveRule, setSaveRule] = useState(false);
  const [matchField, setMatchField] = useState('description');
  const [matchValue, setMatchValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmUnmatched, setConfirmUnmatched] = useState(false);

  const loadRules = async () => {
    const response = await fetch(`${API_BASE_URL}/api/plaid/deposit-rules`, { headers: headers() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not load deposit rules.');
    setRules(Array.isArray(data) ? data : []);
  };
  useEffect(() => { loadRules().catch(err => setError(err.message)); }, []);

  const openReview = transaction => {
    setEditing(transaction);
    setKind(transaction.deposit_kind || transaction.suggested_kind || '');
    setSaveRule(false);
    setMatchField(transaction.merchant_name ? 'merchant' : 'description');
    setMatchValue(transaction.merchant_name || transaction.name || '');
    setError('');
    setNotice('');
    setNeedsConfirmation(false);
    setConfirmUnmatched(false);
  };
  const save = async event => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/plaid/accounting-transactions/${encodeURIComponent(editing.transaction_id)}`, {
        method: 'PATCH', headers: headers(),
        body: JSON.stringify({ action: 'classify_deposit', kind, saveRule, confirmUnmatched, rule: { matchField, matchValue } }),
      });
      const data = await response.json();
      if (data.code === 'PAYMENT_MATCH_REVIEW') setNeedsConfirmation(true);
      if (!response.ok) throw new Error(data.error || 'Could not categorize deposit.');
      setEditing(null);
      setNotice(saveRule ? 'Deposit categorized. Rule saved for future and still-unmatched deposits on the next sync.' : 'Deposit categorized.');
      await Promise.all([loadRules(), onUpdated()]);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const toggleRule = async rule => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/plaid/deposit-rules/${rule.id}`, {
        method: 'PATCH', headers: headers(), body: JSON.stringify({ enabled: !rule.enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update rule.');
      await loadRules();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const deposits = transactions.filter(t => !t.pending && !t.removed && Number(t.amount) < 0 && ['deposit_unmatched', 'deposit_classified'].includes(t.review_status));

  return <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 10, marginTop: 16 }}>
    <h3>Deposits & automatic rules</h3>
    <p>Existing payments are matched first. Categorize an unmatched deposit once, then optionally save a rule for the same account and sender or description. Conflicting rules stay in review.</p>
    {error && <p role="alert" style={{ color: 'crimson' }}>{error}</p>}
    {notice && <p role="status">{notice}</p>}
    {deposits.map(t => <div key={t.transaction_id} style={{ borderTop: '1px solid #eee', padding: '10px 0' }}>
      <strong>{t.merchant_name || t.name} · ${Math.abs(Number(t.amount)).toFixed(2)}</strong>
      <div>{String(t.transaction_date).slice(0, 10)} · {t.account_name}{t.mask ? ` ••••${t.mask}` : ''}</div>
      <div>{t.deposit_kind ? `${labels[t.deposit_kind]} · ${t.deposit_source === 'rule' ? 'Automatic rule' : 'Reviewed'}` : `Needs review${t.suggested_kind ? ` · Suggested: ${labels[t.suggested_kind]}` : ''}`}</div>
      {t.review_note && <p>{t.review_note}</p>}
      <button type="button" disabled={busy} onClick={() => openReview(t)}>{t.deposit_kind ? 'Change category' : 'Review deposit'}</button>
    </div>)}
    {!deposits.length && <p>No unmatched or categorized deposits in the loaded transactions.</p>}
    {editing && <form onSubmit={save} style={{ padding: 16, background: '#f6f6f6', borderRadius: 8 }}>
      <h4>Review: {editing.name}</h4>
      <label>Deposit category <select required value={kind} onChange={e => setKind(e.target.value)}>
        <option value="">Choose category</option>
        {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <p>Tips and other income increase income. Refunds reduce expenses. Transfers and owner contributions do not affect profit.</p>
      {needsConfirmation && <label><input type="checkbox" checked={confirmUnmatched} onChange={e => setConfirmUnmatched(e.target.checked)} /> I checked the possible payment matches below. This is a separate deposit, not income already recorded.</label>}
      <label><input type="checkbox" checked={saveRule} onChange={e => setSaveRule(e.target.checked)} /> Categorize matching deposits automatically</label>
      {saveRule && <div>
        <p>Applies only to {editing.account_name || 'this bank account'}{editing.mask ? ` ••••${editing.mask}` : ''}. Choose a phrase specific to this type of deposit, not a general payment service name.</p>
        <label>Match by <select value={matchField} onChange={e => { setMatchField(e.target.value); setMatchValue(e.target.value === 'merchant' ? editing.merchant_name || '' : editing.name || ''); }}>
          <option value="description">Description contains</option><option value="merchant" disabled={!editing.merchant_name}>Sender exactly matches</option>
        </select></label>
        <label>Matching text <input required minLength={4} maxLength={160} value={matchValue} onChange={e => setMatchValue(e.target.value)} /></label>
      </div>}
      <button type="submit" disabled={busy || !kind || (needsConfirmation && !confirmUnmatched)}>{busy ? 'Saving…' : 'Save category'}</button>{' '}
      <button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
    </form>}
    <details style={{ marginTop: 16 }}><summary>Saved deposit rules ({rules.length})</summary>
      <p>Pausing a rule stops future automatic classifications. Existing records remain unchanged until reviewed or updated by the bank.</p>
      {!rules.length && <p>No rules yet. Review a deposit to create one.</p>}
      {rules.map(rule => <div key={rule.id} style={{ padding: '8px 0' }}>
        <strong>{labels[rule.kind]}</strong> · {rule.match_field === 'merchant' ? 'Sender equals' : 'Description contains'} “{rule.match_value}” · {rule.account_name}{rule.mask ? ` ••••${rule.mask}` : ''} · {rule.enabled ? 'Active' : 'Paused'}{' '}
        <button type="button" disabled={busy} onClick={() => toggleRule(rule)}>{rule.enabled ? 'Pause' : 'Enable'}</button>
      </div>)}
    </details>
  </section>;
}
