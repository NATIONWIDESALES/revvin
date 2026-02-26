
-- Add deposit tracking columns to offers table
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'required',
  ADD COLUMN IF NOT EXISTS deposit_amount numeric,
  ADD COLUMN IF NOT EXISTS deposit_currency text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS deposit_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS max_payout_cap numeric;

-- Mark all existing offers as not requiring deposit (grandfathered)
UPDATE public.offers SET deposit_status = 'not_required' WHERE deposit_status = 'required';

-- Allow admins to update deposit_status on any offer
CREATE POLICY "Admins update all offers"
  ON public.offers
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
