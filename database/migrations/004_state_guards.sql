-- Additional server-independent invariants. Review after 001-003.
BEGIN;
CREATE OR REPLACE FUNCTION public.enforce_booking_transition() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE net_paid numeric; required numeric;
BEGIN
 IF NEW.booking_status<>OLD.booking_status THEN
   IF NOT ((OLD.booking_status='pending' AND NEW.booking_status IN ('confirmed','cancelled','expired')) OR
           (OLD.booking_status='confirmed' AND NEW.booking_status IN ('completed','cancelled'))) THEN
     RAISE EXCEPTION 'Invalid booking transition' USING ERRCODE='23514';
   END IF;
   IF NEW.booking_status IN ('confirmed','completed') THEN
     SELECT coalesce(sum(amount),0) INTO net_paid FROM public.payments WHERE booking_id=NEW.id AND payment_status='succeeded';
     net_paid := net_paid - (SELECT coalesce(sum(amount),0) FROM public.refunds WHERE booking_id=NEW.id AND status='succeeded');
     required := CASE WHEN NEW.booking_status='completed' OR NEW.payment_plan='full' THEN NEW.total_price ELSE least(30,NEW.total_price) END;
     IF net_paid<required THEN RAISE EXCEPTION 'Insufficient verified payment' USING ERRCODE='23514'; END IF;
   END IF;
   IF NEW.booking_status='completed' AND NEW.check_out_date>(now() AT TIME ZONE 'UTC')::date THEN
     RAISE EXCEPTION 'Stay has not ended' USING ERRCODE='23514';
   END IF;
   IF NEW.booking_status='confirmed' AND (OLD.payment_due_at IS NULL OR OLD.payment_due_at<=now()) THEN
     RAISE EXCEPTION 'Payment hold expired' USING ERRCODE='23514';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.enforce_payment_state() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.payment_status<>'pending' THEN RAISE EXCEPTION 'Payment must start pending' USING ERRCODE='23514'; END IF;
 ELSE
   IF (NEW.booking_id,NEW.user_id,NEW.amount,NEW.currency,NEW.provider,NEW.is_simulated) IS DISTINCT FROM (OLD.booking_id,OLD.user_id,OLD.amount,OLD.currency,OLD.provider,OLD.is_simulated) THEN
     RAISE EXCEPTION 'Immutable payment snapshot' USING ERRCODE='23514';
   END IF;
   IF NEW.payment_status<>OLD.payment_status AND NOT
      ((OLD.payment_status='pending' AND NEW.payment_status IN ('succeeded','failed','timed_out')) OR
       (OLD.payment_status IN ('failed','timed_out') AND NEW.payment_status='succeeded')) THEN
     RAISE EXCEPTION 'Invalid payment transition' USING ERRCODE='23514';
   END IF;
   IF OLD.provider_payment_id IS NOT NULL AND NEW.provider_payment_id IS DISTINCT FROM OLD.provider_payment_id THEN
     RAISE EXCEPTION 'Immutable provider reference' USING ERRCODE='23514';
   END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.bookings WHERE id=NEW.booking_id AND guest_id=NEW.user_id) THEN
   RAISE EXCEPTION 'Payment owner mismatch' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER payment_state BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_state();
CREATE FUNCTION public.enforce_refund_state() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.payments WHERE id=NEW.payment_id AND booking_id=NEW.booking_id AND payment_status='succeeded' AND amount=NEW.amount) THEN
   RAISE EXCEPTION 'Refund must match a successful payment' USING ERRCODE='23514';
 END IF;
 IF TG_OP='INSERT' THEN
   IF NEW.status<>'requested' THEN RAISE EXCEPTION 'Refund must start requested' USING ERRCODE='23514'; END IF;
 ELSE
   IF (NEW.payment_id,NEW.booking_id,NEW.amount) IS DISTINCT FROM (OLD.payment_id,OLD.booking_id,OLD.amount) THEN
     RAISE EXCEPTION 'Immutable refund amount/payment' USING ERRCODE='23514';
   END IF;
   IF NEW.status<>OLD.status AND NOT (
     (OLD.status='requested' AND NEW.status IN ('approved','rejected')) OR
     (OLD.status='approved' AND NEW.status='processing') OR
     (OLD.status='processing' AND NEW.status IN ('succeeded','failed')) OR
     (OLD.status='failed' AND NEW.status IN ('processing','succeeded'))
   ) THEN RAISE EXCEPTION 'Invalid refund transition' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER refund_state BEFORE INSERT OR UPDATE ON public.refunds FOR EACH ROW EXECUTE FUNCTION public.enforce_refund_state();
REVOKE ALL ON FUNCTION public.enforce_payment_state(),public.enforce_refund_state() FROM PUBLIC;
COMMIT;
