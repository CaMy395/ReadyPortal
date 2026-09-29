import express from 'express';
import { loadAccess, verifyAccessToken, permits, validateRole, PERMISSIONS, LOCATION_IDS } from '../services/adminAccess.js';
import { ensureInventoryLocations, readInventory, transaction, lockItem, setLocationQuantity, adjustStock, stockQuantity, transferStock } from '../services/inventoryStock.js';

export default function adminAccessRouter(pool, secret) {
  const router = express.Router();
  const route = handler => async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
      console.error('Admin access request failed:', error.message);
      res.status(error.status || (error.code === '23505' ? 409 : 500)).json({ error: error.code === '23505' ? 'That role name is already in use.' : error.status ? error.message : 'Unable to complete this request.' });
    }
  };
  // Authentication uses current database assignments on every request, so
  // revocation takes effect without waiting for an existing token to expire.
  router.use(async (req, res, next) => {
    try {
      const identity = verifyAccessToken(req.headers.authorization, secret);
      if (!identity) return res.status(401).json({ error: 'Please sign in again.' });
      req.access = await loadAccess(pool, identity.sub);
      if (!req.access) return res.status(403).json({ error: 'Account access is unavailable.' });
      next();
    } catch { res.status(503).json({ error: 'Unable to verify access.' }); }
  });
  router.get('/me', (req, res) => res.json(req.access));
  const admin = (req, res, next) => req.access.fullAdmin ? next() : res.status(403).json({ error: 'Only full administrators can assign access.' });
  router.get('/settings', admin, route(async (req, res) => {
    const roles = await pool.query('SELECT * FROM admin_access_roles ORDER BY name');
    const users = await pool.query(`SELECT u.id, u.name, u.username, u.role, u.is_active,
      COALESCE(array_agg(a.role_id) FILTER (WHERE a.role_id IS NOT NULL), '{}') AS access_role_ids
      FROM users u LEFT JOIN user_admin_access_roles a ON a.user_id=u.id
      GROUP BY u.id ORDER BY u.name, u.username`);
    res.json({ roles: roles.rows, users: users.rows, permissions: PERMISSIONS, locations: LOCATION_IDS });
  }));
  router.get('/task-assignees', admin, route(async (req, res) => {
    const result = await pool.query(`SELECT u.id, u.name, u.username
      FROM users u
      WHERE COALESCE(u.is_active, true)=true
        AND EXISTS (SELECT 1 FROM user_admin_access_roles access WHERE access.user_id=u.id)
      ORDER BY COALESCE(NULLIF(TRIM(u.name), ''), u.username), u.username`);
    res.json(result.rows.map(user => ({
      id: user.id,
      name: String(user.name || user.username || '').trim(),
      username: user.username,
    })).filter(user => user.name));
  }));
  const saveRole = route(async (req, res) => {
    let role;
    try { role = validateRole(req.body || {}); }
    catch (error) { return res.status(400).json({ error: error.message }); }
    const result = req.params.id
      ? await pool.query('UPDATE admin_access_roles SET name=$1, permissions=$2, locations=$3 WHERE id=$4 RETURNING *', [role.name, role.permissions, role.locations, req.params.id])
      : await pool.query('INSERT INTO admin_access_roles (name, permissions, locations) VALUES ($1,$2,$3) RETURNING *', [role.name, role.permissions, role.locations]);
    if (!result.rowCount) return res.status(404).json({ error: 'Role not found.' });
    res.json(result.rows[0]);
  });
  router.post('/roles', admin, saveRole);
  router.put('/roles/:id', admin, saveRole);
  router.put('/users/:id/roles', admin, route(async (req, res) => {
    const ids = req.body?.role_ids;
    if (!Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id) || id < 1)) return res.status(400).json({ error: 'Invalid role selection.' });
    await transaction(pool, async client => {
      const user = await client.query('SELECT id, role FROM users WHERE id=$1 FOR UPDATE', [req.params.id]);
      if (!user.rowCount) throw Object.assign(new Error('User not found.'), { status: 404 });
      if (user.rows[0].role === 'admin') throw Object.assign(new Error('Full administrators already have all access. Assign limited roles to staff accounts.'), { status: 400 });
      const unique = [...new Set(ids)];
      const valid = await client.query('SELECT id FROM admin_access_roles WHERE id=ANY($1::int[]) FOR SHARE', [unique]);
      if (valid.rowCount !== unique.length) throw Object.assign(new Error('One of the selected roles no longer exists.'), { status: 400 });
      await client.query('DELETE FROM user_admin_access_roles WHERE user_id=$1', [req.params.id]);
      for (const id of unique) await client.query('INSERT INTO user_admin_access_roles(user_id,role_id) VALUES ($1,$2)', [req.params.id, id]);
    });
    res.json({ ok: true });
  }));

  function locationAccess(req, permission, location) {
    if (!LOCATION_IDS.includes(location)) throw Object.assign(new Error('Select a valid stock location.'), { status: 400 });
    if (!permits(req.access, permission, location)) throw Object.assign(new Error('You do not have permission for this location.'), { status: 403 });
  }
  router.get('/inventory', route(async (req, res) => {
    const location = req.query.location_id;
    locationAccess(req, 'inventory.view', location);
    await ensureInventoryLocations(pool);
    const rows = await readInventory(pool, location);
    // Deliberate projection: no prices, other locations, supplier details, or
    // global quantities are exposed to a location-scoped inventory helper.
    res.json(rows.filter(row => ['product','rental'].includes(row.item_type)).map(row => ({
      id: row.id, item_name: row.item_name, barcode: row.barcode, category: row.category,
      size_label: row.size_label, tracking_type: row.tracking_type,
      quantity: Number(row.quantity), available: Number(row.location_available?.[location] || 0),
    })));
  }));
  router.patch('/inventory/:id', route(async (req, res) => {
    const { location_id: location, action, quantity } = req.body || {};
    locationAccess(req, 'inventory.manage', location);
    if (!['set','add','use'].includes(action)) return res.status(400).json({ error: 'Choose set, add, or use.' });
    const count = stockQuantity(quantity, action !== 'set');
    await ensureInventoryLocations(pool);
    await transaction(pool, async client => {
      const item = await lockItem(client, Number(req.params.id));
      if (!['product','rental'].includes(item.item_type)) throw Object.assign(new Error('This item does not track stock.'), { status: 400 });
      if (action === 'set') await setLocationQuantity(client, item, location, count);
      else await adjustStock(client, item.id, location, count, action);
    });
    res.json({ ok: true });
  }));
  router.post('/inventory-transfer', route(async (req, res) => {
    const { inventory_id, from_location, to_location, quantity } = req.body || {};
    locationAccess(req, 'inventory.manage', from_location);
    locationAccess(req, 'inventory.manage', to_location);
    await ensureInventoryLocations(pool);
    await transaction(pool, client => transferStock(client, inventory_id, from_location, to_location, quantity));
    res.json({ ok: true });
  }));
  return router;
}
