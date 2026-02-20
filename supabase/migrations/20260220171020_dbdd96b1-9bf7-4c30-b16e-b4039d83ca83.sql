
-- Wallet balances table (one per business)
CREATE TABLE public.wallet_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  available numeric NOT NULL DEFAULT 0,
  reserved numeric NOT NULL DEFAULT 0,
  paid_out numeric NOT NULL DEFAULT 0,
  platform_fees numeric NOT NULL DEFAULT 0,
  total_funded numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wallet" ON public.wallet_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wallet" ON public.wallet_balances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own wallet" ON public.wallet_balances FOR UPDATE USING (auth.uid() = user_id);

-- Wallet transactions table
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('topup', 'reserve', 'release', 'payout', 'refund', 'fee')),
  amount numeric NOT NULL,
  description text NOT NULL,
  referral_id uuid REFERENCES public.referrals(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own transactions" ON public.wallet_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_wallet_balances_updated_at
  BEFORE UPDATE ON public.wallet_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
