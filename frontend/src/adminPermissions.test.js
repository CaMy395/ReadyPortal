import { canOpenAdminPage, hasPermission, portalRole, assignedPreviewAccess } from './adminPermissions';
test('limited admin previews include only their assigned sections and retain staff navigation', () => {
  const user = { role: 'admin', admin_role_limited: true, access_role_ids: [2] };
  const access = assignedPreviewAccess(user, [
    { id: 1, permissions: ['finance.manage'] },
    { id: 2, permissions: ['home.manage', 'tasks.manage', 'social.manage', 'schedule.manage'] },
  ]);
  expect(portalRole(user)).toBe('user');
  expect(access.fullAdmin).toBe(false);
  for (const path of ['/admin/dashboard', '/admin/mytasks', '/admin/content-studio', '/admin/upcoming-events']) expect(canOpenAdminPage(access, path)).toBe(true);
  expect(canOpenAdminPage(access, '/admin/transactions')).toBe(false);
  expect(canOpenAdminPage(access, '/admin/access')).toBe(false);
  expect(assignedPreviewAccess(undefined, []).roles).toEqual([]);
});
test('section permissions cover detail pages without unlocking other sections or access settings', () => {
  const access = { roles: [{ permissions: ['finance.manage','tasks.manage'], locations: [] }] };
  expect(canOpenAdminPage(access, '/admin/quotes-dashboard')).toBe(true);
  expect(canOpenAdminPage(access, '/admin/quote-preview/45')).toBe(true);
  expect(canOpenAdminPage(access, '/admin/mytasks')).toBe(true);
  for (const path of ['/admin/access','/admin/inventory','/admin/userlist','/admin/site-content']) expect(canOpenAdminPage(access, path)).toBe(false);
  expect(canOpenAdminPage({ fullAdmin: true }, '/admin/access')).toBe(true);
  expect(hasPermission(null, 'finance.manage')).toBe(false);
});
test('location-only stock access never unlocks the global inventory catalog', () => {
  expect(canOpenAdminPage({ roles: [{ permissions: ['inventory.view','inventory.manage'], locations: ['ready_bar'] }] }, '/admin/inventory')).toBe(false);
});
