import express from 'express';
import crypto from 'node:crypto';
import {
  LOCATIONS, ensureInventoryLocations, inventoryError, locationId, stockQuantity,
  transaction, lockItem, locationBalance, setLocationQuantity, adjustStock, transferStock, readInventory,
} from '../services/inventoryStock.js';

export default function inventoryRouter(pool) {
  const router = express.Router();
  const route = (handler) => async (req, res) => {
    try { await handler(req, res); }
    catch (error) {
      console.error('Inventory request failed:', error.message);
      res.status(error.status || (error.code === '23505' ? 409 : 500)).json({
        error: error.code === '23505' ? 'An item already uses that barcode.' : error.message,
      });
    }
  };
  router.use(async (req, res, next) => {
    if (!/^\/inventory(?:[-/]|$)/.test(req.path)) return next();
    try { await ensureInventoryLocations(pool); next(); }
    catch (error) { console.error('Inventory setup failed:', error); res.status(503).json({ error: 'Inventory is temporarily unavailable.' }); }
  });

  router.get('/inventory-locations', (req, res) => res.json(LOCATIONS));
  router.get('/inventory', route(async (req, res) => res.json(await readInventory(pool, req.query.location_id || null))));

  const fields = (body) => {
    if (typeof body.item_name !== 'string' || !body.item_name.trim()) throw inventoryError('Item name is required.');
    if (!['product', 'service', 'rental', 'fee'].includes(body.item_type || 'product')) throw inventoryError('Invalid item type.');
    if (!['consumable', 'reusable'].includes(body.tracking_type || 'consumable')) throw inventoryError('Invalid tracking type.');
    return [body.item_name.trim(), body.item_type || 'product', body.tracking_type || 'consumable',
      body.category || null, body.type_key || null, Math.max(0, Number(body.unit_cost) || 0),
      body.client_price === '' || body.client_price == null ? null : Math.max(0, Number(body.client_price) || 0),
      body.store || null, body.size_label || null, body.is_active !== false];
  };
  router.post('/inventory', route(async (req, res) => {
    const body = req.body || {};
    const location = locationId(body.location_id);
    const quantity = stockQuantity(body.quantity ?? 0);
    const values = fields(body);
    if (!['product', 'rental'].includes(values[1]) && quantity) throw inventoryError('Services and fees do not track stock.');
    const item = await transaction(pool, async (client) => {
      const result = await client.query(`INSERT INTO inventory
        (item_name,item_type,tracking_type,category,type_key,unit_cost,client_price,store,size_label,is_active,barcode,quantity,price_updated_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,0,NOW(),NOW()) RETURNING *`, [...values, body.barcode?.trim() || crypto.randomUUID()]);
      await setLocationQuantity(client, result.rows[0], location, quantity);
      return (await readInventory(client, null, result.rows[0].id))[0];
    });
    res.status(201).json(item);
  }));

  router.put('/inventory/:barcode', route(async (req, res) => {
    const body = req.body || {};
    const values = fields(body);
    const item = await transaction(pool, async (client) => {
      const found = await client.query('SELECT id FROM inventory WHERE barcode = $1', [req.params.barcode]);
      if (!found.rowCount) throw inventoryError('Item not found.', 404);
      const previous = await lockItem(client, found.rows[0].id);
      if (!['product', 'rental'].includes(values[1]) && Number(previous.quantity) > 0) throw inventoryError('Remove physical stock before changing this item to a service or fee.');
      const open = await client.query("SELECT 1 FROM inventory_checkouts WHERE inventory_item_id = $1 AND status IN ('out','partial','missing') LIMIT 1", [previous.id]);
      if (open.rowCount && values[2] !== previous.tracking_type) throw inventoryError('Return outstanding equipment before changing its tracking type.');
      if (body.quantity != null) {
        if (!['product', 'rental'].includes(values[1]) && stockQuantity(body.quantity) > 0) throw inventoryError('Services and fees do not track stock.');
        await setLocationQuantity(client, previous, locationId(body.location_id), stockQuantity(body.quantity));
      }
      await client.query(`UPDATE inventory SET item_name=$1,item_type=$2,tracking_type=$3,category=$4,type_key=$5,
        price_updated_at=CASE WHEN unit_cost IS DISTINCT FROM $6 OR client_price IS DISTINCT FROM $7 THEN NOW() ELSE price_updated_at END,
        unit_cost=$6,client_price=$7,store=$8,size_label=$9,is_active=$10,barcode=$11,updated_at=NOW() WHERE id=$12`,
      [...values, body.new_barcode || previous.barcode, previous.id]);
      return (await readInventory(client, null, previous.id))[0];
    });
    res.json(item);
  }));

  router.patch('/inventory/:barcode', route(async (req, res) => {
    const location = locationId(req.body?.location_id);
    const item = await transaction(pool, async (client) => {
      const result = await client.query('SELECT id FROM inventory WHERE barcode=$1', [req.params.barcode]);
      if (!result.rowCount) throw inventoryError('Add this product to inventory before scanning stock.', 404);
      await adjustStock(client, result.rows[0].id, location, req.body.quantity, req.body.action);
      return (await readInventory(client, null, result.rows[0].id))[0];
    });
    res.json(item);
  }));

  router.post('/inventory-transfers', route(async (req, res) => {
    const { inventory_id, from_location, to_location, quantity } = req.body || {};
    const item = await transaction(pool, async (client) => {
      await transferStock(client, inventory_id, from_location, to_location, quantity);
      return (await readInventory(client, null, inventory_id))[0];
    });
    res.json(item);
  }));

  router.post('/inventory/bulk-adjust', route(async (req, res) => {
    const { items, location_id } = req.body || {};
    const location = locationId(location_id);
    if (!Array.isArray(items) || !items.length) throw inventoryError('items[] is required.');
    const results = await transaction(pool, async (client) => {
      // Resolve exact products before locking them in a stable order to avoid
      // deadlocks and accidental substitutions between brands sharing a type key.
      const resolved = [];
      for (const line of items) {
        if (!line || typeof line !== 'object') throw inventoryError('Each package line must specify an inventory item.');
        let id = line.inventory_id;
        if (!id && line.barcode) {
          const found = await client.query('SELECT id FROM inventory WHERE barcode=$1', [line.barcode]);
          id = found.rows[0]?.id;
        }
        if (!id) throw inventoryError('Each package line must be linked to an exact inventory item.');
        resolved.push({ ...line, inventory_id: stockQuantity(id, true) });
      }
      resolved.sort((a,b) => a.inventory_id - b.inventory_id);
      for (const line of resolved) await adjustStock(client, line.inventory_id, location, line.quantity, line.action || 'use');
      return resolved.map((line) => ({ ok: true, inventory_id: line.inventory_id }));
    });
    res.json({ ok: true, results });
  }));

  router.delete('/inventory/:barcode', route(async (req, res) => {
    await transaction(pool, async (client) => {
      const found = await client.query('SELECT id FROM inventory WHERE barcode=$1', [req.params.barcode]);
      if (!found.rowCount) throw inventoryError('Item not found.', 404);
      const item = await lockItem(client, found.rows[0].id);
      const open = await client.query("SELECT 1 FROM inventory_checkouts WHERE inventory_item_id=$1 AND status IN ('out','partial','missing') LIMIT 1", [item.id]);
      if (open.rowCount) throw inventoryError('Return or resolve outstanding equipment before deleting this product.', 409);
      await client.query('DELETE FROM inventory WHERE id=$1', [item.id]);
    });
    res.json({ message: 'Product deleted from all locations.' });
  }));

  router.get('/inventory-availability', route(async (req, res) => {
    const location = req.query.location_id ? locationId(req.query.location_id) : null;
    const rows = await readInventory(pool, location);
    res.json(rows.filter((item) => item.tracking_type === 'reusable').map((item) => {
      const available = location ? Number(item.location_available[location] || 0) : Object.values(item.location_available).reduce((sum,value) => sum + Number(value), 0);
      return { ...item, total_owned: Number(item.quantity), checked_out: Number(item.quantity) - available, available_quantity: available };
    }));
  }));

  router.post('/inventory-checkouts', route(async (req, res) => {
    const body = req.body || {};
    const location = locationId(body.location_id);
    const quantity = stockQuantity(body.quantity ?? 1, true);
    const checkoutType = body.checkout_type || 'event';
    if (!['event', 'staff', 'other'].includes(checkoutType)) throw inventoryError('Invalid checkout type.');
    const result = await transaction(pool, async (client) => {
      const item = await lockItem(client, body.inventory_item_id);
      if (item.tracking_type !== 'reusable') throw inventoryError('This item is not marked as reusable equipment.');
      const balance = await locationBalance(client, item.id, location);
      if (quantity > balance.available) throw inventoryError(`Only ${balance.available} available at this location.`, 409);
      const checkout = await client.query(`INSERT INTO inventory_checkouts
        (inventory_item_id, quantity, checkout_type, gig_id, person_name, user_id,
         expected_return, condition_out, notes, created_by, location_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [item.id, quantity, checkoutType, body.gig_id || null, body.person_name?.trim() || null,
        body.user_id || null, body.expected_return || null, body.condition_out || 'good',
        body.notes?.trim() || null, body.created_by || null, location]);
      return { checkout: checkout.rows[0], item: { id: item.id, item_name: item.item_name,
        total_owned: balance.quantity, checked_out: balance.committed + quantity,
        available_quantity: balance.available - quantity } };
    });
    res.status(201).json({ message: 'Equipment checked out successfully', ...result });
  }));
  return router;
}
