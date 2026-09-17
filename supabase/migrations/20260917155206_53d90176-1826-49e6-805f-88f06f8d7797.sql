-- Revvin Partner Program. Server-side only: RLS is enabled and no policy is
-- created for anon or authenticated, so every read and write must go through an
-- edge function using the service role or an admin-checked path.

CREATE TABLE public.partners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  country text,
  channels text,
  audience_size text,
  promo_plan text,
  payout_method text NOT NULL DEFAULT 'paypal' CHECK (payout_method IN ('paypal', 'bank')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  code text UNIQUE CHECK (code IS NULL OR code ~ '^[a-z0-9-]{3,24}$'),
  dashboard_token text UNIQUE,
  tax_form_received boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_at timestamp with time zone
);
CREATE UNIQUE INDEX partners_email_key ON public.partners (lower(email));
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.partner_clicks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  landed_path text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX partner_clicks_partner_idx ON public.partner_clicks (partner_id, created_at DESC);
GRANT ALL ON public.partner_clicks TO service_role;
ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_attributed_at timestamp with time zone;
CREATE INDEX IF NOT EXISTS businesses_partner_idx ON public.businesses (partner_id);

CREATE TABLE public.partner_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL,
  method text NOT NULL,
  reference text,
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX partner_payouts_partner_idx ON public.partner_payouts (partner_id, paid_at DESC);
GRANT ALL ON public.partner_payouts TO service_role;
ALTER TABLE public.partner_payouts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.partner_commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  source_type text NOT NULL CHECK (source_type IN ('invoice', 'checkout')),
  stripe_object_id text NOT NULL UNIQUE,
  stripe_charge_id text,
  product text NOT NULL CHECK (product IN ('pro_monthly', 'pro_yearly', 'launch_package')),
  amount_collected_cents bigint NOT NULL,
  commission_cents bigint NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  paid_at timestamp with time zone NOT NULL DEFAULT now(),
  payable_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'payable', 'paid', 'reversed')),
  payout_id uuid REFERENCES public.partner_payouts(id) ON DELETE SET NULL,
  reversal_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX partner_commissions_partner_idx ON public.partner_commissions (partner_id, status);
CREATE INDEX partner_commissions_charge_idx ON public.partner_commissions (stripe_charge_id);
CREATE INDEX partner_commissions_maturity_idx ON public.partner_commissions (status, payable_at);
GRANT ALL ON public.partner_commissions TO service_role;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.partner_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL,
  commission_id uuid REFERENCES public.partner_commissions(id) ON DELETE SET NULL,
  reason text,
  payout_id uuid REFERENCES public.partner_payouts(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX partner_adjustments_partner_idx ON public.partner_adjustments (partner_id);
GRANT ALL ON public.partner_adjustments TO service_role;
ALTER TABLE public.partner_adjustments ENABLE ROW LEVEL SECURITY;

-- Attribution is set once, server-side. A business owner has an UPDATE policy
-- on their own row, so the columns are locked here instead: only the service
-- role may set or change them. SECURITY INVOKER on purpose, so current_role is
-- the role of the request rather than the function owner.
CREATE OR REPLACE FUNCTION public.prevent_partner_attribution_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_role = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NEW.partner_id IS DISTINCT FROM OLD.partner_id
     OR NEW.partner_attributed_at IS DISTINCT FROM OLD.partner_attributed_at THEN
    RAISE EXCEPTION 'partner attribution is set server side';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER businesses_partner_attribution_locked
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_partner_attribution_changes();