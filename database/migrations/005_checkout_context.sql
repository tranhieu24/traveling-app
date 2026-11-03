-- Additive migration. Existing bookings remain valid; no historical acceptance is invented.
BEGIN;
ALTER TABLE public.bookings
  ADD COLUMN contact_snapshot jsonb,
  ADD COLUMN policy_snapshot jsonb,
  ADD COLUMN policy_accepted_at timestamptz,
  ADD COLUMN client_request_id uuid,
  ADD COLUMN request_fingerprint text;
CREATE UNIQUE INDEX bookings_guest_request_unique
  ON public.bookings(guest_id, client_request_id) WHERE client_request_id IS NOT NULL;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_checkout_snapshot_objects CHECK (
  (contact_snapshot IS NULL OR jsonb_typeof(contact_snapshot) = 'object') AND
  (policy_snapshot IS NULL OR jsonb_typeof(policy_snapshot) = 'object') AND
  (policy_accepted_at IS NULL OR policy_snapshot IS NOT NULL)
);
ALTER TABLE public.listing_photos ADD COLUMN media_context jsonb;
ALTER TABLE public.listing_photos ADD CONSTRAINT listing_photos_media_object
  CHECK (media_context IS NULL OR jsonb_typeof(media_context) = 'object');
COMMIT;
-- Rollback after rolling back application code: drop index bookings_guest_request_unique;
-- then drop constraint bookings_checkout_snapshot_objects and the five added columns.
-- For listing_photos, drop listing_photos_media_object then media_context only
-- after exporting attribution/provenance and rolling back all consumers.
-- Export snapshot data first if it must be retained; never run rollback against live by default.
