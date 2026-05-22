-- pgmq queues for SMS
DO $$ BEGIN PERFORM pgmq.create('sms_outbound'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN PERFORM pgmq.create('sms_outbound_dlq'); EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Extend send_log to support send-engine state machine
ALTER TABLE public.send_log
  ADD COLUMN IF NOT EXISTS message_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

DO $$ BEGIN
  ALTER TABLE public.send_log ADD CONSTRAINT send_log_status_check
    CHECK (status IN ('sent','failed','rate_limited','dlq','staged'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_send_log_message_id
  ON public.send_log(message_id) WHERE message_id IS NOT NULL;

-- One-click unsubscribe tokens
CREATE TABLE IF NOT EXISTS public.unsubscribe_tokens (
  token TEXT PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('email','sms')),
  contact_value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

ALTER TABLE public.unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages unsubscribe tokens"
ON public.unsubscribe_tokens FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_business
  ON public.unsubscribe_tokens(business_id);