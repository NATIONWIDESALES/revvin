-- Live function not present in archived migrations. No entitlement changes.
CREATE OR REPLACE FUNCTION public.fn_business_derive_plan()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.plan := CASE WHEN lower(coalesce(NEW.subscription_status,'none'))
    IN ('active','trialing','past_due','paid') THEN 'pro' ELSE 'free' END;
  RETURN NEW;
END $$;