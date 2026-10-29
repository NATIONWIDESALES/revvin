-- 1. Free plan contact cap: 100 referral_contacts per business. Pro unlimited. Demo accounts skipped.
CREATE OR REPLACE FUNCTION public.fn_enforce_free_contact_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan text;
  v_demo boolean;
  v_count integer;
BEGIN
  SELECT plan, coalesce(is_demo, false) INTO v_plan, v_demo
  FROM public.businesses WHERE id = NEW.business_id;
  IF coalesce(v_plan, 'free') = 'pro' OR v_demo THEN
    RETURN NEW;
  END IF;
  -- Serialise concurrent inserts for one business so a parallel import cannot overshoot.
  PERFORM pg_advisory_xact_lock(hashtext('free_contact_limit:' || NEW.business_id::text));
  SELECT count(*) INTO v_count FROM public.referral_contacts WHERE business_id = NEW.business_id;
  IF v_count >= 100 THEN
    RAISE EXCEPTION 'free_contact_limit' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_contact_limit ON public.referral_contacts;
CREATE TRIGGER trg_enforce_free_contact_limit
BEFORE INSERT ON public.referral_contacts
FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_free_contact_limit();

-- 2. Admin verification flag for the public Verified badge.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.businesses.is_verified IS 'Set only by a super admin (not the owner). Drives the public Verified badge on /r/{slug}.';

CREATE OR REPLACE FUNCTION public.fn_guard_is_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR session_user = 'service_role' OR current_user = 'service_role'
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_verified := false;
    RETURN NEW;
  END IF;
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    IF NOT has_role(auth.uid(), 'admin') OR OLD.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Only a super admin can change verification, and never on their own business';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_is_verified ON public.businesses;
CREATE TRIGGER trg_guard_is_verified
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_is_verified();

-- 3. Data fix requested by the owner.
UPDATE public.businesses SET category = 'Real Estate' WHERE slug = 'vancouver-realty-referrals';