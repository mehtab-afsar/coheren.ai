-- Account deletion (GDPR) was failing: profiles, user_goals, and task_feedback
-- reference auth.users with NO ACTION, so deleting a user raised a FK violation.
-- Add ON DELETE CASCADE so removing an auth user cleanly removes their data.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey,
  ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_goals
  DROP CONSTRAINT IF EXISTS user_goals_user_id_fkey,
  ADD CONSTRAINT user_goals_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.task_feedback
  DROP CONSTRAINT IF EXISTS task_feedback_user_id_fkey,
  ADD CONSTRAINT task_feedback_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
