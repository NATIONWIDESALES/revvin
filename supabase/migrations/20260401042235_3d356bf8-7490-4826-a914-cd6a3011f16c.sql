CREATE OR REPLACE FUNCTION public.prevent_status_self_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change account_status';
  END IF;

  IF NEW.verified IS DISTINCT FROM OLD.verified
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change verified status';
  END IF;

  RETURN NEW;
END;
$function$;