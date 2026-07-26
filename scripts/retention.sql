-- ============================================================================
-- COHEREN — RETENTION + ACTIVATION QUERIES (validation test)
--
-- Run these in the Supabase SQL editor against the PROD project during the
-- 2-week concierge test. They need NO app changes — they read data that already
-- exists (auth.users.created_at as the signup anchor, daily_tasks.completed_at
-- as the "did a task" signal).
--
-- Definitions:
--   signup day (D0)   = date(auth.users.created_at)   -- true account creation
--   active-return DN  = the user completed >=1 task on the calendar day D0 + N
--   "completed a task" = daily_tasks.is_completed = true  (completed_at stamps the day)
--
-- Join path: daily_tasks -> roadmaps -> user_goals(user_id) -> auth.users
-- Timezone: adjust `AT TIME ZONE` if you want cohorts in a specific zone;
-- default here is UTC date boundaries.
-- ============================================================================


-- ── 0. Cohort size sanity check ─────────────────────────────────────────────
-- How many real accounts exist, and how many ever completed a single task.
SELECT
  count(*)                                             AS total_signups,
  count(*) FILTER (WHERE first_task_at IS NOT NULL)    AS ever_did_a_task
FROM (
  SELECT
    u.id,
    min(dt.completed_at) AS first_task_at
  FROM auth.users u
  LEFT JOIN public.user_goals g  ON g.user_id = u.id
  LEFT JOIN public.roadmaps r    ON r.goal_id = g.id
  LEFT JOIN public.daily_tasks dt
         ON dt.roadmap_id = r.id AND dt.is_completed = true
  GROUP BY u.id
) s;


-- ── 1. THE NUMBER: active-return D1/D2/D3/D4/D7 ─────────────────────────────
-- For each user, did they complete >=1 task on the calendar day that is N days
-- after signup? Reported as a % of all signups. This is the core validation metric.
WITH signups AS (
  SELECT id AS user_id, (created_at AT TIME ZONE 'UTC')::date AS d0
  FROM auth.users
),
completions AS (
  SELECT DISTINCT
    g.user_id,
    (dt.completed_at AT TIME ZONE 'UTC')::date AS done_date
  FROM public.daily_tasks dt
  JOIN public.roadmaps r  ON r.id = dt.roadmap_id
  JOIN public.user_goals g ON g.id = r.goal_id
  WHERE dt.is_completed = true AND dt.completed_at IS NOT NULL
),
per_user AS (
  SELECT
    s.user_id,
    bool_or(c.done_date = s.d0 + 1) AS d1,
    bool_or(c.done_date = s.d0 + 2) AS d2,
    bool_or(c.done_date = s.d0 + 3) AS d3,
    bool_or(c.done_date = s.d0 + 4) AS d4,
    bool_or(c.done_date = s.d0 + 7) AS d7
  FROM signups s
  LEFT JOIN completions c ON c.user_id = s.user_id
  GROUP BY s.user_id
)
SELECT
  count(*)                                                        AS cohort,
  round(100.0 * count(*) FILTER (WHERE d1) / nullif(count(*),0), 1) AS "D1_%",
  round(100.0 * count(*) FILTER (WHERE d2) / nullif(count(*),0), 1) AS "D2_%",
  round(100.0 * count(*) FILTER (WHERE d3) / nullif(count(*),0), 1) AS "D3_%",
  round(100.0 * count(*) FILTER (WHERE d4) / nullif(count(*),0), 1) AS "D4_%",
  round(100.0 * count(*) FILTER (WHERE d7) / nullif(count(*),0), 1) AS "D7_%"
FROM per_user;


-- ── 2. ACTIVATION GATE (read this BEFORE trusting retention) ─────────────────
-- If people never complete task 1, retention is noise. % of signups that ever
-- completed task #1, #2, #4, #7 (by curriculum day_number).
WITH signups AS (SELECT id AS user_id FROM auth.users),
done AS (
  SELECT g.user_id, dt.day_number
  FROM public.daily_tasks dt
  JOIN public.roadmaps r  ON r.id = dt.roadmap_id
  JOIN public.user_goals g ON g.id = r.goal_id
  WHERE dt.is_completed = true
),
per_user AS (
  SELECT
    s.user_id,
    bool_or(d.day_number = 1) AS t1,
    bool_or(d.day_number = 2) AS t2,
    bool_or(d.day_number = 4) AS t4,
    bool_or(d.day_number = 7) AS t7
  FROM signups s
  LEFT JOIN done d ON d.user_id = s.user_id
  GROUP BY s.user_id
)
SELECT
  count(*)                                                          AS cohort,
  round(100.0 * count(*) FILTER (WHERE t1) / nullif(count(*),0), 1) AS "task1_%",
  round(100.0 * count(*) FILTER (WHERE t2) / nullif(count(*),0), 1) AS "task2_%",
  round(100.0 * count(*) FILTER (WHERE t4) / nullif(count(*),0), 1) AS "task4_%",
  round(100.0 * count(*) FILTER (WHERE t7) / nullif(count(*),0), 1) AS "task7_%"
FROM per_user;


-- ── 3. Per-user timeline (eyeball individual behaviour on ~40 testers) ───────
-- One row per user: signup date, tasks completed, days active, last activity.
SELECT
  u.email,
  (u.created_at AT TIME ZONE 'UTC')::date                       AS signup_day,
  count(dt.id) FILTER (WHERE dt.is_completed)                   AS tasks_done,
  count(DISTINCT (dt.completed_at AT TIME ZONE 'UTC')::date)
    FILTER (WHERE dt.is_completed)                              AS active_days,
  max(dt.completed_at)                                          AS last_task_at
FROM auth.users u
LEFT JOIN public.user_goals g ON g.user_id = u.id
LEFT JOIN public.roadmaps r   ON r.goal_id = g.id
LEFT JOIN public.daily_tasks dt ON dt.roadmap_id = r.id
GROUP BY u.id, u.email, u.created_at
ORDER BY u.created_at DESC;


-- ── 4. Churned-after-day-1 list (feeds the Step 4 interview calls) ──────────
-- Users who did task 1 but nothing on/after D0+2 — the people to DM for a call.
WITH signups AS (
  SELECT id AS user_id, email, (created_at AT TIME ZONE 'UTC')::date AS d0
  FROM auth.users
),
completions AS (
  SELECT DISTINCT g.user_id, (dt.completed_at AT TIME ZONE 'UTC')::date AS done_date
  FROM public.daily_tasks dt
  JOIN public.roadmaps r  ON r.id = dt.roadmap_id
  JOIN public.user_goals g ON g.id = r.goal_id
  WHERE dt.is_completed = true
)
SELECT s.email, s.d0 AS signup_day
FROM signups s
WHERE EXISTS (SELECT 1 FROM completions c WHERE c.user_id = s.user_id AND c.done_date <= s.d0 + 1)
  AND NOT EXISTS (SELECT 1 FROM completions c WHERE c.user_id = s.user_id AND c.done_date >= s.d0 + 2)
  AND s.d0 <= (now() AT TIME ZONE 'UTC')::date - 2   -- old enough that D2 has passed
ORDER BY s.d0 DESC;
