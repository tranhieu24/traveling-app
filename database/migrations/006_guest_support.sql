-- Additive. No seed, no invented arrival instructions, no email delivery.
BEGIN;
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  guest_id uuid NOT NULL REFERENCES public.users(id),
  subject text NOT NULL CHECK (char_length(subject) BETWEEN 3 AND 150),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting_guest','resolved')),
  client_request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(guest_id,client_request_id)
);
CREATE INDEX support_tickets_guest_updated ON public.support_tickets(guest_id,updated_at DESC,id);
CREATE INDEX support_tickets_booking ON public.support_tickets(booking_id);
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id),
  author_id uuid NOT NULL REFERENCES public.users(id),
  author_role text NOT NULL CHECK (author_role IN ('guest','admin')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 3000),
  client_request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(author_id,client_request_id)
);
CREATE INDEX support_messages_thread ON public.support_messages(ticket_id,created_at,id);
-- Keep door codes/contact information out of the public discovery tables.
CREATE TABLE public.booking_arrival_guides (
  booking_id uuid PRIMARY KEY REFERENCES public.bookings(id),
  instructions text NOT NULL CHECK (char_length(instructions) BETWEEN 10 AND 5000),
  contact text NOT NULL DEFAULT '' CHECK (char_length(contact)<=300),
  updated_by uuid NOT NULL REFERENCES public.users(id),
  revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['support_tickets','support_messages','booking_arrival_guides'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
    EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.%I TO traveling_backend',t);
    EXECUTE format('CREATE POLICY backend_access ON public.%I TO traveling_backend USING (true) WITH CHECK (true)',t);
  END LOOP;
END $$;
REVOKE UPDATE ON public.support_messages FROM traveling_backend;
COMMIT;
-- Rollback application/routes first; retain these private tables by default.
-- Export tickets/messages/guides and audit history before any destructive rollback.
