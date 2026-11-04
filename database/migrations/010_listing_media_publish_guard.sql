-- Prevent audited real-property listings from being published without approved property media.
-- Apply after 009_real_homestay_catalog.sql. Existing listings without a source audit are unchanged.
BEGIN;

CREATE OR REPLACE FUNCTION public.is_listing_media_publishable(target_listing_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1
      FROM public.listing_source_audits audit
      WHERE audit.listing_id = target_listing_id
    )
    OR (
      EXISTS (
        SELECT 1
        FROM public.listing_source_audits audit
        WHERE audit.listing_id = target_listing_id
          AND audit.media_usage_status = 'approved'
      )
      AND EXISTS (
        SELECT 1
        FROM public.listing_photos photo
        WHERE photo.listing_id = target_listing_id
          AND photo.is_cover
          AND photo.media_context->>'usageStatus' = 'approved'
          AND photo.media_context->>'contextLevel' = 'verified_property'
          AND photo.media_context->>'targetId' = target_listing_id::text
          AND NULLIF(photo.media_context->>'sourcePageUrl', '') IS NOT NULL
          AND NULLIF(photo.media_context->>'licenseName', '') IS NOT NULL
          AND NULLIF(photo.media_context->>'licenseUrl', '') IS NOT NULL
          AND NULLIF(photo.media_context->>'attributionText', '') IS NOT NULL
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_listing_media_publishable(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_listing_media_publishable(uuid) TO traveling_backend;

CREATE OR REPLACE FUNCTION public.enforce_listing_media_publishable()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.is_active AND NOT public.is_listing_media_publishable(NEW.id) THEN
    RAISE EXCEPTION
      'Listing % cannot be activated until its source audit and verified property cover are approved',
      NEW.id
      USING ERRCODE = '23514', CONSTRAINT = 'listing_media_publishable';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_listing_media_publishable() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_listing_media_publishable ON public.listings;
CREATE TRIGGER trg_listing_media_publishable
BEFORE INSERT OR UPDATE OF is_active ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_listing_media_publishable();

CREATE OR REPLACE FUNCTION public.recheck_published_listing_media()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  affected_listing_id uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    affected_listing_id := OLD.listing_id;
    IF EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = affected_listing_id AND is_active
    ) AND NOT public.is_listing_media_publishable(affected_listing_id) THEN
      RAISE EXCEPTION
        'Published listing % must retain an approved source audit and verified property cover',
        affected_listing_id
        USING ERRCODE = '23514', CONSTRAINT = 'listing_media_publishable';
    END IF;
  END IF;
  IF TG_OP <> 'DELETE' AND (TG_OP <> 'UPDATE' OR NEW.listing_id IS DISTINCT FROM OLD.listing_id) THEN
    affected_listing_id := NEW.listing_id;
    IF EXISTS (
      SELECT 1 FROM public.listings
      WHERE id = affected_listing_id AND is_active
    ) AND NOT public.is_listing_media_publishable(affected_listing_id) THEN
      RAISE EXCEPTION
        'Published listing % must retain an approved source audit and verified property cover',
        affected_listing_id
        USING ERRCODE = '23514', CONSTRAINT = 'listing_media_publishable';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.recheck_published_listing_media() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_listing_source_publishable ON public.listing_source_audits;
CREATE CONSTRAINT TRIGGER trg_listing_source_publishable
AFTER INSERT OR UPDATE OR DELETE ON public.listing_source_audits
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.recheck_published_listing_media();

DROP TRIGGER IF EXISTS trg_listing_photo_publishable ON public.listing_photos;
CREATE CONSTRAINT TRIGGER trg_listing_photo_publishable
AFTER INSERT OR UPDATE OR DELETE ON public.listing_photos
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.recheck_published_listing_media();

COMMIT;

-- Verification after applying on staging:
-- SELECT count(*) FROM public.listings l
-- JOIN public.listing_source_audits a ON a.listing_id = l.id
-- WHERE l.is_active AND NOT public.is_listing_media_publishable(l.id); -- expected 0
-- Rollback requires review: drop the three triggers, then the two trigger functions and helper.
