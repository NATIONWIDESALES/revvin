CREATE OR REPLACE FUNCTION public.fn_directory_request_removal(p_slug text, p_name text, p_email text, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE l public.directory_listings%ROWTYPE; nm text := btrim(coalesce(p_name,'')); em text := lower(btrim(coalesce(p_email,''))); rs text := nullif(btrim(coalesce(p_reason,'')),''); place text;
BEGIN
  IF length(nm) NOT BETWEEN 1 AND 120 OR length(em) NOT BETWEEN 3 AND 254 OR em !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' OR length(coalesce(rs,'')) > 1000 THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;
  IF NOT public.fn_rate_bucket_hit('directory_removal:' || public.fn_request_bucket(), interval '1 hour', 3)
     OR NOT public.fn_rate_bucket_hit('directory_removal:global', interval '1 hour', 100) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  SELECT * INTO l FROM public.directory_listings WHERE slug = p_slug AND status = 'unclaimed' LIMIT 1;
  IF l.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  place := coalesce(nullif(concat_ws(', ', nullif(l.city, ''), nullif(regexp_replace(coalesce(l.region, ''), '^(US|CA)-', '', 'i'), '')), ''), 'unknown');
  INSERT INTO public.directory_removal_requests(listing_id, requester_name, email, reason) VALUES (l.id, nm, em, rs);
  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'to', 'info@revvin.co', 'from', 'Revvin <info@revvin.co>', 'reply_to', 'info@revvin.co',
    'subject', 'Removal request: ' || left(l.name, 120),
    'text', 'Removal requested for ' || l.name || ' in ' || place || ' (/b/' || l.slug || ') by ' || nm || ' <' || em || '>. Reason: ' || coalesce(rs, 'none given'),
    'html', '<p>Removal requested for ' || public.fn_directory_html(l.name) || ' in ' || public.fn_directory_html(place) || ' (/b/' || l.slug || ')</p><p>From: ' || public.fn_directory_html(nm) || ' &lt;' || public.fn_directory_html(em) || '&gt;</p><p>Reason: ' || public.fn_directory_html(coalesce(rs, 'none given')) || '</p>',
    'purpose', 'transactional', 'label', 'directory_removal_requested',
    'queued_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'idempotency_key', 'directory_removal:' || gen_random_uuid()::text, 'message_id', gen_random_uuid()::text));
  RETURN true;
END $function$;