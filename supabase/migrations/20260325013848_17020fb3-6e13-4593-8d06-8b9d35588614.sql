
-- Tremendous Integration — Supporting Schema

-- 1. Webhook deduplication log
CREATE TABLE IF NOT EXISTS public.tremendous_webhook_log (
  uuid text PRIMARY KEY,
  event text NOT NULL,
  resource_id text,
  resource_type text,
  payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tremendous_webhook_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view webhook logs"
ON public.tremendous_webhook_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Index for webhook lookups on provider_reference
CREATE INDEX IF NOT EXISTS idx_payouts_provider_reference 
ON public.payouts(provider_reference) 
WHERE provider_reference IS NOT NULL;

-- 3. Add tremendous_reward_id to payouts for faster lookup
ALTER TABLE public.payouts 
ADD COLUMN IF NOT EXISTS tremendous_reward_id text;

CREATE INDEX IF NOT EXISTS idx_payouts_tremendous_reward_id 
ON public.payouts(tremendous_reward_id) 
WHERE tremendous_reward_id IS NOT NULL;
