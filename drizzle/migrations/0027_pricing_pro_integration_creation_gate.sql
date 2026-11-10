CREATE OR REPLACE FUNCTION public.fn_guard_pro_integration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
 IF public.fn_effective_plan(NEW.business_id)<>'pro' THEN RAISE EXCEPTION 'pro_required_automatic_ask'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fn_guard_pro_integration() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER pricing_pro_api_key BEFORE INSERT ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.fn_guard_pro_integration();
CREATE TRIGGER pricing_pro_webhook_endpoint BEFORE INSERT ON public.webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.fn_guard_pro_integration();