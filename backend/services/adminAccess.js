import crypto from 'node:crypto';

export const PERMISSIONS = ['inventory.view', 'inventory.manage', 'home.manage', 'schedule.manage', 'finance.manage', 'tasks.manage', 'inventory.catalog', 'people.manage', 'site.manage'];
export const LOCATION_IDS = ['charlene', 'ace', 'ready_bar'];

export function verifyAccessToken(header, secret) {
  try {
    const parts = String(header || '').replace(/^Bearer\s+/i, '').split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expected = Buffer.from(crypto.createHmac('sha256', secret).update(payload).digest('base64url'));
    const actual = Buffer.from(signature);
    if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(decoded.sub) || decoded.sub < 1 || !Number.isFinite(decoded.exp) || decoded.exp <= Date.now() / 1000) return null;
    return decoded;
  } catch { return null; }
}

const initialized = new WeakMap();
export function ensureAdminAccess(pool) {
  if (!initialized.has(pool)) {
    const pending = pool.query(`CREATE TABLE IF NOT EXISTS admin_access_roles (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL UNIQUE,
      permissions TEXT[] NOT NULL DEFAULT '{}', locations TEXT[] NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS user_admin_access_roles (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES admin_access_roles(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, role_id)
    );
    INSERT INTO admin_access_roles (name, permissions, locations)
      VALUES ('Ready Bar Inventory', ARRAY['inventory.view','inventory.manage'], ARRAY['ready_bar'])
      ON CONFLICT (name) DO NOTHING;`);
    initialized.set(pool, pending);
    pending.catch(() => initialized.delete(pool));
  }
  return initialized.get(pool);
}

export async function loadAccess(pool, userId) {
  await ensureAdminAccess(pool);
  const result = await pool.query('SELECT id, role, is_active FROM users WHERE id=$1', [userId]);
  const user = result.rows[0];
  if (!user || user.is_active === false) return null;
  const roles = await pool.query(`SELECT r.* FROM admin_access_roles r
    JOIN user_admin_access_roles a ON a.role_id=r.id WHERE a.user_id=$1 ORDER BY r.name`, [userId]);
  return { userId: user.id, fullAdmin: user.role === 'admin', roles: roles.rows };
}

// Permissions and locations must match within the same role. Never cross-join
// a read-only location from one role with write permission from another.
export function permits(access, permission, location) {
  return Boolean(access?.fullAdmin || access?.roles.some(role =>
    role.permissions.includes(permission) && (!location || role.locations.includes(location))));
}

export function validateRole(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 80) throw new Error('Enter a role name (up to 80 characters).');
  if (!Array.isArray(body.permissions) || !body.permissions.length || body.permissions.some(p => !PERMISSIONS.includes(p))) throw new Error('Select at least one valid permission.');
  if (!Array.isArray(body.locations) || body.locations.some(l => !LOCATION_IDS.includes(l))) throw new Error('Select valid inventory locations.');
  if (body.permissions.some(p => ['inventory.view','inventory.manage'].includes(p)) && !body.locations.length) throw new Error('Select at least one valid location.');
  const permissions = [...new Set(body.permissions)];
  if (permissions.includes('inventory.manage') && !permissions.includes('inventory.view')) permissions.push('inventory.view');
  return { name, permissions, locations: [...new Set(body.locations)] };
}

// Section permissions grant management within that section, not permission to
// administer access. Unknown legacy administrative endpoints remain owner-only.
export function sectionPermissions(path, method) {
  path = path.toLowerCase().replace(/\/+$/, '') || '/';
  const read = ['GET','HEAD'].includes(method);
  if (/^\/api\/site\/admin(?:\/|$)/.test(path)) return ['site.manage'];
  if (/^\/(?:inventory(?:[-/]|$)|package-templates(?:\/|$))/.test(path)) return ['inventory.catalog'];
  if (/^\/api\/(?:plaid(?:\/|$)|quotes(?:\/|$)|client-appointment-balances$|clients-with-cards$|extra-income(?:\/|$)|extra-payouts(?:\/|$)|expenses(?:\/|$)|profits(?:\/|$)|log-profit$|payouts(?:\/|$)|send-quote-email$|charge-saved-card$|sync-clients-to-square$|update-profits-from-transactions$|payments$)/.test(path) || /^\/profits(?:\/|$)/.test(path)) return ['finance.manage'];
  if (/^\/api\/vendor/.test(path)) return ['people.manage', 'finance.manage'];
  if (/^\/api\/(?:clients(?:\/|$)|client-history(?:\/|$))/.test(path)) return ['people.manage','finance.manage'];
  if (/^\/tasks(?:\/|$)/.test(path)) return read ? ['tasks.manage','home.manage'] : ['tasks.manage'];
  if (/^\/api\/announcements(?:\/|$)/.test(path) || /^\/api\/qr-(?:scans|clicks)-summary$/.test(path)) return ['home.manage'];
  if (/^\/api\/(?:intake-forms|rental-inquiries|craft-cocktails|mix-n-sip)(?:\/|$)/.test(path)) return ['tasks.manage'];
  if (/^\/api\/(?:bartending-course|bartending-classes)(?:\/|$)/.test(path)) return ['people.manage','tasks.manage'];
  if (/^\/api\/admin\/(?:users|staff-with-ratings|feedback|training-students|training-courses|training-certificates|bartending-course)(?:\/|$)/.test(path) || /^\/admin\/(?:students|inquiries|classes|class-sessions)(?:\/|$)/.test(path)) return ['people.manage'];
  if (path === '/api/admin-form-reads') return ['tasks.manage'];
  if (/^\/(?:api\/send-(?:campaign|sms-campaign)$|admin\/(?:email-campaign[^/]*|scheduled-campaigns|client-preferences-link)(?:\/|$))/.test(path)) return ['people.manage'];
  if (/^\/(?:api\/admin\/(?:events|attendance)(?:\/|$)|admin\/gigs(?:\/|$)|admin-availability(?:\/|$)|api\/schedule(?:\/|$)|gigs(?:\/|$)|appointments(?:\/|$))/.test(path)) return /\/attendance\/.*\/pay$/.test(path) ? ['finance.manage'] : ['schedule.manage'];
  if (/^\/api\/(?:gigs|appointments)\/[^/]+\/attendance\//.test(path)) return path.endsWith('/pay') ? ['finance.manage'] : ['schedule.manage','people.manage'];
  if (/^\/users\/[^/]+$/.test(path)) return ['people.manage'];
  return [];
}

// Legacy administrative APIs also require a verified full admin. A limited
// inventory role uses only /api/access, never the unrestricted catalog APIs.
export function fullAdminOnly(path, method) {
  path = path.toLowerCase().replace(/\/+$/, '') || '/';
  if (path === '/api/clients/sms-consent') return false;
  if (/^\/api\/bartending-course\/attendance(?:\/|$)/.test(path) || /^\/api\/bartending-course\/[^/]+\/sign-(?:in|out)$/.test(path)) return true;
  // GET /admin/... also contains SPA pages; direct page loads have no API header.
  if (/^\/admin(?:\/|$)/.test(path)) return !['GET', 'HEAD'].includes(method) || ['/admin/scheduled-campaigns', '/admin/email-campaign-log'].includes(path);
  if (/^\/(?:inventory(?:[-/]|$)|package-templates(?:\/|$)|profits(?:\/|$)|sync-old-gigs$|admin-availability(?:\/|$))/.test(path)) return true;
  if (/^\/api\/(?:admin(?:[-/]|$)|site\/admin(?:\/|$)|plaid(?:\/|$)|quotes(?:\/|$)|clients(?:\/|$)|client-history(?:\/|$)|client-appointment-balances$|clients-with-cards$|extra-income(?:\/|$)|extra-payouts(?:\/|$)|expenses(?:\/|$)|profits(?:\/|$)|log-profit$|vendor[^/]*(?:\/|$)|qr-(?:scans|clicks)-summary$|send-(?:quote-email|campaign|sms-campaign)$|charge-saved-card$|sync-clients-to-square$|update-profits-from-transactions$)/.test(path)) return path !== '/api/plaid/webhook';
  if (/^\/api\/payouts(?:\/|$)/.test(path) && path !== '/api/payouts/user') return true;
  if (/^\/users\/[^/]+$/.test(path) && method !== 'GET') return true;
  if (/^\/api\/(?:intake-forms|rental-inquiries|craft-cocktails|mix-n-sip|bartending-classes)(?:\/|$)/.test(path) && method !== 'POST') return true;
  if (/^\/api\/bartending-course(?:\/\d+)?$/.test(path) && method !== 'POST') return true;
  if (/^\/api\/(?:gigs|appointments)\/[^/]+\/attendance\//.test(path)) return true;
  if (/^\/appointments\/[^/]+\/attendance\//.test(path)) return true;
  if (/^\/gigs(?:\/[^/]+)?$/.test(path) && method !== 'GET') return true;
  if (/^\/gigs\/[^/]+\/(?:chat-created|review-sent)$/.test(path)) return true;
  if (/^\/appointments\/[^/]+$/.test(path) && ['PATCH','DELETE','PUT'].includes(method)) return true;
  if (/^\/api\/announcements(?:\/|$)/.test(path) && method !== 'GET') return true;
  if (/^\/api\/schedule\//.test(path) && method !== 'GET') return true;
  return false;
}

export function accessBoundary(pool, secret) {
  return async (req, res, next) => {
    try {
      const requestPath = req.path.toLowerCase().replace(/\/+$/, '') || '/';
      const userResource = requestPath.match(/^\/api\/users\/([^/]+)\/(profile|password|photo|payment-details|ack-staff-terms)$/);
      const profileAuth = userResource && (userResource[2] !== 'photo' || req.method !== 'GET');
      const adminRequired = fullAdminOnly(req.path, req.method) || /^\/tasks(?:\/|$)/.test(requestPath);
      if (!adminRequired && !profileAuth && requestPath !== '/users') return next();
      const identity = verifyAccessToken(req.headers.authorization, secret);
      if (!identity) return res.status(401).json({ error: 'Please sign in again.' });
      const access = await loadAccess(pool, identity.sub);
      if (!access) return res.status(403).json({ error: 'Account access is unavailable.' });
      req.adminAccess = access;
      if (adminRequired && !access.fullAdmin && !sectionPermissions(requestPath, req.method).some(permission => permits(access, permission))) return res.status(403).json({ error: 'Your role does not include access to this section.' });
      const managedUser = requestPath.match(/^\/(?:api\/(?:admin\/)?users|users)\/([^/]+)(?:\/(?:profile|active-status|photo|password|payment-details|ack-staff-terms))?$/);
      if (managedUser && !access.fullAdmin && !['GET','HEAD'].includes(req.method)) {
        const targetId = Number(decodeURIComponent(managedUser[1]));
        const target = await pool.query('SELECT role FROM users WHERE id=$1', [targetId]);
        if (target.rows[0]?.role === 'admin' && targetId !== access.userId) return res.status(403).json({ error: 'Only full administrators can change an administrator account.' });
        // People managers may edit profiles, never elevate account privileges.
        if (req.body && target.rows[0]) req.body.role = target.rows[0].role;
      }
      if (profileAuth && !access.fullAdmin) {
        const ownProfile = Number(decodeURIComponent(userResource[1])) === access.userId;
        const canManagePeople = permits(access, 'people.manage') && ['profile','photo'].includes(userResource[2]);
        const canReadPayment = req.method === 'GET' && userResource[2] === 'payment-details' && permits(access, 'finance.manage');
        if (!ownProfile && !canManagePeople && !canReadPayment) return res.status(403).json({ error: 'You can only access your own profile.' });
        // Existing profile forms send role along with profile fields. Preserve
        // the database role regardless of what the client supplied.
        if (req.body && userResource[2] === 'profile') {
          const user = await pool.query('SELECT role FROM users WHERE id=$1', [Number(decodeURIComponent(userResource[1]))]);
          req.body.role = user.rows[0].role;
        }
      }
      next();
    } catch (error) {
      console.error('Access check failed:', error.message);
      res.status(503).json({ error: 'Unable to verify access. Please try again.' });
    }
  };
}
