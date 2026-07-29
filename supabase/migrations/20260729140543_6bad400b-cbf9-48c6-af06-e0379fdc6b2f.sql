ALTER TABLE public.rewards
  ADD COLUMN IF NOT EXISTS created_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_rewards_business_status_paid
  ON public.rewards (business_id, status, marked_paid_at);