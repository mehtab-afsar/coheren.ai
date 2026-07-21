-- Per-user rate limiting for the ai-proxy edge function.
-- Fixed-window (per minute) counter. The gateway calls check_and_increment_rate_limit
-- with a service-role client on every proxied LLM/embedding request.

CREATE TABLE IF NOT EXISTS public.ai_rate_limit (
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  window_start timestamptz NOT NULL,
  count        integer     NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, window_start)
);

-- RLS: no direct client access. Only the service-role gateway (which bypasses RLS)
-- and the SECURITY DEFINER function below touch this table.
ALTER TABLE public.ai_rate_limit ENABLE ROW LEVEL SECURITY;

/**
 * Atomically increment the caller's counter for the current minute window and
 * return whether they are still within `p_limit`. SECURITY DEFINER so it runs
 * with the owner's rights regardless of the calling role.
 */
CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_user  uuid,
  p_limit integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window timestamptz := date_trunc('minute', now());
BEGIN
  INSERT INTO public.ai_rate_limit (user_id, window_start, count)
  VALUES (p_user, v_window, 1)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET count = public.ai_rate_limit.count + 1
  RETURNING count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

-- Only the service role may execute the limiter (the gateway uses it).
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(uuid, integer) TO service_role;

-- Optional periodic cleanup of stale windows (safe to run anytime).
CREATE INDEX IF NOT EXISTS idx_ai_rate_limit_window ON public.ai_rate_limit (window_start);
