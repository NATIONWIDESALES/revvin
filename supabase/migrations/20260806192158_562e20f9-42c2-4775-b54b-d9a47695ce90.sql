CREATE TABLE public.invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  trial_days integer NOT NULL DEFAULT 90,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE TABLE public.invite_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code_id uuid NOT NULL REFERENCES public.invite_codes(id) ON DELETE CASCADE,
  business_id uuid,
  user_id uuid,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  stripe_session_id text
);

CREATE INDEX idx_invite_redemptions_code ON public.invite_redemptions(invite_code_id);

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS invite_code text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invite_codes TO authenticated;
GRANT ALL ON public.invite_codes TO service_role;
GRANT SELECT ON public.invite_redemptions TO authenticated;
GRANT ALL ON public.invite_redemptions TO service_role;

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage invite codes"
ON public.invite_codes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins read invite redemptions"
ON public.invite_redemptions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Atomic single-statement claim. Returns the row only when a use was claimed.
CREATE OR REPLACE FUNCTION public.fn_claim_invite_code(p_code text)
RETURNS TABLE(id uuid, code text, trial_days integer, uses integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.invite_codes ic
     SET uses = ic.uses + 1
   WHERE ic.id = (SELECT i2.id FROM public.invite_codes i2 WHERE upper(i2.code) = upper(p_code) LIMIT 1)
     AND ic.active = true
     AND (ic.expires_at IS NULL OR ic.expires_at > now())
     AND (ic.max_uses IS NULL OR ic.uses < ic.max_uses)
  RETURNING ic.id, ic.code, ic.trial_days, ic.uses;
$$;

REVOKE ALL ON FUNCTION public.fn_claim_invite_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_claim_invite_code(text) TO service_role;