import React, { useEffect, useState } from 'react';
import { accessRequest } from '../../apiSession';
import { INVENTORY_LOCATIONS } from './InventoryLocations';

export default function LimitedInventory() {
  const [access, setAccess] = useState(null);
  const [location, setLocation] = useState('');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const allowed = (a, permission, id) => a?.fullAdmin || a?.roles.some(r => r.permissions.includes(permission) && r.locations.includes(id));
  useEffect(() => {
    accessRequest('/me').then(a => {
      setAccess(a); setLocation(INVENTORY_LOCATIONS.find(l => allowed(a, 'inventory.view', l.id))?.id || '');
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!location) return;
    let cancelled = false;
    setItems([]); setLoading(true); setError(''); setEdit(null);
    accessRequest(`/inventory?location_id=${location}`).then(rows => { if (!cancelled) setItems(rows); })
      .catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [location]);
  const save = async e => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await accessRequest(`/inventory/${edit.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location_id: location, action: edit.action, quantity: Number(edit.quantity) }) });
      setEdit(null);
      setItems(await accessRequest(`/inventory?location_id=${location}`));
      setNotice('Stock updated.');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <main style={{ maxWidth: 1100, margin: 'auto', padding: 24 }}>
    <h1>My inventory workspace</h1>
    <p>Manage stock for your assigned locations. Contact a full admin for new products, pricing, or equipment checkout and returns.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {loading && <p role="status">Loading inventory…</p>}
    {access && !location && <p>No inventory access is assigned to your account.</p>}
    {location && <>
      <label>Location <select value={location} disabled={busy} onChange={e => { setLocation(e.target.value); setNotice(''); }}>
        {INVENTORY_LOCATIONS.filter(l => allowed(access, 'inventory.view', l.id)).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select></label>
      <label>Find product or scan barcode <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Product name or barcode" /></label>
      {!allowed(access, 'inventory.manage', location) && <p>You have view-only access at this location.</p>}
      {edit && <form onSubmit={save} className="card" style={{ padding: 20, margin: '20px 0' }}>
        <fieldset disabled={busy}><legend>Update {edit.item_name}</legend>
          <label>Action <select value={edit.action} onChange={e => setEdit({ ...edit, action: e.target.value, quantity: e.target.value === 'set' ? edit.originalQuantity : 1 })}>
            <option value="set">Set counted quantity</option><option value="add">Add received stock</option>
            {edit.tracking_type !== 'reusable' && <option value="use">Remove used stock</option>}
          </select></label>
          <label>Quantity <input required type="number" min={edit.action === 'set' ? 0 : 1} max="2147483647" step="1" value={edit.quantity} onChange={e => setEdit({ ...edit, quantity: e.target.value })} /></label>
          <button type="submit">{busy ? 'Saving…' : 'Save stock'}</button> <button type="button" onClick={() => setEdit(null)}>Cancel</button>
        </fieldset>
      </form>}
      <div className="table-container"><table><thead><tr><th>Product</th><th>Size</th><th>Barcode</th><th>Owned</th><th>Available</th><th>Action</th></tr></thead>
        <tbody>{items.filter(i => `${i.item_name} ${i.barcode || ''} ${i.category || ''}`.toLowerCase().includes(search.toLowerCase())).map(item => <tr key={item.id}>
          <td>{item.item_name}</td><td>{item.size_label}</td><td>{item.barcode}</td><td>{item.quantity}</td><td>{item.available}</td>
          <td>{allowed(access, 'inventory.manage', location) && <button disabled={busy} onClick={() => setEdit({ ...item, originalQuantity: item.quantity, action: 'set' })}>Update stock</button>}</td>
        </tr>)}</tbody></table></div>
    </>}
  </main>;
}
