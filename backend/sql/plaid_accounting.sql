BEGIN;

CREATE TABLE IF NOT EXISTS plaid_items (
  item_id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  cursor TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  error_code TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS institution_name TEXT;
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS cursor TEXT;
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS error_code TEXT;
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE plaid_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS plaid_accounts (
  account_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES plaid_items(item_id) ON DELETE CASCADE,
  name TEXT,
  official_name TEXT,
  mask TEXT,
  type TEXT,
  subtype TEXT,
  current_balance NUMERIC(12,2),
  available_balance NUMERIC(12,2),
  iso_currency_code TEXT,
  persistent_account_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE plaid_accounts ADD COLUMN IF NOT EXISTS persistent_account_id TEXT;

CREATE TABLE IF NOT EXISTS plaid_transactions (
  transaction_id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES plaid_items(item_id) ON DELETE CASCADE,
  account_id TEXT,
  transaction_date DATE NOT NULL,
  authorized_date DATE,
  name TEXT NOT NULL,
  merchant_name TEXT,
  amount NUMERIC(12,2) NOT NULL,
  pending BOOLEAN NOT NULL DEFAULT FALSE,
  removed BOOLEAN NOT NULL DEFAULT FALSE,
  payment_channel TEXT,
  plaid_category TEXT,
  plaid_category_detail TEXT,
  app_category TEXT,
  review_status TEXT NOT NULL DEFAULT 'pending',
  imported_expense_id BIGINT,
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS plaid_transaction_id TEXT;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS plaid_account_id TEXT;

ALTER TABLE profits ADD COLUMN IF NOT EXISTS processor TEXT;
ALTER TABLE profits ADD COLUMN IF NOT EXISTS processor_txn_id TEXT;
ALTER TABLE profits ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE profits ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT;
ALTER TABLE profits ADD COLUMN IF NOT EXISTS bank_reconciled_at TIMESTAMPTZ;
ALTER TABLE profits ADD COLUMN IF NOT EXISTS square_payout_id TEXT;
ALTER TABLE profits ADD COLUMN IF NOT EXISTS bank_verified_at TIMESTAMPTZ;

ALTER TABLE plaid_transactions ADD COLUMN IF NOT EXISTS linked_profit_id BIGINT;
ALTER TABLE plaid_transactions ADD COLUMN IF NOT EXISTS linked_square_payout_id TEXT;

CREATE TABLE IF NOT EXISTS square_payouts (
  payout_id TEXT PRIMARY KEY,
  status TEXT,
  location_id TEXT,
  amount NUMERIC(12,2) NOT NULL,
  arrival_date DATE,
  created_at_square TIMESTAMPTZ,
  updated_at_square TIMESTAMPTZ,
  bank_transaction_id TEXT,
  bank_reconciled_at TIMESTAMPTZ,
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS square_payout_entries (
  entry_id TEXT PRIMARY KEY,
  payout_id TEXT NOT NULL REFERENCES square_payouts(payout_id) ON DELETE CASCADE,
  entry_type TEXT,
  payment_id TEXT,
  gross_amount NUMERIC(12,2),
  fee_amount NUMERIC(12,2),
  net_amount NUMERIC(12,2),
  effective_at TIMESTAMPTZ,
  raw_json JSONB
);

CREATE TABLE IF NOT EXISTS square_checkout_links (
  checkout_reference TEXT PRIMARY KEY,
  payment_link_id TEXT,
  order_id TEXT UNIQUE,
  payment_id TEXT,
  flow TEXT,
  client_email TEXT,
  gross_amount NUMERIC(12,2),
  appointment_data JSONB,
  appointment_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS expenses_plaid_transaction_unique
  ON expenses (plaid_transaction_id)
  WHERE plaid_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profits_processor_txn_id_unique
  ON profits (processor_txn_id)
  WHERE processor_txn_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS profits_bank_transaction_unique
  ON profits (bank_transaction_id)
  WHERE bank_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS square_payouts_bank_transaction_unique
  ON square_payouts (bank_transaction_id)
  WHERE bank_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS square_payout_entries_payment_idx
  ON square_payout_entries (payment_id);

CREATE INDEX IF NOT EXISTS plaid_transactions_date_idx
  ON plaid_transactions (transaction_date DESC);

CREATE INDEX IF NOT EXISTS plaid_transactions_review_idx
  ON plaid_transactions (review_status, pending, removed);

CREATE INDEX IF NOT EXISTS plaid_accounts_persistent_idx
  ON plaid_accounts (persistent_account_id)
  WHERE persistent_account_id IS NOT NULL;

COMMIT;
