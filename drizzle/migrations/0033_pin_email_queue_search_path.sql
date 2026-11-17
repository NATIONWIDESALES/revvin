-- Pin search_path on email queue helpers (bodies already schema-qualify pgmq).
-- Rollback: ALTER FUNCTION ... RESET search_path; for each of the four functions.
ALTER FUNCTION public.move_to_dlq(text,text,bigint,jsonb) SET search_path = '';
ALTER FUNCTION public.read_email_batch(text,integer,integer) SET search_path = '';
ALTER FUNCTION public.enqueue_email(text,jsonb) SET search_path = '';
ALTER FUNCTION public.delete_email(text,bigint) SET search_path = '';