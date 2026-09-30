import { canOpenAdminPage, hasPermission } from './adminPermissions';
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
