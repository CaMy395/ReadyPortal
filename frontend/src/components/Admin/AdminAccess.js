import { sections } from '../../adminPermissions';
import React, { useEffect, useRef, useState } from 'react';
import { accessRequest } from '../../apiSession';
import { INVENTORY_LOCATIONS } from './InventoryLocations';
import './AdminAccess.css';

const blankRole = { name: '', permissions: [], locations: [] };
const financeManager = { name: 'Finance & Compliance Manager', permissions: ['home.manage','finance.manage','tasks.manage','inventory.catalog','people.manage'], locations: [] };
export default function AdminAccess() {
  const roleEditor = useRef(null);
  const personEditor = useRef(null);
  const saving = useRef(false);
  const reveal = ref => { ref.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }); ref.current?.focus({ preventScroll: true }); };
  const editRole = saved => { setRole({ ...saved, permissions: [...saved.permissions], locations: [...saved.locations] }); setError(''); setNotice(''); reveal(roleEditor); };
  const [data, setData] = useState(null);
  const [role, setRole] = useState(blankRole);
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState([]);
  const [accessMode, setAccessMode] = useState('roles');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const selectPerson = user => {
    setUserId(user ? String(user.id) : '');
    setSelected([...(user?.access_role_ids || [])]);
    setAccessMode(user?.role === 'admin' && !user.admin_role_limited ? 'full' : 'roles');
    setNotice(''); setError('');
  };
  const selectedUser = data?.users.find(user => String(user.id) === userId);
  const load = async () => { const fresh = await accessRequest('/settings'); setData(fresh); return fresh; };
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  const save = async (path, body, method) => {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const saved = await accessRequest(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (path.startsWith('/roles')) setRole(saved);
      try {
        const fresh = await load();
        if (path.startsWith('/users/') && userId) { const person = fresh.users.find(u => String(u.id) === userId); if (person) selectPerson(person); }
        setNotice('Access saved. Changes take effect immediately.');
      } catch { setNotice('Changes saved, but the list could not refresh. Reload to see the latest assignments.'); }
      window.dispatchEvent(new Event('ready:access-updated'));
    } catch (e) { setError(e.message); }
    finally { saving.current = false; setBusy(false); }
  };
  return <main className="dashboard-container admin-access-workspace">
    <div className="access-hero">
      <div><span className="access-eyebrow">TEAM MANAGEMENT</span><h1>Roles & Access</h1>
      <p>The right tools for every teammate. Create a role, choose its access, and assign your team.</p></div>
      {data && <div className="access-stats"><div><strong>{data.roles.length}</strong><span>Saved roles</span></div><div><strong>{data.users.filter(u => u.is_active !== false).length}</strong><span>Active people</span></div></div>}
    </div>
    {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {!data ? <p>Loading access settings…</p> : <div className="admin-access-layout">
      <section className="card admin-access-card">
        <div className="access-card-heading"><span>01</span><div><h2 ref={roleEditor} tabIndex={-1}>{role.id ? `Edit role: ${role.name}` : 'Build a role'}</h2><p>Choose the tools this role needs.</p></div></div>
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
            {role.id && <button className="access-cancel" type="button" onClick={() => setRole(data.roles.find(r => r.id === role.id) || blankRole)}>Cancel role changes</button>}
          </fieldset>
        </form>
      </section>
      <section className="card admin-access-card">
        <div className="access-card-heading"><span>02</span><div><h2 ref={personEditor} tabIndex={-1}>{selectedUser ? `Edit access: ${selectedUser.name || selectedUser.username}` : 'Give your team access'}</h2><p>Select a person to review or change their roles.</p></div></div>
        <form onSubmit={e => { e.preventDefault(); save(`/users/${userId}/roles`, { role_ids: selected, access_mode: accessMode }, 'PUT'); }}>
          <fieldset className="admin-access-fieldset" disabled={busy}>
            <legend>Staff access</legend>
            <label>Staff member <select required value={userId} onChange={e => selectPerson(data.users.find(u => String(u.id) === e.target.value))}>
              <option value="">Select a person</option>{data.users.filter(u => u.is_active !== false).map(u => <option key={u.id} value={u.id}>{u.name || u.username} (@{u.username}){u.role === 'admin' ? ' — admin' : ''}</option>)}
            </select></label>
            {selectedUser && <label>Admin access <select value={accessMode} onChange={e => setAccessMode(e.target.value)}>
              <option value="full">Full administrator access</option>
              <option value="roles" disabled={selectedUser.id === data.current_user_id}>Assigned roles only</option>
            </select></label>}
            {selectedUser && accessMode !== 'full' && <button type="button" onClick={() => setAccessMode('full')}>Restore full access</button>}
            {selectedUser?.id === data.current_user_id && <p>Your account keeps full access so you can manage the team.</p>}
            {userId && data.roles.map(r => <label key={r.id} style={{ display: 'block', margin: 12 }}>
              <input type="checkbox" disabled={accessMode === 'full'} checked={selected.includes(r.id)} onChange={e => { setSelected(e.target.checked ? [...selected, r.id] : selected.filter(id => id !== r.id)); }} /> {r.name} — {sections.filter(section => r.permissions.includes(section.permission)).map(section => section.label).concat(r.permissions.includes('inventory.view') ? [`Stock: ${r.locations.map(id => INVENTORY_LOCATIONS.find(l => l.id === id)?.name).join(', ')}`] : []).join(' · ')}
            </label>)}
            <p>{accessMode === 'full' ? 'Full access makes this person an administrator with every section, including managing roles. Choose Save staff access to apply.' : 'Only selected roles grant admin access. Clearing every role removes that access; it does not restore full access.'}</p>
            <button disabled={!userId}>{busy ? 'Saving…' : 'Save staff access'}</button>
            {userId && <button className="access-cancel" type="button" onClick={() => selectPerson(selectedUser)}>Cancel access changes</button>}
          </fieldset>
        </form>
        <h3>Current assignments</h3>
        <ul className="access-roster">{data.users.filter(u => u.is_active !== false && (u.role === 'admin' || u.access_role_ids.length)).map(u => <li key={u.id}><span className="access-avatar" aria-hidden="true">{(u.name || u.username || '?').slice(0,1)}</span><div><strong>{u.name || u.username}</strong><small>{u.role === 'admin' && !u.admin_role_limited ? 'Full access' : u.access_role_ids.map(id => data.roles.find(r => r.id === id)?.name).join(', ') || 'No admin access'}</small></div><button type="button" aria-label={`Edit access for ${u.name || u.username}`} disabled={busy} onClick={() => { selectPerson(u); reveal(personEditor); }}>Edit</button></li>)}</ul>
        {data.users.some(u => u.is_active === false && (u.access_role_ids.length || (u.role === 'admin' && !u.admin_role_limited))) && <details>
          <summary>Inactive staff — review existing access</summary>
          <p>Inactive staff are not available for new assignments. You can remove their saved access here.</p>
          <ul>{data.users.filter(u => u.is_active === false && (u.access_role_ids.length || (u.role === 'admin' && !u.admin_role_limited))).map(u => <li key={u.id}>
            {u.name || u.username} — inactive: {u.role === 'admin' && !u.admin_role_limited ? 'Full access; ' : ''}{u.access_role_ids.map(id => data.roles.find(r => r.id === id)?.name).join(', ')}
            <button type="button" disabled={busy} onClick={() => save(`/users/${u.id}/roles`, { role_ids: [], access_mode: 'roles' }, 'PUT')}>Remove saved access for {u.name || u.username}</button>
          </li>)}</ul>
        </details>}
        <h3>Saved roles</h3>
        <ul className="access-roster">{data.roles.map(saved => <li key={saved.id}><div><strong>{saved.name}</strong><small>{saved.permissions.length} permissions · {data.users.filter(u => u.access_role_ids.includes(saved.id)).length} assigned</small></div><button type="button" aria-label={`Edit ${saved.name}`} disabled={busy} onClick={() => editRole(saved)}>Edit</button></li>)}</ul>
      </section>
    </div>}
  </main>;
}
