import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PackageChecklist from './PackageChecklist';

test('package deductions use exact consumable IDs at the chosen location and exclude reusable tools', async () => {
  const consumable = { id: 1, item_name: 'Vodka', type_key: 'vodka', item_type: 'product', tracking_type: 'consumable', quantity: 12, location_quantities: { ready_bar: 7, ace: 2, charlene: 3 } };
  const tool = { id: 2, item_name: 'Shaker', type_key: 'tools', item_type: 'product', tracking_type: 'reusable', quantity: 1, location_quantities: { ready_bar: 1 } };
  const pkg = { id: 1, package_name: 'Test Package', tier: 'basic', guest_count: 50, service_hours: 4,
    items: [{ id: 11, inventory_id: 1, type_key: 'vodka', quantity: 3 }, { id: 12, inventory_id: 2, type_key: 'tools', quantity: 1 }] };
  global.fetch = jest.fn(async (url) => ({ ok: true, json: async () => {
    if (url.endsWith('/inventory')) return [consumable, tool];
    if (url.endsWith('/package-templates')) return [pkg];
    if (url.endsWith('/package-templates/1')) return pkg;
    return { ok: true };
  } }));
  const confirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
  try {
    render(<PackageChecklist />);
    await screen.findByDisplayValue('Test Package');
    fireEvent.change(screen.getByLabelText('Stock for this package'), { target: { value: 'ace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Deduct Inventory' }));
    expect(screen.getByText(/Not enough stock at Ace/)).toBeVisible();
    expect(fetch.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(0);
    fireEvent.change(screen.getByLabelText('Stock for this package'), { target: { value: 'charlene' } });
    fireEvent.click(screen.getByRole('button', { name: 'Deduct Inventory' }));
    await waitFor(() => expect(fetch.mock.calls.some(([url]) => url.endsWith('/inventory/bulk-adjust'))).toBe(true));
    const call = fetch.mock.calls.find(([url]) => url.endsWith('/inventory/bulk-adjust'));
    expect(JSON.parse(call[1].body)).toEqual({ location_id: 'charlene', items: [{ inventory_id: 1, quantity: 3, action: 'use' }] });
    expect(await screen.findByText('Consumables deducted from Charlene.')).toBeVisible();
  } finally { confirm.mockRestore(); }
});
