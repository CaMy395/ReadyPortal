import { sections } from '../../adminPermissions';
import React, { useEffect, useState } from 'react';
import { accessRequest } from '../../apiSession';
import { INVENTORY_LOCATIONS } from './InventoryLocations';

const blankRole = { name: '', permissions: [], locations: [] };
const financeManager = { name: 'Finance & Compliance Manager', permissions: ['home.manage','finance.manage','tasks.manage','inventory.catalog','people.manage'], locations: [] };
export default function AdminAccess() {
  const [data, setData] = useState(null);
  const [role, setRole] = useState(blankRole);
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => setData(await accessRequest('/settings'));
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  const save = async (path, body, method) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await accessRequest(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (path.startsWith('/roles')) setRole(saved);
      await load(); setNotice('Access saved. Changes take effect immediately.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <main className="dashboard-container admin-access-workspace">
    <h1>Roles & Access</h1>
    <p>Create a named role, choose the sections it can manage, and assign it to a person. Existing full administrators keep all access.</p>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!data ? <p>Loading access settings…</p> : <div className="admin-access-layout">
      <section className="card admin-access-card">
        <h2>1. Define a role</h2>
        <label>Role <select value={role.id || ''} disabled={busy} onChange={e => { setNotice(''); setRole(data.roles.find(r => String(r.id) === e.target.value) || { ...blankRole }); }}>
          <option value="">Create new role</option>{data.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select></label>
        <p><button type="button" disabled={busy} onClick={() => { setRole({ ...financeManager }); setNotice('Preset loaded. Adjust access and save the role before assigning it.'); }}>Use Finance & Compliance Manager preset</button></p>
        <form onSubmit={e => { e.preventDefault(); save(role.id ? `/roles/${role.id}` : '/roles', role, role.id ? 'PUT' : 'POST'); }}>
          <fieldset className="admin-access-fieldset" disabled={busy}>
            <legend>Role permissions</legend>
            <label>Role name <input required maxLength={80} value={role.name} onChange={e => setRole({ ...role, name: e.target.value })} placeholder="Ready Bar Inventory" /></label>
            <div className="access-section-options">
              {sections.map(section => <label key={section.permission} className="access-section-option">
                <input type="checkbox" checked={role.permissions.includes(section.permission)} onChange={e => setRole({ ...role, permissions: e.target.checked ? [...role.permissions, section.permission] : role.permissions.filter(p => p !== section.permission) })} />
                <span><strong>{section.label}</strong><small>{section.description}</small></span>
              </label>)}
            </div>
            <label>Location-only inventory access <select value={role.permissions.includes('inventory.manage') ? 'manage' : role.permissions.includes('inventory.view') ? 'view' : 'none'} onChange={e => setRole({ ...role, permissions: [...role.permissions.filter(p => !['inventory.view','inventory.manage'].includes(p)), ...(e.target.value === 'manage' ? ['inventory.view','inventory.manage'] : e.target.value === 'view' ? ['inventory.view'] : [])] })}>
              <option value="none">No location-only access</option><option value="view">View stock only</option><option value="manage">View and update stock</option>
            </select></label>
            {role.permissions.some(p => ['inventory.view','inventory.manage'].includes(p)) && <><p>Allowed inventory locations</p>
            {INVENTORY_LOCATIONS.map(location => <label key={location.id} style={{ display: 'block', margin: 8 }}>
              <input type="checkbox" checked={role.locations.includes(location.id)} onChange={e => setRole({ ...role, locations: e.target.checked ? [...role.locations, location.id] : role.locations.filter(id => id !== location.id) })} /> {location.name}
            </label>)}
            </>}<p>Each section grants access to its pages and management actions. Full inventory access covers every location; location-only access stays limited to stock counts. Only full administrators can assign roles or change administrator accounts.</p>
            {role.id && <p>Editing this role updates access for everyone assigned to it.</p>}
            <button disabled={!role.permissions.length || (role.permissions.some(p => ['inventory.view','inventory.manage'].includes(p)) && !role.locations.length)}>{busy ? 'Saving…' : 'Save role'}</button>
          </fieldset>
        </form>
      </section>
      <section className="card admin-access-card">
        <h2>2. Assign roles to staff</h2>
        <form onSubmit={e => { e.preventDefault(); save(`/users/${userId}/roles`, { role_ids: selected }, 'PUT'); }}>
          <fieldset className="admin-access-fieldset" disabled={busy}>
            <legend>Staff access</legend>
            <label>Staff member <select required value={userId} onChange={e => { setUserId(e.target.value); setSelected(data.users.find(u => String(u.id) === e.target.value)?.access_role_ids || []); setNotice(''); }}>
              <option value="">Select a person</option>{data.users.filter(u => u.role !== 'admin').map(u => <option key={u.id} value={u.id}>{u.name || u.username} (@{u.username}){u.is_active === false ? ' — inactive' : ''}</option>)}
            </select></label>
            {userId && data.roles.map(r => <label key={r.id} style={{ display: 'block', margin: 12 }}>
              <input type="checkbox" checked={selected.includes(r.id)} onChange={e => setSelected(e.target.checked ? [...selected, r.id] : selected.filter(id => id !== r.id))} /> {r.name} — {sections.filter(section => r.permissions.includes(section.permission)).map(section => section.label).concat(r.permissions.includes('inventory.view') ? [`Stock: ${r.locations.map(id => INVENTORY_LOCATIONS.find(l => l.id === id)?.name).join(', ')}`] : []).join(' · ')}
            </label>)}
            <p>Clear all roles to remove limited admin access. Regular staff access remains available.</p>
            <button disabled={!userId}>{busy ? 'Saving…' : 'Save staff access'}</button>
          </fieldset>
        </form>
        <h3>Current assignments</h3>
        <ul>{data.users.filter(u => u.access_role_ids.length).map(u => <li key={u.id}>{u.name || u.username}: {u.access_role_ids.map(id => data.roles.find(r => r.id === id)?.name).join(', ')}</li>)}</ul>
      </section>
    </div>}
  </main>;
}
