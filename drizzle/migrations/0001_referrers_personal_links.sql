-- Referrers: one row per person per business, each with a personal link token.
CREATE OR REPLACE FUNCTION public.fn_new_referrer_token()
RETURNS text LANGUAGE sql VOLATILE SET search_path = public, extensions AS $$
  SELECT translate(rtrim(encode(extensions.gen_random_bytes(18), 'base64'), '='), '+/', '-_');
$$;

CREATE TABLE public.referrers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  token text NOT NULL UNIQUE DEFAULT public.fn_new_referrer_token(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT referrers_token_length CHECK (char_length(token) >= 22)
);
CREATE UNIQUE INDEX referrers_business_email_key ON public.referrers (business_id, lower(email)) WHERE email IS NOT NULL;
CREATE INDEX referrers_email_idx ON public.referrers (lower(email));

GRANT SELECT ON public.referrers TO authenticated;
GRANT ALL ON public.referrers TO service_role;
ALTER TABLE public.referrers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their own business referrers" ON public.referrers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = referrers.business_id AND b.user_id = auth.uid()));

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES public.referrers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS leads_referrer_id_idx ON public.leads (referrer_id);
ALTER TABLE public.referral_contacts ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES public.referrers(id) ON DELETE SET NULL;

-- Find or create the referrer for (business, email). Phone-only people get their own row.
CREATE OR REPLACE FUNCTION public.fn_upsert_referrer(p_business_id uuid, p_name text, p_email text, p_phone text)
RETURNS public.referrers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
  _name text := coalesce(nullif(btrim(coalesce(p_name, '')), ''), 'Customer');
  _r public.referrers%ROWTYPE;
BEGIN
  IF _email IS NOT NULL THEN
    INSERT INTO public.referrers (business_id, name, email, phone)
    VALUES (p_business_id, left(_name, 120), _email, nullif(btrim(coalesce(p_phone, '')), ''))
    ON CONFLICT (business_id, lower(email)) WHERE email IS NOT NULL
    DO UPDATE SET phone = coalesce(referrers.phone, EXCLUDED.phone)
    RETURNING * INTO _r;
  ELSE
    INSERT INTO public.referrers (business_id, name, phone)
    VALUES (p_business_id, left(_name, 120), nullif(btrim(coalesce(p_phone, '')), ''))
    RETURNING * INTO _r;
  END IF;
  RETURN _r;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_upsert_referrer(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_upsert_referrer(uuid, text, text, text) TO service_role;

-- Every new customer gets a personal link.
CREATE OR REPLACE FUNCTION public.fn_contact_assign_referrer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referrer_id IS NULL THEN
    NEW.referrer_id := (public.fn_upsert_referrer(NEW.business_id, NEW.name, NEW.email, NEW.phone)).id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_zz_contact_assign_referrer BEFORE INSERT ON public.referral_contacts
FOR EACH ROW EXECUTE FUNCTION public.fn_contact_assign_referrer();

-- Backfill existing customers and past referral senders.
UPDATE public.referral_contacts c
   SET referrer_id = (public.fn_upsert_referrer(c.business_id, c.name, c.email, c.phone)).id
 WHERE c.referrer_id IS NULL;
UPDATE public.leads l
   SET referrer_id = (public.fn_upsert_referrer(l.business_id, l.referrer_name, l.referrer_email, l.referrer_phone)).id
 WHERE l.referrer_id IS NULL AND l.referrer_email IS NOT NULL AND btrim(l.referrer_email) <> '';

-- Public: resolve a personal link to a first name only.
CREATE OR REPLACE FUNCTION public.fn_resolve_referrer(p_slug text, p_token text)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.referrers%ROWTYPE;
BEGIN
  IF coalesce(p_token, '') !~ '^[A-Za-z0-9_-]{22,64}$' THEN RETURN NULL; END IF;
  SELECT r.* INTO _r FROM public.referrers r
    JOIN public.businesses b ON b.id = r.business_id
   WHERE r.token = p_token
     AND b.slug = lower(btrim(coalesce(p_slug, '')))
     AND public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
   LIMIT 1;
  IF _r.id IS NULL THEN RETURN NULL; END IF;
  RETURN json_build_object('first_name', split_part(btrim(_r.name), ' ', 1), 'has_email', _r.email IS NOT NULL);
END;
$$;
GRANT EXECUTE ON FUNCTION public.fn_resolve_referrer(text, text) TO anon, authenticated;

-- Submission now accepts an optional personal link token and returns the referrer's own token.
DROP FUNCTION IF EXISTS public.fn_submit_public_referral(text, text, text, text, text, text, text, boolean, text, text, text);
CREATE FUNCTION public.fn_submit_public_referral(p_request_id text, p_slug text, p_referrer_name text, p_referrer_email text, p_lead_name text, p_lead_phone text, p_lead_need text, p_consent boolean, p_referrer_phone text DEFAULT NULL::text, p_lead_email text DEFAULT NULL::text, p_relationship text DEFAULT NULL::text, p_ref_token text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  _biz     public.businesses%ROWTYPE;
  _lead    public.leads%ROWTYPE;
  _sub     public.referral_submissions%ROWTYPE;
  _ref     public.referrers%ROWTYPE;
  _req     text := btrim(coalesce(p_request_id, ''));
  _name    text := btrim(coalesce(p_referrer_name, ''));
  _email   text := lower(btrim(coalesce(p_referrer_email, '')));
  _rphone  text := nullif(btrim(coalesce(p_referrer_phone, '')), '');
  _lname   text := btrim(coalesce(p_lead_name, ''));
  _lphone  text := btrim(coalesce(p_lead_phone, ''));
  _lemail  text := lower(btrim(coalesce(p_lead_email, '')));
  _need    text := btrim(coalesce(p_lead_need, ''));
  _rel     text := nullif(btrim(coalesce(p_relationship, '')), '');
  _fp      text;
BEGIN
  IF p_consent IS NOT TRUE THEN RAISE EXCEPTION 'consent_required'; END IF;
  IF _req !~ '^[a-zA-Z0-9_-]{24,64}$' THEN RAISE EXCEPTION 'invalid_request_id'; END IF;

  SELECT * INTO _biz FROM public.businesses
   WHERE slug = lower(btrim(coalesce(p_slug, '')))
     AND public.fn_page_live(account_status, is_published, is_disabled)
   LIMIT 1 FOR SHARE;
  IF _biz.id IS NULL THEN RAISE EXCEPTION 'page_not_live'; END IF;

  -- A personal link only counts on its own business's page; anything else is ignored.
  IF coalesce(p_ref_token, '') ~ '^[A-Za-z0-9_-]{22,64}$' THEN
    SELECT * INTO _ref FROM public.referrers WHERE token = p_ref_token AND business_id = _biz.id LIMIT 1;
  END IF;
  IF _ref.id IS NOT NULL THEN
    _name := _ref.name;
    IF _ref.email IS NOT NULL THEN _email := _ref.email; END IF;
    _rphone := coalesce(_rphone, _ref.phone);
  END IF;

  IF char_length(_name)  < 2 OR char_length(_name)  > 120  THEN RAISE EXCEPTION 'invalid_referrer_name';  END IF;
  IF _email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR char_length(_email) > 255
                                                            THEN RAISE EXCEPTION 'invalid_referrer_email'; END IF;
  IF char_length(_lname) < 2 OR char_length(_lname) > 120  THEN RAISE EXCEPTION 'invalid_lead_name';      END IF;
  IF char_length(_lphone) < 7 OR char_length(_lphone) > 32 THEN RAISE EXCEPTION 'invalid_lead_phone';     END IF;
  IF _lemail <> '' AND (_lemail !~ '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$' OR char_length(_lemail) > 255)
                                                            THEN RAISE EXCEPTION 'invalid_lead_email';     END IF;
  IF char_length(_need)  < 3 OR char_length(_need)  > 2000 THEN RAISE EXCEPTION 'invalid_lead_need';      END IF;
  IF char_length(coalesce(_rel, '')) > 200 OR char_length(coalesce(_rphone, '')) > 32
                                                            THEN RAISE EXCEPTION 'invalid_input';          END IF;

  _fp := md5(jsonb_build_array(_biz.id, _name, _email, _rphone, _lname, _lphone, _lemail, _need, _rel)::text);
  PERFORM pg_advisory_xact_lock(hashtextextended('revvin-referral:' || _biz.id::text || ':' || _req, 0));

  SELECT * INTO _sub FROM public.referral_submissions WHERE business_id = _biz.id AND request_id = _req LIMIT 1;
  IF _sub.id IS NOT NULL THEN
    IF _sub.fingerprint <> _fp THEN RAISE EXCEPTION 'submission_conflict'; END IF;
    SELECT * INTO _lead FROM public.leads WHERE id = _sub.lead_id LIMIT 1;
    IF _lead.id IS NULL THEN RAISE EXCEPTION 'submission_conflict'; END IF;
    SELECT * INTO _ref FROM public.referrers WHERE id = _lead.referrer_id LIMIT 1;
    RETURN json_build_object('lead_id', _lead.id, 'status_token', _lead.status_token,
      'business_name', _biz.name, 'replay', true, 'referrer_token', _ref.token);
  END IF;

  IF NOT public.fn_rate_bucket_hit('ref:' || _biz.id::text || ':' || md5(_email), interval '1 hour', 5) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;
  IF NOT public.fn_rate_bucket_hit('biz:' || _biz.id::text, interval '1 hour', 60) THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  IF _ref.id IS NULL THEN
    _ref := public.fn_upsert_referrer(_biz.id, _name, _email, _rphone);
  ELSIF _ref.email IS NULL THEN
    -- A phone-only customer typed their email once; keep it unless another row owns it.
    BEGIN
      UPDATE public.referrers SET email = _email WHERE id = _ref.id;
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
  END IF;

  INSERT INTO public.leads (
    business_id, referrer_name, referrer_email, referrer_phone,
    lead_name, lead_phone, lead_email, lead_need, relationship_to_lead,
    consent_given, lead_source, status, referrer_user_id, status_token, referrer_id
  ) VALUES (
    _biz.id, _name, _email, _rphone,
    _lname, _lphone, nullif(_lemail, ''), _need, _rel,
    true, 'public_page', 'new', auth.uid(), gen_random_uuid(), _ref.id
  )
  RETURNING * INTO _lead;

  INSERT INTO public.referral_submissions (business_id, request_id, fingerprint, lead_id)
  VALUES (_biz.id, _req, _fp, _lead.id);

  INSERT INTO public.notification_jobs (business_id, lead_id, event)
  VALUES (_biz.id, _lead.id, 'new_lead')
  ON CONFLICT (lead_id, event) DO NOTHING;

  RETURN json_build_object('lead_id', _lead.id, 'status_token', _lead.status_token,
    'business_name', _biz.name, 'replay', false, 'referrer_token', _ref.token);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.fn_submit_public_referral(text, text, text, text, text, text, text, boolean, text, text, text, text) TO anon, authenticated;

-- Owner: referrers with counts. Only the caller's own business.
CREATE OR REPLACE FUNCTION public.fn_business_referrers()
RETURNS TABLE(id uuid, name text, email text, token text, referrals_sent integer, referrals_closed integer, rewards_owed numeric, rewards_paid numeric, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.id, r.name, r.email, r.token,
    count(l.id)::int,
    count(l.id) FILTER (WHERE l.status = 'closed_won')::int,
    coalesce(sum(w.amount) FILTER (WHERE w.status <> 'paid'), 0),
    coalesce(sum(w.amount) FILTER (WHERE w.status = 'paid'), 0),
    r.created_at
  FROM public.referrers r
  JOIN public.businesses b ON b.id = r.business_id AND b.user_id = auth.uid()
  LEFT JOIN public.leads l ON l.referrer_id = r.id
  LEFT JOIN public.rewards w ON w.lead_id = l.id
  GROUP BY r.id
  ORDER BY count(l.id) DESC, r.created_at DESC;
$$;
REVOKE ALL ON FUNCTION public.fn_business_referrers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_business_referrers() TO authenticated;

-- Referrer home: everything for the signed-in, confirmed email address. Read-only.
CREATE OR REPLACE FUNCTION public.fn_my_referrals()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT lower(u.email) INTO _email FROM auth.users u
   WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL;
  IF _email IS NULL THEN RETURN '[]'::json; END IF;
  RETURN coalesce((
    SELECT json_agg(x ORDER BY x.business_name) FROM (
      SELECT b.name AS business_name, b.slug, b.offer_amount AS reward, r.token,
        coalesce((
          SELECT json_agg(json_build_object(
              'lead_first_name', split_part(btrim(l.lead_name), ' ', 1),
              'created_at', l.created_at,
              'status', CASE l.status
                WHEN 'new' THEN 'new' WHEN 'contacted' THEN 'contacted'
                WHEN 'in_progress' THEN 'quoted' WHEN 'closed_won' THEN 'closed'
                ELSE 'lost' END,
              'reward_amount', w.amount,
              'reward_status', CASE WHEN w.id IS NULL THEN NULL WHEN w.status = 'paid' THEN 'paid' ELSE 'owed' END
            ) ORDER BY l.created_at DESC)
          FROM public.leads l LEFT JOIN public.rewards w ON w.lead_id = l.id
          WHERE l.referrer_id = r.id), '[]'::json) AS referrals
      FROM public.referrers r JOIN public.businesses b ON b.id = r.business_id
      WHERE lower(r.email) = _email AND coalesce(b.is_demo, false) = false
    ) x), '[]'::json);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_my_referrals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_my_referrals() TO authenticated;