CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  failed_count INTEGER NOT NULL DEFAULT 0,
  disabled_at TIMESTAMP WITH TIME ZONE
);

GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own push subscriptions"
  ON public.push_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users add their own push subscriptions"
  ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own push subscriptions"
  ON public.push_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_push_subscriptions_user ON public.push_subscriptions(user_id) WHERE disabled_at IS NULL;
CREATE INDEX idx_push_subscriptions_business ON public.push_subscriptions(business_id) WHERE disabled_at IS NULL;

CREATE TABLE public.push_send_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID,
  user_id UUID,
  business_id UUID,
  endpoint TEXT,
  title TEXT,
  url TEXT,
  tag TEXT,
  status TEXT NOT NULL,
  status_code INTEGER,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.push_send_log TO service_role;

ALTER TABLE public.push_send_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_push_send_log_created ON public.push_send_log(created_at DESC);

ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS push_on_new_lead BOOLEAN NOT NULL DEFAULT true;