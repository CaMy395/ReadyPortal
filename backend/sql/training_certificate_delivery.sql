BEGIN;

ALTER TABLE public.training_certificates
  ADD COLUMN IF NOT EXISTS certificate_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certificate_email_error TEXT;

COMMIT;

SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'training_certificates'
  AND column_name IN (
    'certificate_pdf_url',
    'certificate_email_sent_at',
    'certificate_email_error'
  )
ORDER BY column_name;
