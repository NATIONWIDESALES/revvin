CREATE TABLE public.print_kit_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  copy_to_owner boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX print_kit_sends_business_created_idx ON public.print_kit_sends (business_id, created_at DESC);
GRANT SELECT ON public.print_kit_sends TO authenticated;
GRANT ALL ON public.print_kit_sends TO service_role;
ALTER TABLE public.print_kit_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their print kit sends" ON public.print_kit_sends
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = print_kit_sends.business_id AND b.user_id = auth.uid()));

CREATE POLICY "Owners upload print kit PDFs to their own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'print-kits'
    AND lower(storage.extension(name)) = 'pdf'
    AND EXISTS (SELECT 1 FROM public.businesses b WHERE b.id::text = (storage.foldername(name))[1] AND b.user_id = auth.uid())
  );