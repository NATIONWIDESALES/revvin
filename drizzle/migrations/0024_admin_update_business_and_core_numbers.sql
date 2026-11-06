CREATE OR REPLACE FUNCTION public.fn_admin_update_business(p_business_id uuid, p_patch jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE
  v_key text;
  v_old record;
  v_new record;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb THEN
    RAISE EXCEPTION 'invalid_field';
  END IF;
  FOR v_key IN SELECT jsonb_object_keys(p_patch) LOOP
    IF v_key IN ('is_verified', 'index_approved', 'is_disabled') THEN
      IF jsonb_typeof(p_patch -> v_key) <> 'boolean' THEN RAISE EXCEPTION 'invalid_field'; END IF;
    ELSIF v_key = 'account_status' THEN
      IF jsonb_typeof(p_patch -> v_key) <> 'string'
         OR (p_patch ->> v_key) NOT IN ('approved', 'rejected', 'pending_approval') THEN
        RAISE EXCEPTION 'invalid_field';
      END IF;
    ELSE
      RAISE EXCEPTION 'invalid_field';
    END IF;
  END LOOP;

  SELECT id, is_verified, verified, index_approved, account_status, is_disabled
    INTO v_old FROM public.businesses WHERE id = p_business_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  UPDATE public.businesses SET
    is_verified = CASE WHEN p_patch ? 'is_verified' THEN (p_patch ->> 'is_verified')::boolean ELSE is_verified END,
    verified = CASE WHEN p_patch ? 'is_verified' THEN (p_patch ->> 'is_verified')::boolean ELSE verified END,
    index_approved = CASE WHEN p_patch ? 'index_approved' THEN (p_patch ->> 'index_approved')::boolean ELSE index_approved END,
    is_disabled = CASE WHEN p_patch ? 'is_disabled' THEN (p_patch ->> 'is_disabled')::boolean ELSE is_disabled END,
    account_status = CASE WHEN p_patch ? 'account_status' THEN p_patch ->> 'account_status' ELSE account_status END
  WHERE id = p_business_id
  RETURNING id, name, is_verified, verified, index_approved, account_status, is_disabled INTO v_new;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  INSERT INTO public.audit_log (event_type, actor_id, payload)
  VALUES ('admin_business_update', auth.uid(), jsonb_build_object(
    'business_id', p_business_id,
    'patch', p_patch,
    'previous', jsonb_build_object('is_verified', v_old.is_verified, 'verified', v_old.verified,
      'index_approved', v_old.index_approved, 'account_status', v_old.account_status, 'is_disabled', v_old.is_disabled)));

  RETURN jsonb_build_object('id', v_new.id, 'name', v_new.name, 'is_verified', v_new.is_verified,
    'verified', v_new.verified, 'index_approved', v_new.index_approved,
    'account_status', v_new.account_status, 'is_disabled', v_new.is_disabled);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_admin_update_business(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_update_business(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_admin_core_numbers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $$
DECLARE v jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  WITH b AS (SELECT * FROM public.businesses WHERE NOT coalesce(is_demo, false))
  SELECT jsonb_build_object(
    'businesses', (SELECT count(*) FROM b),
    'live_pages', (SELECT count(*) FROM b WHERE public.fn_page_live(b.account_status, b.is_published, b.is_disabled)),
    'leads', (SELECT count(*) FROM public.leads l JOIN b ON b.id = l.business_id),
    'leads_won', (SELECT count(*) FROM public.leads l JOIN b ON b.id = l.business_id WHERE l.status = 'closed_won'),
    'referrers', (SELECT count(*) FROM public.referrers r JOIN b ON b.id = r.business_id),
    'rewards_pending_count', (SELECT count(*) FROM public.rewards w JOIN b ON b.id = w.business_id WHERE w.status = 'pending'),
    'rewards_pending_sum', (SELECT coalesce(sum(w.amount), 0) FROM public.rewards w JOIN b ON b.id = w.business_id WHERE w.status = 'pending'),
    'rewards_paid_count', (SELECT count(*) FROM public.rewards w JOIN b ON b.id = w.business_id WHERE w.status = 'paid'),
    'rewards_paid_sum', (SELECT coalesce(sum(w.amount), 0) FROM public.rewards w JOIN b ON b.id = w.business_id WHERE w.status = 'paid'),
    'active_subscriptions', (SELECT count(*) FROM b WHERE b.subscription_status = 'active'),
    'signups_7d', (SELECT count(*) FROM b WHERE b.created_at >= now() - interval '7 days')
  ) INTO v;
  RETURN v;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_admin_core_numbers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_admin_core_numbers() TO authenticated;