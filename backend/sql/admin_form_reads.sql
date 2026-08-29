-- Server-backed reviewed/new state for the Intake Forms workspace.
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS admin_form_reads (
  form_type TEXT NOT NULL,
  form_id BIGINT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (form_type, form_id)
);
