DROP POLICY IF EXISTS "Anyone can record an allowed funnel event" ON public.funnel_events;
CREATE POLICY "Anyone can record an allowed funnel event"
  ON public.funnel_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(event) <= 64
    AND event = ANY (ARRAY[
      'signup_viewed','signup_submitted','signup_succeeded','signup_failed',
      'onboarding_started','onboarding_completed',
      'go_live_clicked','checkout_redirected','checkout_succeeded','checkout_canceled',
      'email_lead_submitted','referral_submitted','sample_page_viewed',
      'promo_popup_shown','promo_cta_clicked'
    ])
    AND (session_id IS NULL OR length(session_id) <= 64)
    AND (path IS NULL OR length(path) <= 512)
    AND (referrer IS NULL OR length(referrer) <= 512)
    AND (user_agent IS NULL OR length(user_agent) <= 512)
  );