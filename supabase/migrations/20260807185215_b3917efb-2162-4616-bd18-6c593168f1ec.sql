ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS service_radius_km integer DEFAULT 50;

COMMENT ON COLUMN public.businesses.service_radius_km IS 'How far from the business coordinates it serves customers, in kilometres. NULL means unspecified.';