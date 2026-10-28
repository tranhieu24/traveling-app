-- Read-only inspection. Run yourself on staging/production; no data changes.
SELECT current_database(),current_user,version();
SELECT schemaname,tablename,rowsecurity FROM pg_tables WHERE schemaname='public';
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='public';
SELECT grantee,table_name,privilege_type FROM information_schema.role_table_grants
 WHERE table_schema='public' AND grantee IN ('anon','authenticated','PUBLIC','traveling_backend') ORDER BY table_name,grantee;
SELECT conrelid::regclass,conname,pg_get_constraintdef(oid) FROM pg_constraint
 WHERE connamespace='public'::regnamespace ORDER BY conrelid,conname;
SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='auth' AND table_name IN ('sessions','refresh_tokens') ORDER BY table_name,ordinal_position;
SELECT payment_status,count(*),sum(amount) FROM public.payments GROUP BY payment_status;
SELECT booking_status,count(*) FROM public.bookings GROUP BY booking_status;
SELECT count(*) AS reviews_without_completed_stay FROM public.reviews r
 WHERE NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.guest_id=r.user_id AND b.listing_id=r.listing_id AND b.booking_status='completed');
