
-- 1. Add deal_value to leads and referrals (nullable, optional)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deal_value numeric;
ALTER TABLE public.referrals ADD COLUMN IF NOT EXISTS deal_value numeric;

-- 2. Monthly recap log (idempotency + dashboard "latest recap" surface)
CREATE TABLE IF NOT EXISTS public.monthly_recap_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  recipient_email text NOT NULL,
  summary jsonb NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, period_month)
);

GRANT SELECT ON public.monthly_recap_log TO authenticated;
GRANT ALL ON public.monthly_recap_log TO service_role;

ALTER TABLE public.monthly_recap_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view their own recaps"
  ON public.monthly_recap_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = monthly_recap_log.business_id
        AND b.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all recaps"
  ON public.monthly_recap_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_monthly_recap_log_business
  ON public.monthly_recap_log (business_id, period_month DESC);

-- 3. ROI helper. SECURITY DEFINER + owner check so a business can only get its own roll-up.
CREATE OR REPLACE FUNCTION public.fn_get_business_roi(
  p_business_id uuid,
  p_from timestamptz DEFAULT NULL,
  p_to   timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _leads_total int;
  _leads_won int;
  _leads_revenue numeric;
  _refs_total int;
  _refs_won int;
  _refs_revenue numeric;
BEGIN
  SELECT user_id INTO _owner FROM public.businesses WHERE id = p_business_id;
  IF _owner IS NULL THEN
    RAISE EXCEPTION 'business not found';
  END IF;
  IF _owner <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT
    count(*) FILTER (WHERE (p_from IS NULL OR created_at >= p_from)
                        AND (p_to   IS NULL OR created_at <  p_to)),
    count(*) FILTER (WHERE status = 'closed_won'
                        AND (p_from IS NULL OR created_at >= p_from)
                        AND (p_to   IS NULL OR created_at <  p_to)),
    coalesce(sum(deal_value) FILTER (WHERE status = 'closed_won'
                        AND (p_from IS NULL OR created_at >= p_from)
                        AND (p_to   IS NULL OR created_at <  p_to)), 0)
  INTO _leads_total, _leads_won, _leads_revenue
  FROM public.leads
  WHERE business_id = p_business_id;

  SELECT
    count(*) FILTER (WHERE (p_from IS NULL OR created_at >= p_from)
                        AND (p_to   IS NULL OR created_at <  p_to)),
    count(*) FILTER (WHERE status = 'won'
                        AND (p_from IS NULL OR created_at >= p_from)
                        AND (p_to   IS NULL OR created_at <  p_to)),
    coalesce(sum(deal_value) FILTER (WHERE status = 'won'
                        AND (p_from IS NULL OR created_at >= p_from)
                        AND (p_to   IS NULL OR created_at <  p_to)), 0)
  INTO _refs_total, _refs_won, _refs_revenue
  FROM public.referrals
  WHERE business_id = p_business_id;

  RETURN json_build_object(
    'leads_total',   _leads_total + _refs_total,
    'closed_count',  _leads_won + _refs_won,
    'revenue',       (_leads_revenue + _refs_revenue)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_business_roi(uuid, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_business_roi(uuid, timestamptz, timestamptz) TO service_role;
