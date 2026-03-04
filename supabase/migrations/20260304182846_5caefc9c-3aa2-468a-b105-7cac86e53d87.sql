
-- 1. Replace fn_create_audit_entry to use auth.uid() instead of accepting p_actor_id
CREATE OR REPLACE FUNCTION public.fn_create_audit_entry(
  p_referral_id uuid,
  p_event_type text,
  p_payload jsonb DEFAULT NULL::jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO public.audit_log (referral_id, actor_id, event_type, payload)
  VALUES (p_referral_id, auth.uid(), p_event_type, p_payload);
END;
$$;

-- 2. Lock down wallet_balances: remove user INSERT and UPDATE policies
DROP POLICY IF EXISTS "Users insert own wallet" ON public.wallet_balances;
DROP POLICY IF EXISTS "Users update own wallet" ON public.wallet_balances;

-- 3. Lock down wallet_transactions: remove user INSERT policy
DROP POLICY IF EXISTS "Users insert own transactions" ON public.wallet_transactions;
