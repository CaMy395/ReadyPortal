import React, { useState } from 'react';

export const INVENTORY_LOCATIONS = [
  { id: 'charlene', name: 'Charlene' },
  { id: 'ace', name: 'Ace' },
  { id: 'ready_bar', name: 'Ready Bar' },
];
export const locationName = (id) => INVENTORY_LOCATIONS.find((location) => location.id === id)?.name || 'All locations';

export function LocationSelect({ value, onChange, all = false, label = 'Stock location', disabled = false }) {
  return <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
    {label}
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
      {all && <option value="">All locations</option>}
      {INVENTORY_LOCATIONS.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
    </select>
  </label>;
}

export function StockTransfer({ item, initialLocation, apiUrl, onClose, onSaved }) {
  const [from, setFrom] = useState(initialLocation || 'ready_bar');
  const [to, setTo] = useState(initialLocation === 'charlene' ? 'ace' : 'charlene');
  const [quantity, setQuantity] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const available = Number(item.location_available?.[from] ?? item.location_quantities?.[from] ?? 0);
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`${apiUrl}/inventory-transfers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inventory_id: item.id, from_location: from, to_location: to, quantity: Number(quantity) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Transfer failed.');
      onSaved(); onClose();
    } catch (failure) { setError(failure.message); }
    finally { setSaving(false); }
  };
  return <div className="modal-overlay"><div className="modal-content" role="dialog" aria-modal="true" aria-label="Transfer inventory">
    <h3>Transfer {item.item_name}</h3>
    <form onSubmit={submit}>
      <LocationSelect label="From" value={from} onChange={setFrom} disabled={saving} />
      <LocationSelect label="To" value={to} onChange={setTo} disabled={saving} />
      <p>{available} available at {locationName(from)}. Checked-out or missing equipment cannot be transferred.</p>
      <label>Quantity <input aria-label="Transfer quantity" type="number" min="1" max={available} step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required disabled={saving} /></label>
      {error && <p role="alert">{error}</p>}
      <div className="modal-actions">
        <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
        <button type="submit" disabled={saving || from === to || Number(quantity) < 1 || Number(quantity) > available}>{saving ? 'Transferring...' : 'Transfer Stock'}</button>
      </div>
    </form>
  </div></div>;
}
