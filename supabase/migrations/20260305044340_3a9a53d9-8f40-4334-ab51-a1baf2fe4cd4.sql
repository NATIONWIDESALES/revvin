
CREATE OR REPLACE FUNCTION public.notify_business_signup_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1) || '/functions/v1/notify-business-signup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'businesses',
      'record', row_to_json(NEW)::jsonb
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_insert_notify
AFTER INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.notify_business_signup_webhook();
