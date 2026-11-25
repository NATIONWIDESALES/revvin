CREATE OR REPLACE FUNCTION public.fn_business_photo_public(p_path text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT EXISTS (SELECT 1 FROM public.business_photos p JOIN public.businesses b ON b.id = p.business_id
    WHERE p.storage_path = p_path AND (b.user_id = auth.uid() OR (public.fn_page_live(b.account_status, b.is_published, b.is_disabled)
      AND NOT coalesce(b.is_internal,false) AND NOT coalesce(b.is_demo,false))))
$$;
REVOKE ALL ON FUNCTION public.fn_business_photo_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_business_photo_public(text) TO anon, authenticated, service_role;
CREATE POLICY "Public reads listed business photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'business-photos' AND (public.fn_business_photo_public(objects.name)
    OR public.fn_owns_business(((storage.foldername(objects.name))[1])::uuid)));