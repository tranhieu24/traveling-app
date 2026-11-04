-- AI metadata only: no prompts, tokens, IP addresses or personal booking content.
BEGIN;
CREATE TABLE IF NOT EXISTS public.ai_usage_daily (
  day date NOT NULL,
  scope_key text NOT NULL,
  requests integer NOT NULL DEFAULT 0 CHECK (requests>=0),
  reserved_tokens bigint NOT NULL DEFAULT 0 CHECK (reserved_tokens>=0),
  input_tokens bigint NOT NULL DEFAULT 0 CHECK (input_tokens>=0),
  output_tokens bigint NOT NULL DEFAULT 0 CHECK (output_tokens>=0),
  failures integer NOT NULL DEFAULT 0 CHECK (failures>=0),
  PRIMARY KEY(day,scope_key)
);
ALTER TABLE public.ai_usage_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_usage_daily FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.ai_usage_daily TO traveling_backend;
DROP POLICY IF EXISTS backend_access ON public.ai_usage_daily;
CREATE POLICY backend_access ON public.ai_usage_daily TO traveling_backend USING(true) WITH CHECK(true);
COMMIT;
-- Rollback after AI_ENABLED=false: export counters, then drop public.ai_usage_daily.
