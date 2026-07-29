-- 1. email_leads: missing Data API grants (root cause of zero rows)
GRANT INSERT ON public.email_leads TO anon;
GRANT INSERT, SELECT ON public.email_leads TO authenticated;
GRANT ALL ON public.email_leads TO service_role;

-- 2. allow the new marketplace_notify source
DROP POLICY IF EXISTS "Anyone can submit an email lead" ON public.email_leads;
CREATE POLICY "Anyone can submit an email lead"
  ON public.email_leads FOR INSERT TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) >= 3
    AND length(email) <= 320
    AND source = ANY (ARRAY['landing'::text, 'playbook'::text, 'sample'::text, 'marketplace_notify'::text])
  );

-- 3. funnel_events
CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  session_id text,
  path text,
  referrer text,
  user_agent text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_funnel_events_event_created_at ON public.funnel_events (event, created_at DESC);

GRANT INSERT ON public.funnel_events TO anon;
GRANT INSERT, SELECT ON public.funnel_events TO authenticated;
GRANT ALL ON public.funnel_events TO service_role;

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record an allowed funnel event"
  ON public.funnel_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(event) <= 64
    AND event = ANY (ARRAY[
      'signup_viewed','signup_submitted','signup_succeeded','signup_failed',
      'onboarding_started','onboarding_completed',
      'go_live_clicked','checkout_redirected','checkout_succeeded','checkout_canceled',
      'email_lead_submitted','referral_submitted','sample_page_viewed'
    ])
    AND (session_id IS NULL OR length(session_id) <= 64)
    AND (path IS NULL OR length(path) <= 512)
    AND (referrer IS NULL OR length(referrer) <= 512)
    AND (user_agent IS NULL OR length(user_agent) <= 512)
  );

CREATE POLICY "Admins can read funnel events"
  ON public.funnel_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
