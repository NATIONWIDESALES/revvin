CREATE TABLE IF NOT EXISTS public.business_lifecycle_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  template text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT business_lifecycle_emails_unique UNIQUE (business_id, template)
);

GRANT ALL ON public.business_lifecycle_emails TO service_role;

ALTER TABLE public.business_lifecycle_emails ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS business_lifecycle_emails_business_idx
  ON public.business_lifecycle_emails (business_id);