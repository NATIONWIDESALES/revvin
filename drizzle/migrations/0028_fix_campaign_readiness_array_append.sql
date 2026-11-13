CREATE OR REPLACE FUNCTION public.fn_campaign_readiness()
 RETURNS TABLE(ready boolean, missing text[], business_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE b public.businesses%ROWTYPE; m text[] := '{}';
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'You need to be signed in.'; END IF;
  SELECT * INTO b FROM public.businesses WHERE user_id = auth.uid() LIMIT 1;
  IF b.id IS NULL THEN RAISE EXCEPTION 'No business found on this account.'; END IF;

  IF coalesce(btrim(b.street_address),'') = '' THEN m := array_append(m, 'street_address'); END IF;
  IF coalesce(btrim(b.city),'')           = '' THEN m := array_append(m, 'city'); END IF;
  IF coalesce(btrim(b.postal_code),'')    = '' THEN m := array_append(m, 'postal_code'); END IF;
  IF coalesce(btrim(b.country),'')        = '' THEN m := array_append(m, 'country'); END IF;
  IF coalesce(btrim(b.business_email),'') = '' THEN m := array_append(m, 'business_email'); END IF;

  RETURN QUERY SELECT (array_length(m,1) IS NULL), m, b.id;
END $function$;
