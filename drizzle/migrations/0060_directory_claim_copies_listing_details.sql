CREATE OR REPLACE FUNCTION public.fn_directory_claim(p_slug text, p_business_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE l public.directory_listings%ROWTYPE; b public.businesses%ROWTYPE;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' OR length(p_slug) > 100 THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT * INTO b FROM public.businesses WHERE id = p_business_id;
  IF b.id IS NULL OR b.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF coalesce(b.acquisition ->> 'landing_path', '') IS DISTINCT FROM '/b/' || p_slug THEN RAISE EXCEPTION 'code_mismatch'; END IF;
  SELECT * INTO l FROM public.directory_listings WHERE slug = p_slug FOR UPDATE;
  IF l.id IS NULL OR l.status <> 'unclaimed' THEN RAISE EXCEPTION 'not_found'; END IF;
  IF EXISTS (SELECT 1 FROM public.directory_listings WHERE claimed_business_id = b.id) THEN RAISE EXCEPTION 'already_claimed'; END IF;
  UPDATE public.directory_listings SET status = 'claimed', claimed_business_id = b.id WHERE id = l.id;
  -- Carry the listing's public details over, never replacing what the owner already entered.
  UPDATE public.businesses SET
    phone     = coalesce(nullif(btrim(phone), ''), l.phone),
    website   = coalesce(nullif(btrim(website), ''), l.website),
    city      = coalesce(nullif(btrim(city), ''), l.city),
    state     = coalesce(nullif(btrim(state), ''), nullif(regexp_replace(coalesce(l.region, ''), '^(US|CA)-', '', 'i'), '')),
    country   = coalesce(nullif(btrim(country), ''), l.country),
    category  = CASE WHEN nullif(btrim(coalesce(category, '')), '') IS NULL OR lower(category) = 'other' THEN coalesce(l.category, category) ELSE category END,
    latitude  = coalesce(latitude, l.latitude),
    longitude = coalesce(longitude, l.longitude)
  WHERE id = b.id;
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', 'Directory listing claimed',
    'text', 'A directory listing was claimed by a new business. Listing: /b/' || l.slug,
    'html', '<p>A directory listing was claimed by a new business. Listing: /b/' || l.slug || '</p>',
    'purpose', 'transactional', 'label', 'directory_claimed',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'directory_claimed:' || l.id::text, 'message_id', gen_random_uuid()::text));
  RETURN true;
END $function$;