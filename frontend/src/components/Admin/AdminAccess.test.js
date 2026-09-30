import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminAccess from './AdminAccess';
import LimitedInventory from './LimitedInventory';
import { accessRequest } from '../../apiSession';

jest.mock('../../apiSession', () => ({ accessRequest: jest.fn() }));
const role = { id: 1, name: 'Ready Bar Inventory', permissions: ['inventory.view','inventory.manage'], locations: ['ready_bar'] };
beforeEach(() => accessRequest.mockReset());

test('finance manager preset is editable and saves section permissions without stock locations', async () => {
  accessRequest.mockImplementation(path => Promise.resolve(path === '/settings' ? { roles: [], users: [] } : { id: 2, name: 'Finance & Compliance Manager', permissions: ['finance.manage'], locations: [] }));
  render(<AdminAccess />);
  fireEvent.click(await screen.findByRole('button', { name: 'Use Finance & Compliance Manager preset' }));
  expect(screen.getByLabelText('Role name')).toHaveValue('Finance & Compliance Manager');
  expect(screen.getByRole('checkbox', { name: /^Finance / })).toBeChecked();
  expect(screen.getByRole('checkbox', { name: /^Schedule & Events/ })).not.toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Save role' }));
  await waitFor(() => expect(accessRequest).toHaveBeenCalledWith('/roles', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Finance & Compliance Manager', permissions: ['home.manage','finance.manage','tasks.manage','inventory.catalog','people.manage'], locations: [] }) })));
});

test('admin assigns Ready Bar role and can remove all assignments', async () => {
  const settings = { roles: [role], users: [{ id: 2, name: 'Matt', username: 'matt', role: 'user', access_role_ids: [] }] };
  accessRequest.mockImplementation((path, options) => {
    if (path === '/settings') return Promise.resolve(settings);
    settings.users[0].access_role_ids = JSON.parse(options.body).role_ids;
    return Promise.resolve({ ok: true });
  });
  render(<AdminAccess />);
  fireEvent.change(await screen.findByLabelText('Staff member'), { target: { value: '2' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Ready Bar Inventory/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save staff access' }));
  await waitFor(() => expect(accessRequest).toHaveBeenCalledWith('/users/2/roles', expect.objectContaining({ method: 'PUT', body: '{"role_ids":[1]}' })));
  await screen.findByRole('status');
  fireEvent.click(screen.getByRole('checkbox', { name: /Ready Bar Inventory/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save staff access' }));
  await waitFor(() => expect(accessRequest).toHaveBeenCalledWith('/users/2/roles', expect.objectContaining({ body: '{"role_ids":[]}' })));
});

test('helper sees only assigned location and sends scoped count update', async () => {
  accessRequest.mockImplementation(path => Promise.resolve(path === '/me' ? { roles: [role] } : path.startsWith('/inventory?') ? [{ id: 7, item_name: 'Cups', quantity: 8, available: 8 }] : { ok: true }));
  render(<LimitedInventory />);
  await screen.findByText('Cups');
  expect(screen.queryByRole('option', { name: 'Ace' })).toBeNull();
  expect(screen.queryByRole('option', { name: 'Charlene' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Update stock' }));
  fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save stock' }));
  await waitFor(() => expect(accessRequest).toHaveBeenCalledWith('/inventory/7', expect.objectContaining({ method: 'PATCH', body: '{"location_id":"ready_bar","action":"set","quantity":12}' })));
  await screen.findByText('Stock updated.');
});

test('view-only role cannot open stock editor', async () => {
  accessRequest.mockImplementation(path => Promise.resolve(path === '/me' ? { roles: [{ ...role, permissions: ['inventory.view'] }] } : [{ id: 7, item_name: 'Cups', quantity: 8, available: 8 }]));
  render(<LimitedInventory />);
  await screen.findByText('Cups');
  expect(screen.queryByRole('button', { name: 'Update stock' })).toBeNull();
  expect(screen.getByText('You have view-only access at this location.')).toBeTruthy();
});
