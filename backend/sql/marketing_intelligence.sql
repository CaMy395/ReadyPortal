BEGIN;
ALTER TABLE intake_forms ADD COLUMN IF NOT EXISTS marketing_attribution jsonb;
ALTER TABLE craft_cocktails ADD COLUMN IF NOT EXISTS marketing_attribution jsonb, ADD COLUMN IF NOT EXISTS marketing_event_date date;
ALTER TABLE mix_n_sip ADD COLUMN IF NOT EXISTS marketing_attribution jsonb, ADD COLUMN IF NOT EXISTS marketing_event_date date;
ALTER TABLE bartending_course_inquiries ADD COLUMN IF NOT EXISTS marketing_attribution jsonb, ADD COLUMN IF NOT EXISTS marketing_event_date date;
ALTER TABLE bartending_classes_inquiries ADD COLUMN IF NOT EXISTS marketing_attribution jsonb,
  ADD COLUMN IF NOT EXISTS preferred_date date, ADD COLUMN IF NOT EXISTS preferred_time time;
ALTER TABLE feedback_requests ADD COLUMN IF NOT EXISTS public_review_opt_in boolean;
ALTER TABLE rental_inquiries ADD COLUMN IF NOT EXISTS marketing_attribution jsonb,
  ADD COLUMN IF NOT EXISTS how_heard text;
ALTER TABLE event_orders ADD COLUMN IF NOT EXISTS marketing_attribution jsonb,
  ADD COLUMN IF NOT EXISTS marketing_reported_source text;
ALTER TABLE qr_scans ADD COLUMN IF NOT EXISTS marketing_event_id uuid;
ALTER TABLE qr_clicks ADD COLUMN IF NOT EXISTS marketing_event_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS qr_scans_marketing_event ON qr_scans (marketing_event_id);
CREATE UNIQUE INDEX IF NOT EXISTS qr_clicks_marketing_event ON qr_clicks (marketing_event_id);
CREATE TABLE IF NOT EXISTS marketing_google_snapshots (
  provider text NOT NULL, start_date date NOT NULL, end_date date NOT NULL,
  synced_at timestamptz, metrics jsonb, error_code text,
  PRIMARY KEY (provider, start_date, end_date)
);
COMMIT;
