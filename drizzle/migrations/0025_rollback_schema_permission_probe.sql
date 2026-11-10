DO $probe$
BEGIN
  RAISE NOTICE 'Migration session_user=%, current_user=%, current_role=%', session_user, current_user, current_role;
  BEGIN
    CREATE TABLE public.__revvin_permission_probe_20261110 (id integer);
    GRANT ALL ON public.__revvin_permission_probe_20261110 TO service_role;
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'intentional_probe_rollback';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN RAISE NOTICE 'Probe creation succeeded; subtransaction rolled back';
    WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'Probe refused: session_user=%, current_user=%, current_role=%, SQLSTATE=%, error=%', session_user, current_user, current_role, SQLSTATE, SQLERRM USING ERRCODE = '42501';
  END;
END
$probe$;