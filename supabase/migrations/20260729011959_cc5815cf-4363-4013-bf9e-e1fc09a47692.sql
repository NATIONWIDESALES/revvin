UPDATE public.businesses
SET account_status = 'approved', updated_at = now()
WHERE account_status IS DISTINCT FROM 'approved'
  AND subscription_status IN ('active','trialing','past_due');