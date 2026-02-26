ALTER TABLE public.offers DROP CONSTRAINT offers_status_check;
ALTER TABLE public.offers ADD CONSTRAINT offers_status_check
  CHECK (status IN ('active', 'paused', 'closed', 'draft'));