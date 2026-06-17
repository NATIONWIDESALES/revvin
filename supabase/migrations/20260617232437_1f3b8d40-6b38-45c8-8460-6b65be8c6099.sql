ALTER TABLE public.businesses DISABLE TRIGGER USER;
UPDATE public.businesses
SET subscription_status = 'active',
    is_published = true,
    account_status = 'approved',
    slug = COALESCE(NULLIF(slug,''), 'rev-test'),
    current_period_end = now() + interval '30 days',
    verified = true
WHERE id = 'f14ac785-89f6-4396-8b4e-5dccb99c155c';
ALTER TABLE public.businesses ENABLE TRIGGER USER;