
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS email_on_new_lead boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_on_closed_deal boolean NOT NULL DEFAULT true;

-- Backfill nothing needed — defaults apply to existing rows.

-- Create a default settings row whenever a business is created.
CREATE OR REPLACE FUNCTION public.create_default_notification_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_settings (business_id)
  VALUES (NEW.id)
  ON CONFLICT (business_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_default_notification_settings ON public.businesses;
CREATE TRIGGER trg_default_notification_settings
AFTER INSERT ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.create_default_notification_settings();

-- Ensure unique constraint exists so the upsert/on-conflict above works.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notification_settings_business_id_key'
  ) THEN
    BEGIN
      ALTER TABLE public.notification_settings
        ADD CONSTRAINT notification_settings_business_id_key UNIQUE (business_id);
    EXCEPTION WHEN duplicate_table THEN NULL;
    END;
  END IF;
END $$;
