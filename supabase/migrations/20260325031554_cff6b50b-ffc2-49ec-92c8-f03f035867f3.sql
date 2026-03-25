
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS pricing_tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'none';

ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS platform_fee_rate numeric NOT NULL DEFAULT 0.25;

ALTER TABLE public.wallet_transactions
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id);
