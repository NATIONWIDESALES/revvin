-- Reviewed rollback (restores the recorded prior view ACL, never run automatically):
-- GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.businesses_public TO anon, authenticated;
-- The owner-filtered SECURITY DEFINER view is deliberately retained for public read access.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON public.businesses_public FROM anon, authenticated;
