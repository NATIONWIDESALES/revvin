REVOKE EXECUTE ON FUNCTION public.fn_enqueue_webhook(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_webhook_on_lead() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_webhook_on_reward_paid() FROM PUBLIC, anon, authenticated;