-- Create saved_offers table for account-based bookmarks
CREATE TABLE public.saved_offers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  offer_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT saved_offers_user_offer_unique UNIQUE (user_id, offer_id)
);

CREATE INDEX idx_saved_offers_user_id ON public.saved_offers (user_id, created_at DESC);

ALTER TABLE public.saved_offers ENABLE ROW LEVEL SECURITY;

-- Users can view only their own saved offers
CREATE POLICY "Users view own saved offers"
  ON public.saved_offers
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert only their own saved offers
CREATE POLICY "Users save own offers"
  ON public.saved_offers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove only their own saved offers
CREATE POLICY "Users remove own saved offers"
  ON public.saved_offers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
