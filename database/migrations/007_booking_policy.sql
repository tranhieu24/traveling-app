-- Review after 006; existing snapshots stay intact, NULL retains legacy $30/0-day rules.
BEGIN;
ALTER TABLE public.bookings ADD CONSTRAINT booking_policy_values CHECK (
  policy_snapshot IS NULL OR (
    (NOT (policy_snapshot ? 'depositAmount') OR (jsonb_typeof(policy_snapshot->'depositAmount')='number' AND (policy_snapshot->>'depositAmount')::numeric BETWEEN 0.50 AND 10000)) AND
    (NOT (policy_snapshot ? 'cancellationCutoffDays') OR (jsonb_typeof(policy_snapshot->'cancellationCutoffDays')='number' AND (policy_snapshot->>'cancellationCutoffDays')::numeric BETWEEN 0 AND 30 AND (policy_snapshot->>'cancellationCutoffDays')::numeric=trunc((policy_snapshot->>'cancellationCutoffDays')::numeric)))
  )
);
CREATE OR REPLACE FUNCTION public.enforce_booking_transition() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE net_paid numeric; required numeric;
BEGIN
 IF NEW.policy_snapshot IS DISTINCT FROM OLD.policy_snapshot THEN
   RAISE EXCEPTION 'Immutable booking policy snapshot' USING ERRCODE='23514';
 END IF;
 IF NEW.booking_status<>OLD.booking_status THEN
   IF OLD.booking_status='confirmed' AND NEW.booking_status='cancelled' AND
      (now() AT TIME ZONE 'UTC')::date >= OLD.check_in_date-coalesce((OLD.policy_snapshot->>'cancellationCutoffDays')::integer,0) THEN
     RAISE EXCEPTION 'Cancellation window closed' USING ERRCODE='23514';
   END IF;
   IF NOT ((OLD.booking_status='pending' AND NEW.booking_status IN ('confirmed','cancelled','expired')) OR
           (OLD.booking_status='confirmed' AND NEW.booking_status IN ('completed','cancelled'))) THEN
     RAISE EXCEPTION 'Invalid booking transition' USING ERRCODE='23514';
   END IF;
   IF NEW.booking_status IN ('confirmed','completed') THEN
     SELECT coalesce(sum(amount),0) INTO net_paid FROM public.payments WHERE booking_id=NEW.id AND payment_status='succeeded';
     net_paid := net_paid - (SELECT coalesce(sum(amount),0) FROM public.refunds WHERE booking_id=NEW.id AND status='succeeded');
     required := CASE WHEN NEW.booking_status='completed' OR NEW.payment_plan='full' THEN NEW.total_price ELSE least(coalesce((NEW.policy_snapshot->>'depositAmount')::numeric,30),NEW.total_price) END;
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
COMMIT;
-- Do not roll application back to hard-coded $30 rules while non-default snapshots exist.
-- Keep the snapshot-aware trigger and consumer code, or restore a coordinated backup.
