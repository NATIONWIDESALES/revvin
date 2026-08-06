CREATE OR REPLACE FUNCTION public.fn_release_invite_code(p_session_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_id uuid;
BEGIN
  IF p_session_id IS NULL OR length(trim(p_session_id)) = 0 THEN
    RETURN false;
  END IF;

  -- Deleting the redemption row is the idempotency gate: a redelivered Stripe
  -- event finds nothing to delete and returns false without touching `uses`.
  DELETE FROM public.invite_redemptions
  WHERE stripe_session_id = p_session_id
  RETURNING invite_code_id INTO v_code_id;

  IF v_code_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.invite_codes
  SET uses = GREATEST(uses - 1, 0)
  WHERE id = v_code_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_release_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_release_invite_code(text) TO service_role;