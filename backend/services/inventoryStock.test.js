import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import pg from 'pg';
import express from 'express';
import inventoryRouter from '../routes/inventory.js';
import { stockQuantity, locationId, transaction, adjustStock, transferStock, lockItem, setLocationQuantity, readInventory } from './inventoryStock.js';

test('location and quantity validation rejects ambiguous or invalid writes', () => {
  for (const value of ['', 'all', null, 'Charlene']) assert.throws(() => locationId(value));
  assert.equal(locationId('charlene'), 'charlene');
  for (const value of ['', null, true, -1, 0.5, NaN, Infinity]) assert.throws(() => stockQuantity(value));
  assert.equal(stockQuantity(0), 0);
  assert.throws(() => stockQuantity(0, true));
});

// Opt in only against the throwaway localhost cluster; never use DATABASE_URL.
const enabled = process.env.RUN_INVENTORY_DB_TESTS === '1';
let pool, server, base, schema;
const options = { host: '127.0.0.1', port: 55439, user: 'ready_test', database: 'postgres' };
const migration = await fs.readFile(new URL('../sql/inventory_locations.sql', import.meta.url), 'utf8');
before(async () => {
  if (!enabled) return;
  schema = `inventory_test_${Date.now()}`;
  const setup = new pg.Client(options);
  await setup.connect();
  await setup.query(`CREATE SCHEMA ${schema}`);
  await setup.end();
  pool = new pg.Pool({ ...options, options: `-c search_path=${schema}` });
  await pool.query(`CREATE TABLE inventory (
    id serial PRIMARY KEY, item_name text NOT NULL, quantity integer DEFAULT 0, barcode text UNIQUE,
    item_type text DEFAULT 'product', tracking_type varchar DEFAULT 'consumable', category text,
    type_key text, unit_cost numeric DEFAULT 0, client_price numeric, store text, size_label text,
    is_active boolean DEFAULT true, price_updated_at timestamptz, updated_at timestamptz);
    CREATE TABLE inventory_checkouts (id serial PRIMARY KEY, inventory_item_id integer REFERENCES inventory(id),
    quantity integer, return_quantity integer DEFAULT 0, status varchar DEFAULT 'out',
    checkout_type text, gig_id integer, person_name text, user_id integer, expected_return timestamptz,
    condition_out text, notes text, created_by integer);
    INSERT INTO inventory (item_name, barcode, quantity) VALUES ('Existing stock', 'legacy', 20);
    INSERT INTO inventory_checkouts (inventory_item_id,quantity) VALUES (1,3);`);
  const app = express(); app.use(express.json()); app.use(inventoryRouter(pool));
  server = await new Promise((resolve) => { const listening = app.listen(0, '127.0.0.1', () => resolve(listening)); });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (!enabled) return;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); }
});
async function request(path, body, method = 'POST') {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}
async function create(name, quantity = 10, location_id = 'ready_bar', tracking_type = 'consumable') {
  const result = await request('/inventory', { item_name: name, barcode: name, quantity, location_id, tracking_type });
  assert.equal(result.status, 201, JSON.stringify(result.data));
  return result.data;
}
const dbtest = (name, fn) => test(name, { skip: !enabled }, fn);

dbtest('migration preserves legacy totals and checkout origin, and reruns without resetting transfers', async () => {
  const initial = await request('/inventory', undefined, 'GET');
  assert.equal(initial.status, 200);
  assert.equal(initial.data[0].location_quantities.ready_bar, 20);
  assert.equal(initial.data[0].location_available.ready_bar, 17);
  await transaction(pool, (client) => transferStock(client, 1, 'ready_bar', 'ace', 5));
  await pool.query(migration);
  const [item] = await readInventory(pool, null, 1);
  assert.equal(item.total_quantity, 20);
  assert.deepEqual(item.location_quantities, { ready_bar: 15, ace: 5 });
  const checkout = await pool.query('SELECT location_id FROM inventory_checkouts WHERE id=1');
  assert.equal(checkout.rows[0].location_id, 'ready_bar');
});

dbtest('scanner, scoped reads, edits, and transfers preserve the global total', async () => {
  const item = await create('bottles');
  assert.equal((await request(`/inventory/${item.barcode}`, { location_id: 'ace', action: 'add', quantity: 4 }, 'PATCH')).status, 200);
  assert.equal((await request('/inventory-transfers', { inventory_id: item.id, from_location: 'ready_bar', to_location: 'charlene', quantity: 3 })).status, 200);
  const edit = await request('/inventory/bottles', { item_name: 'bottles', location_id: 'ace', quantity: 2 }, 'PUT');
  assert.equal(edit.status, 200);
  assert.deepEqual(edit.data.location_quantities, { ready_bar: 7, ace: 2, charlene: 3 });
  assert.equal(edit.data.total_quantity, 12);
  const scoped = await request('/inventory?location_id=charlene', undefined, 'GET');
  assert.equal(scoped.data.find((row) => row.id === item.id).quantity, '3');
  const missingLocation = await request('/inventory/bottles', { action: 'use', quantity: 1 }, 'PATCH');
  assert.equal(missingLocation.status, 400);
});

dbtest('overdraw and same-location transfer fail without touching either location', async () => {
  const item = await create('limited', 2, 'ace');
  for (const [to, quantity] of [['charlene', 3], ['ace', 1]]) {
    const result = await request('/inventory-transfers', { inventory_id: item.id, from_location: 'ace', to_location: to, quantity });
    assert.ok([400, 409].includes(result.status));
  }
  assert.deepEqual((await readInventory(pool, null, item.id))[0].location_quantities, { ace: 2 });
});

dbtest('concurrent transfers serialize so two requests cannot move the same stock', async () => {
  const item = await create('concurrent', 5);
  const results = await Promise.allSettled([
    transaction(pool, (client) => transferStock(client, item.id, 'ready_bar', 'ace', 4)),
    transaction(pool, (client) => transferStock(client, item.id, 'ready_bar', 'charlene', 4)),
  ]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const [current] = await readInventory(pool, null, item.id);
  assert.equal(current.total_quantity, 5);
  assert.equal(current.location_quantities.ready_bar, 1);
});

dbtest('a package shortage rolls back earlier lines and never substitutes a different brand', async () => {
  const one = await create('tequila-a', 4, 'charlene');
  const two = await create('tequila-b', 1, 'charlene');
  const result = await request('/inventory/bulk-adjust', { location_id: 'charlene', items: [
    { inventory_id: one.id, quantity: 2 }, { inventory_id: two.id, quantity: 2 },
  ] });
  assert.equal(result.status, 409);
  assert.equal((await readInventory(pool, null, one.id))[0].total_quantity, 4);
  assert.equal((await readInventory(pool, null, two.id))[0].total_quantity, 1);
  assert.equal((await request('/inventory/bulk-adjust', { location_id: 'charlene', items: [{ type_key: 'tequila', quantity: 1 }] })).status, 400);
});

dbtest('out and missing equipment reserve stock at the source; returns release it there', async () => {
  const item = await create('shaker', 5, 'ace', 'reusable');
  await pool.query("INSERT INTO inventory_checkouts (inventory_item_id,quantity,location_id,status) VALUES ($1,3,'ace','missing')", [item.id]);
  await assert.rejects(transaction(pool, (client) => transferStock(client, item.id, 'ace', 'charlene', 3)), /Only 2/);
  await assert.rejects(transaction(pool, async (client) => { const locked = await lockItem(client, item.id); await setLocationQuantity(client, locked, 'ace', 2); }), /below equipment/);
  await assert.rejects(transaction(pool, (client) => adjustStock(client, item.id, 'ace', 1, 'use')), /checkout/);
  let availability = await request('/inventory-availability?location_id=ace', undefined, 'GET');
  assert.equal(availability.data.find((row) => row.id === item.id).available_quantity, 2);
  await pool.query("UPDATE inventory_checkouts SET return_quantity=quantity,status='returned' WHERE inventory_item_id=$1", [item.id]);
  availability = await request('/inventory-availability?location_id=ace', undefined, 'GET');
  assert.equal(availability.data.find((row) => row.id === item.id).available_quantity, 5);
  assert.equal((await readInventory(pool, null, item.id))[0].location_quantities.ace, 5);
});

dbtest('checkout is tied to the selected location and refuses stock elsewhere or already reserved', async () => {
  const item = await create('checkout-test', 4, 'charlene', 'reusable');
  let result = await request('/inventory-checkouts', { inventory_item_id: item.id, location_id: 'ace', quantity: 1 });
  assert.equal(result.status, 409);
  result = await request('/inventory-checkouts', { inventory_item_id: item.id, location_id: 'charlene', quantity: 3 });
  assert.equal(result.status, 201);
  assert.equal(result.data.checkout.location_id, 'charlene');
  assert.equal(result.data.item.available_quantity, 1);
  result = await request('/inventory-checkouts', { inventory_item_id: item.id, location_id: 'charlene', quantity: 2 });
  assert.equal(result.status, 409);
  assert.equal((await readInventory(pool, null, item.id))[0].location_quantities.charlene, 4);
});
