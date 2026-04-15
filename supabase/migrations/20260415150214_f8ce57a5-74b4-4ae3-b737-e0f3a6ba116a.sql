-- Change default account_status to 'approved' for auto-approval
ALTER TABLE public.businesses ALTER COLUMN account_status SET DEFAULT 'approved';