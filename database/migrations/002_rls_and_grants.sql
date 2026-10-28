-- REVIEW ON STAGING. Express is the only writer of business data.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='traveling_backend') THEN CREATE ROLE traveling_backend NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA public TO traveling_backend;
GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO traveling_backend;
REVOKE UPDATE,DELETE ON public.admin_audit_logs FROM traveling_backend;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_review_eligibility() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_booking_transition() FROM PUBLIC;
DO $$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['users','categories','amenities','listings','listing_photos','listing_amenities','favorites','bookings','payments','reviews','coupons','coupon_redemptions','refunds','webhook_events','admin_audit_logs'] LOOP
   EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
   EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated',t);
   EXECUTE format('CREATE POLICY backend_access ON public.%I TO traveling_backend USING (true) WITH CHECK (true)',t);
 END LOOP;
END $$;
-- Optional direct read-only discovery; private tables have no anon/authenticated policy.
GRANT SELECT ON public.categories,public.amenities,public.listings,public.listing_photos,public.listing_amenities,public.reviews TO anon,authenticated;
CREATE POLICY public_categories ON public.categories FOR SELECT TO anon,authenticated USING(is_active);
CREATE POLICY public_amenities ON public.amenities FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY public_listings ON public.listings FOR SELECT TO anon,authenticated USING(is_active AND EXISTS(SELECT 1 FROM public.categories WHERE id=category_id AND is_active));
CREATE POLICY public_photos ON public.listing_photos FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.listings WHERE id=listing_id AND is_active));
CREATE POLICY public_listing_amenities ON public.listing_amenities FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.listings WHERE id=listing_id AND is_active));
CREATE POLICY public_reviews ON public.reviews FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.listings WHERE id=listing_id AND is_active));
COMMIT;
-- DBA must separately create a dedicated LOGIN and GRANT traveling_backend TO that login.
-- Do NOT grant this role to authenticator/anon/authenticated or expose its credential to clients.
-- Review pre-existing policies and grants first: RLS policies OR together; this migration alone cannot
-- neutralize unknown earlier policies. See database/preflight.sql and docs/RUNBOOK.md.
