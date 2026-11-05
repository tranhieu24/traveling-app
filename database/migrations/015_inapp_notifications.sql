-- In-app read state is independent of email delivery state.
BEGIN;
ALTER TABLE public.notification_outbox ADD COLUMN IF NOT EXISTS read_at timestamptz;
COMMENT ON COLUMN public.notification_outbox.read_at IS 'When the recipient read the in-app notification; does not indicate email delivery.';
CREATE INDEX IF NOT EXISTS notification_outbox_inbox ON public.notification_outbox(user_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS notification_outbox_unread ON public.notification_outbox(user_id) WHERE read_at IS NULL;
-- Existing backend-only grants and RLS from migration 008 continue to apply.
COMMIT;
