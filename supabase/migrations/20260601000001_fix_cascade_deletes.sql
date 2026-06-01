-- Fix missing CASCADE DELETE on task_feedback foreign keys.
-- Without this, deleting a daily_task or user_goal leaves orphaned feedback rows.

ALTER TABLE public.task_feedback
  DROP CONSTRAINT IF EXISTS task_feedback_task_id_fkey,
  ADD CONSTRAINT task_feedback_task_id_fkey
    FOREIGN KEY (task_id) REFERENCES public.daily_tasks(id) ON DELETE CASCADE;

ALTER TABLE public.task_feedback
  DROP CONSTRAINT IF EXISTS task_feedback_goal_id_fkey,
  ADD CONSTRAINT task_feedback_goal_id_fkey
    FOREIGN KEY (goal_id) REFERENCES public.user_goals(id) ON DELETE CASCADE;

-- Helper function used by E2E tests to assert no orphaned rows exist
CREATE OR REPLACE FUNCTION public.count_orphaned_feedback()
RETURNS BIGINT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)
  FROM public.task_feedback tf
  WHERE NOT EXISTS (SELECT 1 FROM public.daily_tasks dt WHERE dt.id = tf.task_id)
     OR NOT EXISTS (SELECT 1 FROM public.user_goals ug WHERE ug.id = tf.goal_id);
$$;
