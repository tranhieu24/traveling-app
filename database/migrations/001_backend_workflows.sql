-- REVIEW ONLY. Apply manually after backup on staging; never run against production automatically.
BEGIN;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.payments) AND current_setting('traveling.approve_legacy_mock',true) IS DISTINCT FROM 'yes' THEN
   RAISE EXCEPTION 'Review existing payments first. SET traveling.approve_legacy_mock=yes only after confirming all legacy payments came from the original mock implementation.';
 END IF;
END $$;
ALTER TABLE public.users ADD COLUMN account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('active','blocked'));
ALTER TABLE public.users ADD COLUMN blocked_reason text;
ALTER TABLE public.users ADD COLUMN auth_sync_pending boolean NOT NULL DEFAULT false;
ALTER TABLE public.categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.categories ADD COLUMN description text;
CREATE TABLE public.coupons (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code varchar(40) NOT NULL UNIQUE CHECK (code = upper(code)),
 discount_percent numeric(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
 max_discount numeric(12,2) CHECK (max_discount >= 0), min_subtotal numeric(12,2) NOT NULL DEFAULT 0 CHECK (min_subtotal >= 0),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
 max_uses integer NOT NULL CHECK (max_uses > 0), used_count integer NOT NULL DEFAULT 0 CHECK (used_count >= 0 AND used_count <= max_uses),
 per_user_limit integer NOT NULL DEFAULT 1 CHECK (per_user_limit > 0),
 listing_id uuid REFERENCES public.listings(id), category_id uuid REFERENCES public.categories(id),
 is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings DROP CONSTRAINT bookings_booking_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_booking_status_check CHECK (booking_status IN ('pending','confirmed','cancelled','completed','expired'));
ALTER TABLE public.bookings ADD COLUMN discount_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0);
ALTER TABLE public.bookings ADD COLUMN tax_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0);
ALTER TABLE public.bookings ADD COLUMN tax_rate numeric(7,6) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 1);
ALTER TABLE public.bookings ADD COLUMN currency char(3) NOT NULL DEFAULT 'USD' CHECK (currency = 'USD');
ALTER TABLE public.bookings ADD COLUMN coupon_id uuid REFERENCES public.coupons(id);
ALTER TABLE public.bookings ADD COLUMN payment_plan text NOT NULL DEFAULT 'full' CHECK (payment_plan IN ('full','deposit'));
ALTER TABLE public.bookings ADD COLUMN payment_due_at timestamptz;
ALTER TABLE public.bookings ADD COLUMN completed_at timestamptz;
ALTER TABLE public.bookings DROP CONSTRAINT chk_total_price;
ALTER TABLE public.bookings ADD CONSTRAINT chk_total_price CHECK (total_price = price_per_night * total_nights + cleaning_fee + service_fee - discount_amount + tax_amount);
ALTER TABLE public.bookings ADD CONSTRAINT chk_discount CHECK (discount_amount <= price_per_night * total_nights);
UPDATE public.bookings SET payment_due_at = now() + interval '15 minutes' WHERE booking_status = 'pending';
CREATE TABLE public.coupon_redemptions (
 booking_id uuid PRIMARY KEY REFERENCES public.bookings(id), coupon_id uuid NOT NULL REFERENCES public.coupons(id),
 user_id uuid NOT NULL REFERENCES public.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.coupon_redemptions(coupon_id,user_id);
-- Coupon reservations count once per created booking and are NOT recycled after cancellation/expiry.
ALTER TABLE public.payments DROP CONSTRAINT payments_booking_id_key;
ALTER TABLE public.payments ADD COLUMN provider text NOT NULL DEFAULT 'legacy_mock' CHECK (provider IN ('legacy_mock','mock','stripe_test'));
ALTER TABLE public.payments ADD COLUMN is_simulated boolean NOT NULL DEFAULT true;
ALTER TABLE public.payments ADD COLUMN provider_payment_id text;
ALTER TABLE public.payments ADD COLUMN idempotency_key varchar(100);
ALTER TABLE public.payments ADD COLUMN requested_plan text CHECK (requested_plan IN ('full','deposit','balance'));
ALTER TABLE public.payments ADD COLUMN expires_at timestamptz;
ALTER TABLE public.payments ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.payments DROP CONSTRAINT payments_payment_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_status_check CHECK (payment_status IN ('pending','succeeded','failed','timed_out','refunded'));
CREATE UNIQUE INDEX payment_idempotency ON public.payments(user_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX payment_provider_reference ON public.payments(provider,provider_payment_id) WHERE provider_payment_id IS NOT NULL;
CREATE UNIQUE INDEX one_pending_payment ON public.payments(booking_id) WHERE payment_status = 'pending';
CREATE INDEX ON public.payments(booking_id);
CREATE TABLE public.refunds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id),
 booking_id uuid NOT NULL REFERENCES public.bookings(id), amount numeric(12,2) NOT NULL CHECK (amount > 0),
 status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','processing','succeeded','failed','rejected')),
 reason text NOT NULL, decision_reason text, decided_by uuid REFERENCES public.users(id),
 provider_refund_id text UNIQUE, succeeded_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.refunds(payment_id,booking_id,amount,status,reason,succeeded_at)
 SELECT id,booking_id,amount,'succeeded','Historical mock refund (unverified with any provider)',coalesce(paid_at,created_at)
 FROM public.payments WHERE payment_status = 'refunded' AND amount > 0;
UPDATE public.payments SET payment_status = 'succeeded' WHERE payment_status = 'refunded' AND amount > 0;
CREATE TABLE public.webhook_events (
 provider text NOT NULL, event_id text NOT NULL, payload_hash text NOT NULL, event_type text NOT NULL,
 processed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(provider,event_id)
);
CREATE TABLE public.admin_audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES public.users(id), action text NOT NULL,
 entity_type text NOT NULL, entity_id uuid, before_data jsonb, after_data jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.admin_audit_logs(created_at DESC);
-- Existing reviews are retained; eligibility applies to new inserts and edits.
CREATE FUNCTION public.enforce_review_eligibility() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE guest_id=NEW.user_id AND listing_id=NEW.listing_id AND booking_status='completed') THEN
   RAISE EXCEPTION 'Completed booking required for review' USING ERRCODE='23514', CONSTRAINT='review_completed_booking';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_eligibility BEFORE INSERT OR UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.enforce_review_eligibility();
CREATE FUNCTION public.enforce_booking_transition() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.booking_status <> OLD.booking_status AND NOT (
 (OLD.booking_status='pending' AND NEW.booking_status IN ('confirmed','cancelled','expired')) OR
 (OLD.booking_status='confirmed' AND NEW.booking_status IN ('completed','cancelled'))
 ) THEN RAISE EXCEPTION 'Invalid booking transition' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER booking_transition BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_transition();
COMMIT;
