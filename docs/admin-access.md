# Limited inventory roles

Full administrators can open **People & Training → Roles & Access** to create named inventory roles and assign one or more roles to existing staff accounts.

The initial **Ready Bar Inventory** role allows viewing and updating stock only at Ready Bar. Select Matt's existing account, check that role, and save. Do not change his ordinary account role to `admin`: full administrators retain unrestricted access. No live staff assignment is made by this code change.

Each role has view-only or stock-management permission and an explicit set of locations. Staff keep their regular staff access and get a **My Inventory** navigation link. Stock managers can set counts, add received stock, or remove consumed stock. Reusable equipment cannot be consumed; shared product editing, prices, new products, checkout/returns, and deletion use the full-admin inventory screen. Other admin modules are not yet assignable as limited roles.

The server reads current role assignments and active-account status on every protected request. Location and permission must be granted together by a single role. Clearing assigned roles revokes access immediately; stock values and pricing for other locations are excluded from limited inventory responses. Existing inventory/catalog APIs require full-admin authentication. Administrative finance, staff-management, and other administrative API paths are also guarded. Staff profile writes preserve the database role and enforce ownership.

## Deployment

- Deploy backend and frontend together. The API session adapter attaches the existing signed login token to API fetch and axios requests.
- Configure a stable `INTERNAL_AUTH_SECRET` on every backend instance. The existing fallback generates a process-local secret, so restart invalidates sessions and multiple instances cannot share them.
- Existing sessions without a valid signed token must sign out and sign in again.
- The first access request creates `admin_access_roles` and `user_admin_access_roles` and seeds the default role. The database account needs permission to create these tables. Existing user roles and inventory balances are unchanged.
- Refresh the staff page after assigning access to update its navigation. Each API request independently checks current permissions.

## Validation

Run `node --test backend/services/adminAccess.test.js backend/services/inventoryStock.test.js` from the repository root. Inventory database integration tests require their existing test-database configuration; without it, they are skipped. The new HTTP tests use a database stub to verify access enforcement, response projection, stock writes, profile ownership, and revocation.

Frontend tests: run the React test runner for `src/components/Admin/AdminAccess.test.js`. These cover assigning/removing roles, location restrictions, view-only UI, and stock updates. The production build currently has pre-existing hook dependency warnings outside the new files.
