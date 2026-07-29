-- ============ API KEYS ============
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label text NOT NULL,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
CREATE INDEX idx_api_keys_business ON public.api_keys(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own api keys" ON public.api_keys FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));
CREATE POLICY "Owners create own api keys" ON public.api_keys FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));
CREATE POLICY "Owners revoke own api keys" ON public.api_keys FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));
CREATE POLICY "Owners delete own api keys" ON public.api_keys FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

-- ============ WEBHOOK ENDPOINTS ============
CREATE TABLE public.webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  url text NOT NULL,
  secret text NOT NULL,
  events text[] NOT NULL DEFAULT ARRAY['lead.created','deal.closed','reward.paid'],
  active boolean NOT NULL DEFAULT true,
  include_contact boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_endpoints_business ON public.webhook_endpoints(business_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own endpoints" ON public.webhook_endpoints FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

CREATE TRIGGER trg_webhook_endpoints_updated
BEFORE UPDATE ON public.webhook_endpoints
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ WEBHOOK DELIVERIES ============
CREATE TABLE public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  response_status integer,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_webhook_deliveries_pending ON public.webhook_deliveries(status, next_attempt_at);
CREATE INDEX idx_webhook_deliveries_business ON public.webhook_deliveries(business_id, created_at DESC);
GRANT SELECT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own deliveries" ON public.webhook_deliveries FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = business_id AND b.user_id = auth.uid()));

-- ============ TRIGGER SOURCE ATTRIBUTION ============
ALTER TABLE public.referral_triggers ADD COLUMN IF NOT EXISTS api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL;

-- ============ EVENT ENQUEUE ============
-- Payload carries identifiers only. Contact fields are added by the delivery
-- worker, and only for endpoints the owner explicitly flagged include_contact.
CREATE OR REPLACE FUNCTION public.fn_enqueue_webhook(p_business_id uuid, p_event text, p_payload jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.webhook_deliveries (endpoint_id, business_id, event, payload)
  SELECT e.id, p_business_id, p_event,
         p_payload || jsonb_build_object('event', p_event, 'business_id', p_business_id, 'occurred_at', now())
  FROM public.webhook_endpoints e
  WHERE e.business_id = p_business_id AND e.active = true AND p_event = ANY(e.events);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_webhook_on_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.fn_enqueue_webhook(NEW.business_id, 'lead.created', jsonb_build_object(
      'lead_id', NEW.id, 'status', NEW.status, 'created_at', NEW.created_at
    ));
  ELSIF NEW.status = 'closed_won' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.fn_enqueue_webhook(NEW.business_id, 'deal.closed', jsonb_build_object(
      'lead_id', NEW.id, 'status', NEW.status, 'deal_value', NEW.deal_value
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_webhook_on_lead_insert
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.fn_webhook_on_lead();

CREATE TRIGGER trg_webhook_on_lead_update
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.fn_webhook_on_lead();

CREATE OR REPLACE FUNCTION public.fn_webhook_on_reward_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.fn_enqueue_webhook(NEW.business_id, 'reward.paid', jsonb_build_object(
      'reward_id', NEW.id, 'lead_id', NEW.lead_id, 'amount', NEW.amount, 'marked_paid_at', NEW.marked_paid_at
    ));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_webhook_on_reward_paid
AFTER UPDATE ON public.rewards
FOR EACH ROW EXECUTE FUNCTION public.fn_webhook_on_reward_paid();