import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from 'express';
import { verifyAccessToken, permits, validateRole, fullAdminOnly, accessBoundary, sectionPermissions } from './adminAccess.js';
import adminAccessRouter from '../routes/adminAccess.js';

const secret = 'test-only-secret';
test('admin accounts can be restricted, edited, cleared and restored without self lockout', async t => {
  const users = new Map([[1, { id: 1, role: 'admin', is_active: true }], [2, { id: 2, role: 'admin', is_active: true }]]);
  let assignments = [];
  const finance = { id: 7, name: 'Finance Manager', permissions: ['finance.manage'], locations: [] };
  const query = async (sql, args = []) => {
    if (sql.startsWith('SELECT u.name, u.username')) {
      assert.match(sql, /u.is_active IS NOT FALSE/);
      assert.match(sql, /'tasks.manage'=ANY\(r.permissions\)/);
      return { rows: [{ name: 'New Helper' }, { name: 'Caitlyn Myland' }, { name: 'Matt' }] };
    }
    if (sql.startsWith('SELECT id, role, is_active') || sql.startsWith('SELECT id, role FROM users')) {
      const user = users.get(Number(args[0])); return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }
    if (sql.includes('JOIN user_admin_access_roles')) return { rows: Number(args[0]) === 2 && assignments.includes(7) ? [finance] : [] };
    if (sql.startsWith('SELECT id FROM admin_access_roles')) return { rows: args[0].filter(id => id === 7).map(id => ({ id })), rowCount: args[0].filter(id => id === 7).length };
    if (sql.startsWith('DELETE FROM user_admin_access_roles')) assignments = [];
    if (sql.startsWith('INSERT INTO user_admin_access_roles')) assignments.push(args[1]);
    if (sql.startsWith('UPDATE users SET admin_role_limited')) { users.get(Number(args[1])).admin_role_limited = args[0]; if (args[2]) users.get(Number(args[1])).role = 'admin'; }
    return { rows: [], rowCount: 0 };
  };
  const pool = { query, connect: async () => ({ query, release() {} }) };
  const app = express(); app.use(express.json()); app.use(accessBoundary(pool, secret));
  app.use('/api/access', adminAccessRouter(pool, secret));
  app.get('/api/profits', (_req, res) => res.json({ ok: true }));
  app.get('/api/site/admin/pages', (_req, res) => res.json({ ok: true }));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, user = 2, body) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { method: body ? 'PUT' : 'GET', headers: { Authorization: token(user), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal((await (await request('/api/access/me')).json()).fullAdmin, true);
  const assignees = await (await request('/api/access/task-assignees')).json();
  assert.ok(assignees.some(person => person.name === 'Bryan'));
  assert.ok(assignees.some(person => person.name === 'New Helper'));
  assert.equal(assignees.filter(person => person.name === 'Lyn').length, 1);
  assert.ok(!assignees.some(person => person.name === 'Matt'));
  assert.equal((await request('/api/access/users/2/roles', 1, { role_ids: [7], access_mode: 'roles' })).status, 200);
  assert.equal((await (await request('/api/access/me')).json()).fullAdmin, false);
  assert.equal((await request('/api/profits')).status, 200);
  assert.equal((await request('/api/site/admin/pages')).status, 403);
  assert.equal((await request('/api/access/users/2/roles', 2, { role_ids: [], access_mode: 'full' })).status, 403);
  assert.equal((await request('/api/access/users/2/roles', 1, { role_ids: [], access_mode: 'roles' })).status, 200);
  assert.equal((await request('/api/profits')).status, 403);
  assert.equal((await (await request('/api/access/me')).json()).fullAdmin, false);
  assert.equal((await request('/api/access/users/2/roles', 1, { role_ids: [], access_mode: 'full' })).status, 200);
  assert.equal((await request('/api/site/admin/pages')).status, 200);
  assert.equal((await request('/api/access/users/1/roles', 1, { role_ids: [], access_mode: 'roles' })).status, 400);
  assert.equal((await (await request('/api/access/me', 1)).json()).fullAdmin, true);
  users.set(3, { id: 3, role: 'user', is_active: true });
  assert.equal((await request('/api/access/users/3/roles', 3, { role_ids: [], access_mode: 'full' })).status, 403);
  assert.equal((await request('/api/access/users/3/roles', 1, { role_ids: [], access_mode: 'full' })).status, 200);
  assert.equal((await (await request('/api/access/me', 3)).json()).fullAdmin, true);
  assert.equal((await request('/api/access/users/3/roles', 1, { role_ids: [], access_mode: 'roles' })).status, 200);
  assert.equal((await (await request('/api/access/me', 3)).json()).fullAdmin, false);
});
function token(sub = 2, changes = {}) {
  const payload = Buffer.from(JSON.stringify({ sub, role: 'user', exp: Math.floor(Date.now() / 1000) + 1000, ...changes })).toString('base64url');
  return `Bearer ${payload}.${crypto.createHmac('sha256', secret).update(payload).digest('base64url')}`;
}
const readyRole = { id: 1, name: 'Ready Bar Inventory', permissions: ['inventory.view','inventory.manage'], locations: ['ready_bar'] };

test('signed identity rejects tampering, expiry, invalid subject and extra segments', () => {
  assert.equal(verifyAccessToken(token(), secret).sub, 2);
  for (const invalid of [token() + '.extra', token().slice(0,-4) + 'xxxx', token(2, { exp: 0 }), token(2, { exp: 'invalid' }), token(-1), 'Bearer fake']) assert.equal(verifyAccessToken(invalid, secret), null);
});
test('role permissions cannot combine write access with a read-only location', () => {
  const access = { roles: [readyRole, { permissions: ['inventory.view'], locations: ['ace'] }] };
  assert.equal(permits(access, 'inventory.manage', 'ready_bar'), true);
  assert.equal(permits(access, 'inventory.manage', 'ace'), false);
  assert.equal(permits(access, 'inventory.view', 'ace'), true);
  assert.equal(permits(access, 'inventory.view', 'charlene'), false);
  assert.equal(permits({ fullAdmin: true }, 'inventory.manage', 'ace'), true);
});
test('role input rejects unknown permissions and locations; manage includes view', () => {
  assert.throws(() => validateRole({ name: 'x', permissions: ['admin'], locations: ['ready_bar'] }));
  assert.throws(() => validateRole({ name: 'x', permissions: ['inventory.view'], locations: ['other'] }));
  assert.throws(() => validateRole({ name: 'x', permissions: ['inventory.view'], locations: [] }));
  assert.deepEqual(validateRole({ name: ' Stock ', permissions: ['inventory.manage'], locations: ['ready_bar'] }).permissions, ['inventory.manage','inventory.view']);
});

test('section roles can omit inventory locations and cannot grant access administration', () => {
  assert.deepEqual(validateRole({ name: 'Finance & Compliance Manager', permissions: ['home.manage','finance.manage','tasks.manage','people.manage','inventory.catalog'], locations: [] }).locations, []);
  assert.throws(() => validateRole({ name: 'Owner', permissions: ['access.manage'], locations: [] }));
  assert.deepEqual(sectionPermissions('/api/site/admin/globals/theme', 'PUT'), ['site.manage']);
  assert.deepEqual(sectionPermissions('/api/plaid/create-link-token', 'POST'), ['finance.manage']);
  assert.deepEqual(sectionPermissions('/inventory-checkouts/4/return', 'PATCH'), ['inventory.catalog']);
  assert.deepEqual(sectionPermissions('/api/admin/training-students', 'POST'), ['people.manage']);
  assert.deepEqual(sectionPermissions('/unknown-admin-action', 'POST'), []);
});
test('legacy admin endpoints require full admin while public booking remains available', () => {
  assert.equal(fullAdminOnly('/admin/inventory', 'GET'), false);
  assert.equal(fullAdminOnly('/admin/access', 'GET'), false);
  assert.equal(fullAdminOnly('/admin/scheduled-campaigns', 'GET'), true);
  assert.equal(fullAdminOnly('/admin/students/2/graduate', 'PATCH'), true);
  for (const path of ['/inventory','/inventory-checkouts/4/return','/api/quotes','/api/clients','/api/admin/users/2/profile','/api/profits','/api/plaid/accounts','/API/ADMIN/users/2/profile/','/api/expenses','/api/charge-saved-card']) assert.equal(fullAdminOnly(path, 'GET'), true, path);
  for (const [path, method] of [['/login','POST'], ['/appointments','POST'], ['/api/clients/sms-consent','POST'], ['/api/plaid/webhook','POST'], ['/api/bartending-course','POST'], ['/api/events','GET'], ['/api/assistant','POST']]) assert.equal(fullAdminOnly(path, method), false, path);
});

test('HTTP authorization enforces location scope, read-only access, revocation and profile ownership', async t => {
  let roles = [readyRole];
  let active = true;
  let stock = 8;
  let writes = 0;
  const query = async (sql, args = []) => {
    if (sql.includes('SELECT id, role, is_active, admin_role_limited FROM users')) return { rows: [{ id: args[0], role: args[0] === 1 ? 'admin' : 'user', is_active: active }], rowCount: 1 };
    if (sql.includes('JOIN user_admin_access_roles')) return { rows: roles, rowCount: roles.length };
    if (sql.startsWith('SELECT role FROM users')) return { rows: [{ role: args[0] === 1 ? 'admin' : 'user' }], rowCount: 1 };
    if (sql.startsWith('SELECT i.*')) return { rows: [{ id: 7, item_name: 'Cups', item_type: 'product', quantity: stock, total_quantity: 100, unit_cost: 99, location_quantities: { ready_bar: stock, ace: 92 }, location_available: { ready_bar: stock, ace: 92 } }] };
    if (sql.startsWith('SELECT * FROM inventory WHERE')) return { rows: [{ id: 7, item_type: 'product', quantity: stock }], rowCount: 1 };
    if (sql.includes('AS committed')) return { rows: [{ quantity: stock, committed: 0 }], rowCount: 1 };
    if (sql.startsWith('INSERT INTO inventory_stock')) { stock = args[2]; writes++; }
    return { rows: [], rowCount: 0 };
  };
  const pool = { query, connect: async () => ({ query, release() {} }) };
  const app = express(); app.use(express.json()); app.use(accessBoundary(pool, secret));
  app.use('/api/access', adminAccessRouter(pool, secret));
  app.get('/api/profits', (_req, res) => res.json({ secret: true }));
  app.post('/tasks', (_req, res) => res.json({ ok: true }));
  app.get('/api/site/admin/pages', (_req, res) => res.json({ ok: true }));
  app.patch('/api/admin/users/:id/profile', (req, res) => res.json(req.body));
  app.patch('/api/users/:id/profile', (req, res) => res.json(req.body));
  const server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, options = {}, auth = token()) => fetch(`http://127.0.0.1:${server.address().port}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) } });
  const patch = (path, body, auth) => request(path, { method: 'PATCH', body: JSON.stringify(body) }, auth);
  assert.equal((await request('/api/access/me', {}, '')).status, 401);
  assert.equal((await request('/api/access/settings')).status, 403);
  assert.equal((await request('/api/profits')).status, 403);
  assert.equal((await request('/api/profits', {}, '')).status, 401);
  assert.equal((await request('/api/profits', {}, token(1))).status, 200);
  assert.equal((await request('/api/access/inventory?location_id=ace')).status, 403);
  const rows = await (await request('/api/access/inventory?location_id=ready_bar')).json();
  assert.equal(rows[0].quantity, 8);
  for (const field of ['unit_cost','total_quantity','location_quantities','location_available']) assert.equal(field in rows[0], false, field);
  assert.equal((await patch('/api/access/inventory/7', { location_id: 'ace', action: 'set', quantity: 20 })).status, 403);
  assert.equal(writes, 0);
  assert.equal((await patch('/api/access/inventory/7', { location_id: 'ready_bar', action: 'set', quantity: 12 })).status, 200);
  assert.equal(stock, 12);
  roles = [{ ...readyRole, permissions: ['inventory.view'] }];
  assert.equal((await patch('/api/access/inventory/7', { location_id: 'ready_bar', action: 'set', quantity: 20 })).status, 403);
  assert.equal(writes, 1);
  assert.equal((await patch('/api/users/1/profile', { role: 'admin' })).status, 403);
  assert.equal((await patch('/api/users/%31/profile', { role: 'admin' })).status, 403);
  assert.equal((await patch('/api/users/+1/profile', { role: 'admin' })).status, 403);
  assert.equal((await (await patch('/api/users/%32/profile', { role: 'admin' })).json()).role, 'user');
  assert.equal((await (await patch('/api/users/2/profile', { role: 'admin' })).json()).role, 'user');
  roles = [{ permissions: ['finance.manage'], locations: [] }];
  assert.equal((await request('/api/profits')).status, 200);
  assert.equal((await request('/tasks', { method: 'POST', body: '{}' })).status, 403);
  assert.equal((await request('/api/site/admin/pages')).status, 403);
  assert.equal((await request('/api/access/settings')).status, 403);
  roles = [{ permissions: ['people.manage','tasks.manage'], locations: [] }];
  assert.equal((await patch('/api/admin/users/1/profile', { email: 'changed@example.invalid' })).status, 403);
  assert.equal((await request('/tasks', { method: 'POST', body: '{}' })).status, 200);
  assert.equal((await (await patch('/api/admin/users/3/profile', { role: 'admin', name: 'Updated' })).json()).role, 'user');
  roles = [];
  assert.equal((await request('/api/profits')).status, 403);
  assert.equal((await request('/api/access/inventory?location_id=ready_bar')).status, 403);
  active = false;
  assert.equal((await request('/api/access/me')).status, 403);
});
