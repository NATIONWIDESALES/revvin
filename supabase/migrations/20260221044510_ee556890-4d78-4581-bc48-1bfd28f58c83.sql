-- Create notifications log table for audit trail
CREATE TABLE public.notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'logged',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications_log ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (edge function uses service role key)
-- Admins can read
CREATE POLICY "Admins view notifications"
ON public.notifications_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
