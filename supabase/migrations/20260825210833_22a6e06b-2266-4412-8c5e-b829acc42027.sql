ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS is_demo boolean DEFAULT false;

COMMENT ON COLUMN public.businesses.is_demo IS
  'Marks a non production / demo account. Scheduled and triggered email senders skip these businesses.';

UPDATE public.businesses
  SET is_demo = true
  WHERE id = 'd45360cb-f81e-47cb-9bcd-d20aab2edb3b';