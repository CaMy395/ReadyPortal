-- Gross/fee/net fields used by the Square-aware profit ledger.
-- Safe to run more than once.
BEGIN;

ALTER TABLE profits
  ADD COLUMN IF NOT EXISTS service_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS fee_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS processor TEXT,
  ADD COLUMN IF NOT EXISTS processor_txn_id TEXT,
  ADD COLUMN IF NOT EXISTS appointment_id INTEGER,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS profits_processor_txn_id_unique
  ON profits (processor_txn_id)
  WHERE processor_txn_id IS NOT NULL;

COMMIT;
