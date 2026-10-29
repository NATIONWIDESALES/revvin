REVOKE ALL ON public.referrers FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.referrers FROM authenticated;