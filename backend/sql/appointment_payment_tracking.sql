-- Adds partial-payment tracking to appointments.
-- Safe to run more than once.
BEGIN;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS client_payment NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_client_payment_nonnegative;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_client_payment_nonnegative
  CHECK (client_payment >= 0);

COMMIT;
