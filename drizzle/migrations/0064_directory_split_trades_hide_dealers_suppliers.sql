ALTER TABLE public.directory_listings ADD COLUMN IF NOT EXISTS source_category text;

CREATE TABLE public.directory_trade_flag_snapshot_20261125b AS
  SELECT id, category, is_chain, chain_reason FROM public.directory_listings;
REVOKE ALL ON public.directory_trade_flag_snapshot_20261125b FROM anon, authenticated;
GRANT ALL ON public.directory_trade_flag_snapshot_20261125b TO service_role;
ALTER TABLE public.directory_trade_flag_snapshot_20261125b ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.directory_trade_flag_snapshot_20261125b IS 'Service-only rollback copy of category, is_chain, chain_reason before the trade split.';

-- Mirrors SOURCE_TRADES in supabase/functions/_shared/directory.ts.
CREATE OR REPLACE FUNCTION public.fn_directory_source_trade(p text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path TO 'pg_catalog' AS $$
  SELECT CASE lower(coalesce(p,''))
    WHEN 'contractor' THEN 'General Contracting' WHEN 'building_contractor' THEN 'General Contracting'
    WHEN 'kitchen_remodeling' THEN 'Remodeling' WHEN 'bathroom_remodeling' THEN 'Remodeling' WHEN 'altering_and_remodeling_contractor' THEN 'Remodeling'
    WHEN 'pest_control_service' THEN 'Pest Control'
    WHEN 'mover' THEN 'Moving'
    WHEN 'cleaning_service' THEN 'Cleaning' WHEN 'home_cleaning' THEN 'Cleaning' WHEN 'janitorial_service' THEN 'Cleaning'
    WHEN 'office_cleaning' THEN 'Cleaning' WHEN 'carpet_cleaning' THEN 'Cleaning' WHEN 'window_washing' THEN 'Cleaning'
    WHEN 'pressure_washing' THEN 'Cleaning' WHEN 'chimney_sweep' THEN 'Cleaning' WHEN 'chimney_service' THEN 'Cleaning'
    WHEN 'air_duct_cleaning_service' THEN 'Cleaning'
    WHEN 'masonry_concrete' THEN 'Concrete and Masonry' WHEN 'masonry_contractor' THEN 'Concrete and Masonry'
    WHEN 'stone_and_masonry' THEN 'Concrete and Masonry' WHEN 'paving_contractor' THEN 'Concrete and Masonry'
    WHEN 'excavation_service' THEN 'Concrete and Masonry' WHEN 'demolition_service' THEN 'Concrete and Masonry'
    WHEN 'flooring_contractor' THEN 'Flooring' WHEN 'carpet_installation' THEN 'Flooring'
    WHEN 'windows_installation' THEN 'Windows and Doors' WHEN 'door_sales_service' THEN 'Windows and Doors'
    WHEN 'garage_door_service' THEN 'Garage Doors'
    WHEN 'fence_and_gate_sales_service' THEN 'Fencing and Decks' WHEN 'deck_and_railing_sales_service' THEN 'Fencing and Decks'
    WHEN 'pool_and_hot_tub_service' THEN 'Pools and Spas' WHEN 'pool_cleaning' THEN 'Pools and Spas'
    WHEN 'key_and_locksmith' THEN 'Locksmith'
    WHEN 'appliance_repair_service' THEN 'Appliance Repair'
    WHEN 'insulation_installation' THEN 'Insulation and Drywall' WHEN 'drywall_service' THEN 'Insulation and Drywall' WHEN 'waterproofing' THEN 'Insulation and Drywall'
    WHEN 'handyman' THEN 'Handyman' WHEN 'home_service' THEN 'Handyman'
    WHEN 'home_inspector' THEN 'Home Inspection'
    WHEN 'junk_removal_and_hauling' THEN 'Junk Removal'
    WHEN 'tree_service' THEN 'Tree Service'
    WHEN 'gutter_service' THEN 'Gutters and Siding' WHEN 'siding' THEN 'Gutters and Siding'
    WHEN 'septic_service' THEN 'Septic'
    WHEN 'automotive_repair' THEN 'Auto Repair' WHEN 'automotive_service' THEN 'Auto Repair' WHEN 'brake_service_and_repair' THEN 'Auto Repair'
    WHEN 'transmission_repair' THEN 'Auto Repair' WHEN 'auto_electrical_repair' THEN 'Auto Repair' WHEN 'oil_change_station' THEN 'Auto Repair'
    WHEN 'auto_restoration_service' THEN 'Auto Repair' WHEN 'auto_upholstery' THEN 'Auto Repair'
    WHEN 'auto_body_shop' THEN 'Auto Body'
    WHEN 'tire_shop' THEN 'Tires'
    WHEN 'auto_detailing' THEN 'Auto Detailing' WHEN 'car_window_tinting' THEN 'Auto Detailing'
    WHEN 'auto_glass_service' THEN 'Auto Glass'
  END
$$;

UPDATE public.directory_listings SET category = public.fn_directory_source_trade(source_category)
 WHERE status = 'unclaimed' AND claimed_business_id IS NULL
   AND public.fn_directory_source_trade(source_category) IS NOT NULL
   AND category IS DISTINCT FROM public.fn_directory_source_trade(source_category);

CREATE OR REPLACE FUNCTION public.fn_directory_import(p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
DECLARE r jsonb; base text; s text; n int; ins int := 0; upd int := 0; existing uuid; cat text;
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 1000 THEN RAISE EXCEPTION 'invalid_batch'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    cat := coalesce(public.fn_directory_source_trade(r->>'source_category'), r->>'category', 'Other');
    SELECT id INTO existing FROM public.directory_listings WHERE source = r->>'source' AND source_id = r->>'source_id';
    IF existing IS NOT NULL THEN
      UPDATE public.directory_listings SET name = r->>'name', category = cat, city = r->>'city',
             region = r->>'region', country = r->>'country', postal_code = r->>'postal_code',
             latitude = (r->>'latitude')::double precision, longitude = (r->>'longitude')::double precision,
             phone = r->>'phone', website = r->>'website', source_license = r->>'source_license',
             source_category = coalesce(r->>'source_category', source_category)
       WHERE id = existing;
      upd := upd + 1;
    ELSE
      base := public.fn_directory_slug_base(r->>'name', r->>'city'); s := base; n := 1;
      WHILE EXISTS (SELECT 1 FROM public.directory_listings WHERE slug = s) OR EXISTS (SELECT 1 FROM public.businesses WHERE slug = s) LOOP
        n := n + 1; s := base || '-' || n;
      END LOOP;
      INSERT INTO public.directory_listings(slug, name, category, city, region, country, postal_code, latitude, longitude, phone, website, source, source_id, source_license, source_category)
      VALUES (s, r->>'name', cat, r->>'city', r->>'region', r->>'country', r->>'postal_code',
              (r->>'latitude')::double precision, (r->>'longitude')::double precision, r->>'phone', r->>'website',
              r->>'source', r->>'source_id', r->>'source_license', r->>'source_category');
      ins := ins + 1;
    END IF;
  END LOOP;
  PERFORM public.fn_directory_flag_chains();
  RETURN jsonb_build_object('inserted', ins, 'updated', upd);
END $$;
REVOKE ALL ON FUNCTION public.fn_directory_import(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_directory_import(jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_directory_flag_chains() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
DECLARE changed int;
  maker text[] := ARRAY['% bmw %','% mercedes %','% audi %','% volkswagen %','% vw %','% porsche %','% lexus %','% toyota %','% honda %',
    '% acura %','% nissan %','% infiniti %','% mazda %','% subaru %','% hyundai %','% kia %','% genesis %','% ford %','% lincoln %',
    '% chevrolet %','% chevy %','% buick %','% gmc %','% cadillac %','% chrysler %','% dodge %','% jeep %','% ram %','% fiat %','% volvo %',
    '% jaguar %','% land rover %','% mitsubishi %','% tesla %','% rivian %','% lucid %','% mini %','% dealership %','% motors %',
    '% auto sales %','% car sales %','% auto mall %','% autogroup %','% auto group %'];
  shop text[] := ARRAY['% repair %','% service %','% specialist %','% specialists %','% mechanic %','% garage %','% body %','% collision %',
    '% tire %','% tires %','% detailing %','% glass %','% performance %','% tuning %'];
  supplier text[] := ARRAY['% supply %','% supplies %','% supplier %','% wholesale %','% wholesalers %','% distributor %','% distributors %',
    '% distribution %','% manufacturing %','% manufacturer %','% rental %','% rentals %','% warehouse %','% corporate office %',
    '% corp office %','% headquarters %','% sales office %'];
BEGIN
  IF coalesce(auth.role(),'') <> 'service_role' AND session_user NOT IN ('postgres','supabase_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  WITH base AS (
    SELECT l.id, regexp_replace(lower(l.name), '[^a-z0-9]', '', 'g') AS k, public.fn_directory_name_words(l.name) AS w,
           ' ' || public.fn_directory_name_words(l.name) || ' ' AS pw, l.category,
           public.fn_directory_domain(l.website) AS d,
           (l.status = 'unclaimed' AND l.claimed_business_id IS NULL) AS eligible
      FROM public.directory_listings l
  ), nk AS (SELECT k FROM base WHERE k <> '' GROUP BY k HAVING count(*) >= 5),
  dk AS (SELECT d FROM base WHERE d IS NOT NULL
           AND d NOT IN ('facebook.com','instagram.com','google.com','business.site','sites.google.com','wixsite.com','godaddysites.com',
                         'square.site','squarespace.com','weebly.com','wordpress.com','yelp.com','linktr.ee','homeadvisor.com','angi.com',
                         'houzz.com','nextdoor.com','yellowpages.com','yellowpages.ca','bbb.org','mapquest.com')
         GROUP BY d HAVING count(*) >= 5),
  calc AS (
    SELECT b.id, CASE WHEN NOT b.eligible THEN NULL
      WHEN EXISTS (SELECT 1 FROM public.directory_chain_brands c WHERE c.phrase IS NOT NULL AND (b.w = c.phrase OR b.w LIKE c.phrase || ' %')) THEN 'brand'
      WHEN b.k IN (SELECT k FROM nk) THEN 'name_repeat'
      WHEN b.d IN (SELECT d FROM dk) THEN 'domain_repeat'
      WHEN b.category IN ('Auto','Auto Repair','Auto Body','Tires','Auto Detailing','Auto Glass')
           AND b.pw LIKE ANY (maker) AND NOT b.pw LIKE ANY (shop) THEN 'dealership'
      WHEN b.pw LIKE ANY (supplier) THEN 'supplier' END AS reason
      FROM base b
  )
  UPDATE public.directory_listings l SET is_chain = (c.reason IS NOT NULL), chain_reason = c.reason
    FROM calc c WHERE c.id = l.id AND (l.is_chain IS DISTINCT FROM (c.reason IS NOT NULL) OR l.chain_reason IS DISTINCT FROM c.reason);
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN jsonb_build_object('changed', changed);
END $$;
REVOKE ALL ON FUNCTION public.fn_directory_flag_chains() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_directory_flag_chains() TO service_role;

-- Trades with at least one visible listing or published business, for the marketplace filter.
CREATE OR REPLACE FUNCTION public.fn_directory_trades() RETURNS TABLE(category text, count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'pg_catalog' AS $$
  SELECT u.category, count(*) FROM (
    SELECT l.category FROM public.directory_listings l WHERE l.status = 'unclaimed' AND NOT l.is_chain
    UNION ALL SELECT r.category FROM public.fn_directory_business_rows() r
  ) u WHERE u.category IS NOT NULL GROUP BY u.category ORDER BY u.category
$$;
REVOKE ALL ON FUNCTION public.fn_directory_trades() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_directory_trades() TO anon, authenticated, service_role;

SELECT public.fn_directory_flag_chains();