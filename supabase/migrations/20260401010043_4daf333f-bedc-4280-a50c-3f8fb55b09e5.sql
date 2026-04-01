DROP TRIGGER IF EXISTS on_business_insert_notify ON public.businesses;
DROP FUNCTION IF EXISTS public.notify_business_signup_webhook();