-- Allow the dedicated backend role to maintain provenance through the audited admin API.
-- RLS still blocks anon/authenticated clients; database publish guards from migration 010 remain authoritative.
BEGIN;

GRANT INSERT, UPDATE ON public.listing_source_audits TO traveling_backend;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'listing_source_audits'
      AND policyname = 'backend_write_access'
  ) THEN
    CREATE POLICY backend_write_access ON public.listing_source_audits
      FOR ALL TO traveling_backend USING (true) WITH CHECK (true);
  END IF;
END $$;

COMMIT;

-- Verification after applying on staging:
-- SELECT privilege_type FROM information_schema.role_table_grants
-- WHERE grantee='traveling_backend' AND table_name='listing_source_audits';
