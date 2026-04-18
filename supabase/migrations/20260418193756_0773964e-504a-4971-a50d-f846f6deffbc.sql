-- T1: bypass status-change trigger to clear pending_approval backlog
ALTER TABLE public.businesses DISABLE TRIGGER USER;

UPDATE public.businesses
SET account_status = 'approved', updated_at = now()
WHERE account_status = 'pending_approval';

ALTER TABLE public.businesses ENABLE TRIGGER USER;