CREATE TABLE public.email_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  source text NOT NULL DEFAULT 'landing',
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_leads_email_idx ON public.email_leads (lower(email));
CREATE INDEX email_leads_created_at_idx ON public.email_leads (created_at DESC);

GRANT INSERT ON public.email_leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.email_leads TO authenticated;
GRANT ALL ON public.email_leads TO service_role;

ALTER TABLE public.email_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an email lead"
  ON public.email_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) BETWEEN 3 AND 320
    AND source IN ('landing', 'playbook', 'sample')
  );

CREATE POLICY "Admins can read email leads"
  ON public.email_leads
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage email leads"
  ON public.email_leads
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));