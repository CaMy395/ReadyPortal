-- Existing certificates retain their original issue date and certificate number.
UPDATE public.training_certificates
SET expiration_date = (issue_date + INTERVAL '3 years')::date
WHERE expiration_date IS NULL AND issue_date IS NOT NULL;
