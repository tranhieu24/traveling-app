-- Durable transactional email outbox. Delivery is performed by the backend worker.
BEGIN;
CREATE TABLE public.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE CHECK (char_length(event_key) BETWEEN 8 AND 200),
  event_type text NOT NULL CHECK (event_type IN ('booking_created','payment_received','booking_cancelled','refund_requested','refund_succeeded')),
  user_id uuid NOT NULL REFERENCES public.users(id),
  booking_id uuid REFERENCES public.bookings(id),
  recipient_email text NOT NULL CHECK (recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notification_outbox_dispatch ON public.notification_outbox(status,next_attempt_at,created_at);
ALTER TABLE public.notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_outbox FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.notification_outbox TO traveling_backend;
CREATE POLICY backend_access ON public.notification_outbox TO traveling_backend USING (true) WITH CHECK (true);
COMMIT;

