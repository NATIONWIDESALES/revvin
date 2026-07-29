ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS owner_notified_at timestamptz;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS signup_notified_at timestamptz;