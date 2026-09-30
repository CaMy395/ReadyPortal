import sections from './data/adminSections.json';
export { sections };
export const hasPermission = (access, permission) => Boolean(access?.fullAdmin || access?.roles?.some(role => role.permissions.includes(permission)));
const pages = Object.fromEntries(sections.flatMap(section => section.links.map(([, path]) => [path, section.permission])));
Object.assign(pages, {
  '/admin/quotes': 'finance.manage', '/admin/quote-preview': 'finance.manage',
  '/admin/plaid': 'finance.manage', '/admin/extra-income': 'finance.manage',
  '/admin/extra-payouts': 'finance.manage', '/admin/saved-cards': 'finance.manage',
  '/admin/users': 'people.manage', '/admin/backfill-classes': 'people.manage',
});
export function canOpenAdminPage(access, path) {
  if (access?.fullAdmin) return true;
  const page = Object.keys(pages).find(key => path === key || path.startsWith(`${key}/`));
  return Boolean(page && hasPermission(access, pages[page]));
}
