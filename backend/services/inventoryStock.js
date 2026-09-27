import fs from 'node:fs/promises';

export const LOCATIONS = [
  { id: 'charlene', name: 'Charlene' },
  { id: 'ace', name: 'Ace' },
  { id: 'ready_bar', name: 'Ready Bar' },
];

export function inventoryError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function locationId(value) {
  if (!LOCATIONS.some((location) => location.id === value)) {
    throw inventoryError('Select Charlene, Ace, or Ready Bar.');
  }
  return value;
}

export function stockQuantity(value, positive = false) {
  if (value == null || value === '' || typeof value === 'boolean') throw inventoryError('Enter a valid quantity.');
  const quantity = Number(value);
  if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 2147483647 || (positive && quantity === 0)) {
    throw inventoryError('Quantity must be a nonnegative whole number.');
  }
  return quantity;
}

const initialized = new WeakMap();
export function ensureInventoryLocations(pool) {
  if (!initialized.has(pool)) {
    const pending = (async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT pg_advisory_xact_lock(hashtext('ready-inventory-locations-v1'))");
        const sql = await fs.readFile(new URL('../sql/inventory_locations.sql', import.meta.url), 'utf8');
        await client.query(sql);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    })();
    initialized.set(pool, pending);
    pending.catch(() => initialized.delete(pool));
  }
  return initialized.get(pool);
}

export async function transaction(pool, work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

// Lock the product first for every adjustment/transfer/checkout. This also
// serializes concurrent requests when a destination stock row does not exist yet.
export async function lockItem(client, id) {
  stockQuantity(id, true);
  const result = await client.query('SELECT * FROM inventory WHERE id = $1 FOR UPDATE', [id]);
  if (!result.rowCount) throw inventoryError('Inventory item not found.', 404);
  return result.rows[0];
}

export async function locationBalance(client, id, location) {
  const result = await client.query(`
    SELECT COALESCE((SELECT quantity FROM inventory_stock WHERE inventory_id = $1 AND location_id = $2), 0) AS quantity,
      COALESCE((SELECT SUM(quantity - COALESCE(return_quantity, 0))
        FROM inventory_checkouts WHERE inventory_item_id = $1 AND location_id = $2
        AND status IN ('out', 'partial', 'missing')), 0) AS committed`, [id, location]);
  const quantity = Number(result.rows[0].quantity);
  const committed = Number(result.rows[0].committed);
  return { quantity, committed, available: Math.max(0, quantity - committed) };
}

export async function setLocationQuantity(client, item, location, quantity) {
  locationId(location);
  quantity = stockQuantity(quantity);
  const balance = await locationBalance(client, item.id, location);
  if (quantity < balance.committed) throw inventoryError('Quantity cannot be below equipment checked out or missing at this location.', 409);
  await client.query(`INSERT INTO inventory_stock (inventory_id, location_id, quantity)
    VALUES ($1, $2, $3) ON CONFLICT (inventory_id, location_id)
    DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = NOW()`, [item.id, location, quantity]);
  await client.query(`UPDATE inventory SET quantity = (
    SELECT COALESCE(SUM(quantity), 0) FROM inventory_stock WHERE inventory_id = $1
  ), updated_at = NOW() WHERE id = $1`, [item.id]);
}

export async function adjustStock(client, id, location, amount, action) {
  locationId(location);
  const qty = stockQuantity(amount, action !== 'set');
  if (!['add', 'use', 'remove', 'set'].includes(action)) throw inventoryError('Invalid stock action.');
  const item = await lockItem(client, id);
  if (item.item_type && item.item_type !== 'product' && item.item_type !== 'rental') throw inventoryError('This item does not track physical stock.');
  if (item.tracking_type === 'reusable' && ['use', 'remove'].includes(action)) throw inventoryError('Use equipment checkout for reusable items.');
  const balance = await locationBalance(client, id, location);
  const next = action === 'add' ? balance.quantity + qty : action === 'set' ? qty : balance.quantity - qty;
  if (next < balance.committed || next < 0) throw inventoryError(`Not enough stock at this location for ${item.item_name}. Available: ${balance.available}.`, 409);
  await setLocationQuantity(client, item, location, next);
}

export async function transferStock(client, id, from, to, amount) {
  locationId(from); locationId(to);
  if (from === to) throw inventoryError('Choose two different locations.');
  const qty = stockQuantity(amount, true);
  const item = await lockItem(client, id);
  const source = await locationBalance(client, id, from);
  const destination = await locationBalance(client, id, to);
  if (qty > source.available) throw inventoryError(`Only ${source.available} available to transfer. Checked-out and missing equipment cannot be moved.`, 409);
  await setLocationQuantity(client, item, from, source.quantity - qty);
  await setLocationQuantity(client, item, to, destination.quantity + qty);
  await client.query(`INSERT INTO inventory_transfers (inventory_id, from_location, to_location, quantity)
    VALUES ($1, $2, $3, $4)`, [id, from, to, qty]);
}

export async function readInventory(db, location = null, id = null) {
  if (location) locationId(location);
  const result = await db.query(`SELECT i.*, i.quantity AS total_quantity,
    COALESCE(stock.quantities, '{}'::jsonb) AS location_quantities,
    COALESCE(stock.available, '{}'::jsonb) AS location_available,
    CASE WHEN $1::text IS NULL THEN i.quantity ELSE COALESCE((stock.quantities ->> $1::text)::numeric, 0) END AS quantity
    FROM inventory i
    LEFT JOIN LATERAL (
      SELECT jsonb_object_agg(s.location_id, s.quantity) AS quantities,
        jsonb_object_agg(s.location_id, GREATEST(0, s.quantity - COALESCE(c.committed, 0))) AS available
      FROM inventory_stock s
      LEFT JOIN LATERAL (SELECT SUM(quantity - COALESCE(return_quantity, 0)) AS committed
        FROM inventory_checkouts WHERE inventory_item_id = i.id AND location_id = s.location_id
        AND status IN ('out', 'partial', 'missing')) c ON true
      WHERE s.inventory_id = i.id
    ) stock ON true WHERE ($2::integer IS NULL OR i.id = $2)
    ORDER BY i.item_name`, [location, id]);
  return result.rows;
}
