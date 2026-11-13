CREATE TABLE public.job_ask_delay_rollback_20261113 (
  business_id uuid PRIMARY KEY,
  previous_delay_hours integer NOT NULL
);
GRANT ALL ON public.job_ask_delay_rollback_20261113 TO service_role;
ALTER TABLE public.job_ask_delay_rollback_20261113 ENABLE ROW LEVEL SECURITY;
INSERT INTO public.job_ask_delay_rollback_20261113 (business_id, previous_delay_hours)
SELECT id, trigger_delay_hours FROM public.businesses WHERE trigger_delay_hours = 24;
ALTER TABLE public.businesses ALTER COLUMN trigger_delay_hours SET DEFAULT 2;
UPDATE public.businesses SET trigger_delay_hours = 2 WHERE trigger_delay_hours = 24;
