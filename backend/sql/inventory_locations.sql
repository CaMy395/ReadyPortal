-- Idempotent: existing product IDs/barcodes and overall counts are preserved.
CREATE TABLE IF NOT EXISTS inventory_locations (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE
);
INSERT INTO inventory_locations (id, name) VALUES
  ('charlene', 'Charlene'), ('ace', 'Ace'), ('ready_bar', 'Ready Bar')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS inventory_stock (
  inventory_id integer NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  location_id text NOT NULL REFERENCES inventory_locations(id),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (inventory_id, location_id)
);
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id bigserial PRIMARY KEY,
  inventory_id integer NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  from_location text NOT NULL REFERENCES inventory_locations(id),
  to_location text NOT NULL REFERENCES inventory_locations(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CHECK (from_location <> to_location)
);

ALTER TABLE inventory_checkouts ADD COLUMN IF NOT EXISTS location_id text
  REFERENCES inventory_locations(id) DEFAULT 'ready_bar';
UPDATE inventory_checkouts SET location_id = 'ready_bar' WHERE location_id IS NULL;
ALTER TABLE inventory_checkouts ALTER COLUMN location_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS inventory_checkouts_location_idx
  ON inventory_checkouts (inventory_item_id, location_id, status);

-- Backfill only untouched items; restarting never resets transferred quantities.
INSERT INTO inventory_stock (inventory_id, location_id, quantity)
  SELECT i.id, 'ready_bar', COALESCE(i.quantity, 0) FROM inventory i
  WHERE NOT EXISTS (SELECT 1 FROM inventory_stock s WHERE s.inventory_id = i.id)
ON CONFLICT (inventory_id, location_id) DO NOTHING;
