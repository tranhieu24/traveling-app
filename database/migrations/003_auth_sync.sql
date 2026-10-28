-- Supabase Auth table layout must be checked by DBA before applying. REVIEW ONLY.
BEGIN;
ALTER TABLE public.users ADD COLUMN tokens_valid_after timestamptz;
ALTER TABLE public.users ADD COLUMN desired_auth_email varchar(255);
ALTER TABLE public.users ADD COLUMN auth_sync_error text;
CREATE FUNCTION public.revoke_customer_sessions(target uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF to_regclass('auth.sessions') IS NULL OR to_regclass('auth.refresh_tokens') IS NULL THEN
   RAISE EXCEPTION 'Supabase auth session tables unavailable; inspect deployment before use';
 END IF;
 DELETE FROM auth.refresh_tokens WHERE user_id::text=target::text;
 DELETE FROM auth.sessions WHERE user_id=target;
END $$;
REVOKE ALL ON FUNCTION public.revoke_customer_sessions(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_customer_sessions(uuid) TO traveling_backend;
COMMIT;
