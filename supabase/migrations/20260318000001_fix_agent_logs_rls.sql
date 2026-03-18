-- Fix agent_logs INSERT RLS: original policy failed when user_id is null
-- (auth.uid() = null evaluates to null in SQL, not true — so all inserts
--  with a null user_id were blocked with 403 even for authenticated users).
--
-- New policy: any authenticated session may insert a log row.
-- user_id can be null for pre-goal agent runs (e.g. during onboarding setup).

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON agent_logs;

CREATE POLICY "Allow insert for authenticated users"
  ON agent_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
