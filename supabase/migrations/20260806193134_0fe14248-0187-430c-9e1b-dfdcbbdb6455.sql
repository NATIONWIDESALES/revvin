CREATE OR REPLACE FUNCTION public.fn_offer_is_restricted_category(p_category text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  -- Normalise: lowercase, strip anything that is not a letter, so
  -- 'Real Estate', 'real-estate' and 'realestate' all collapse to 'realestate'.
  SELECT regexp_replace(lower(coalesce(p_category, '')), '[^a-z]', '', 'g')
         IN ('finance', 'insurance', 'legal', 'mortgage', 'realestate')
$function$;