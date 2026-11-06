REVOKE ALL ON public.smoke_test_runs FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.smoke_test_runs FROM authenticated;