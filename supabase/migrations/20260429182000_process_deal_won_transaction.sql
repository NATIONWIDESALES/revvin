CREATE INDEX IF NOT EXISTS idx_payouts_referral_id ON public.payouts(referral_id);

CREATE OR REPLACE FUNCTION public.fn_process_deal_won(
  p_referral_id uuid,
  p_actor_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referral public.referrals%ROWTYPE;
  v_offer record;
  v_business_owner uuid;
  v_wallet public.wallet_balances%ROWTYPE;
  v_payout_amount numeric;
  v_currency text;
  v_fee_rate numeric;
  v_platform_fee numeric;
  v_total_deduction numeric;
BEGIN
  SELECT *
  INTO v_referral
  FROM public.referrals
  WHERE id = p_referral_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Referral not found';
  END IF;

  SELECT user_id
  INTO v_business_owner
  FROM public.businesses
  WHERE id = v_referral.business_id;

  IF v_business_owner IS NULL OR v_business_owner <> p_actor_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF v_referral.status NOT IN ('accepted', 'contacted', 'in_progress', 'qualified') THEN
    RAISE EXCEPTION 'Referral status "%" cannot be closed', v_referral.status;
  END IF;

  SELECT title, payout, currency, platform_fee_rate
  INTO v_offer
  FROM public.offers
  WHERE id = v_referral.offer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  v_payout_amount := COALESCE(v_referral.payout_snapshot, v_offer.payout, 0);
  v_currency := COALESCE(v_offer.currency, 'USD');
  v_fee_rate := COALESCE(v_offer.platform_fee_rate, 0.25);
  v_platform_fee := round(v_payout_amount * v_fee_rate, 2);
  v_total_deduction := round(v_payout_amount + v_platform_fee, 2);

  SELECT *
  INTO v_wallet
  FROM public.wallet_balances
  WHERE user_id = p_actor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No wallet found for this business';
  END IF;

  IF v_wallet.available < v_total_deduction THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format(
        'Insufficient wallet balance to process this payout. Need $%s, available $%s. Please top up your wallet.',
        to_char(v_total_deduction, 'FM9999999990.00'),
        to_char(v_wallet.available, 'FM9999999990.00')
      ),
      'shortfall', round(v_total_deduction - v_wallet.available, 2)
    );
  END IF;

  UPDATE public.referrals
  SET
    status = 'won',
    payout_amount = v_payout_amount,
    payout_status = 'approved',
    updated_at = now()
  WHERE id = p_referral_id;

  UPDATE public.wallet_balances
  SET
    available = round(available - v_total_deduction, 2),
    paid_out = round(paid_out + v_payout_amount, 2),
    platform_fees = round(platform_fees + v_platform_fee, 2),
    updated_at = now()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (
    user_id,
    type,
    amount,
    referral_id,
    description
  ) VALUES
    (
      p_actor_id,
      'payout',
      v_payout_amount,
      p_referral_id,
      'Payout for referral - ' || COALESCE(v_offer.title, 'offer')
    ),
    (
      p_actor_id,
      'fee',
      v_platform_fee,
      p_referral_id,
      'Platform fee (' || round(v_fee_rate * 100)::text || '%) - ' || COALESCE(v_offer.title, 'offer')
    );

  INSERT INTO public.payouts (
    referral_id,
    business_id,
    referrer_id,
    amount,
    platform_fee,
    currency,
    status
  ) VALUES (
    p_referral_id,
    v_referral.business_id,
    v_referral.referrer_id,
    v_payout_amount,
    v_platform_fee,
    v_currency,
    'ready'
  );

  PERFORM public.fn_create_audit_entry(
    p_referral_id,
    p_actor_id,
    'referral_won',
    jsonb_build_object('payout', v_payout_amount, 'platform_fee', v_platform_fee)
  );

  PERFORM public.fn_create_notification(
    v_referral.referrer_id,
    'Deal closed - payout coming!',
    'Your referral for "' || COALESCE(v_offer.title, 'this offer') || '" closed. You''ll receive $' || v_payout_amount::text || '.',
    'referral_won',
    p_referral_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'payout_amount', v_payout_amount,
    'platform_fee', v_platform_fee,
    'currency', v_currency,
    'referrer_id', v_referral.referrer_id,
    'business_id', v_referral.business_id,
    'offer_title', v_offer.title
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_process_deal_won(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_process_deal_won(uuid, uuid) TO service_role;
