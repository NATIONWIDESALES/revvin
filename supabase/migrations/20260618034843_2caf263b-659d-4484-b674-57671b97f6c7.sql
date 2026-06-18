-- Remove public/anon SELECT on the businesses base table.
-- Public marketplace reads must go through the column-restricted businesses_public view.
DROP POLICY IF EXISTS "Public can read approved or published businesses" ON public.businesses;

-- Switch businesses_public to security_definer (runs as view owner, bypasses base-table RLS)
-- so anon/authenticated can read the safe, column-restricted projection.
ALTER VIEW public.businesses_public SET (security_invoker = false);

-- Explicit grants so PostgREST exposes the view to public visitors.
GRANT SELECT ON public.businesses_public TO anon, authenticated;
