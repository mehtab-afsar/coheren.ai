/**
 * Database Helper Functions
 *
 * Functions to sync app state with Supabase database
 */

import { supabase } from './supabase';
import { computeStreak, earnedFreezes } from './streak';
import type { Agent1Output, Agent2ProfileOutput, Agent3Output, StoneAnswer } from '@types-app/agents';
import type { ThresholdAdjustments } from '@core/agents/recalibrator';

// ============================================
// QUERY HELPERS — one error-handling contract per query shape, instead of
// each function reinventing (and sometimes forgetting) its own.
// ============================================

type QueryResult<T> = { data: T | null; error: { code?: string; message: string } | null };

// Takes the query builder result directly (not a thunk) — Supabase builders are
// lazy and don't fire until awaited, and passing the value keeps T inference
// well-behaved (wrapping it in `() => ...` makes T contravariant via
// PromiseLike#then, which TS infers as `never` for the union response type).

/** Mutation / required lookup — logs and throws on failure. */
async function runQuery<T>(label: string, query: PromiseLike<QueryResult<T>>): Promise<T> {
  const { data, error } = await query;
  if (error) {
    console.error(`Error ${label}:`, error);
    throw error;
  }
  return data as T;
}

/** Single-row lookup that may legitimately return no row (PGRST116) — logs other errors but never throws. */
async function runOptionalQuery<T>(label: string, query: PromiseLike<QueryResult<T>>): Promise<T | null> {
  const { data, error } = await query;
  if (error && error.code !== 'PGRST116') {
    console.error(`Error ${label}:`, error);
  }
  return data;
}

/** List query — logs and returns [] on failure so callers can render an empty state instead of crashing. */
async function runListQuery<T>(label: string, query: PromiseLike<QueryResult<T[]>>): Promise<T[]> {
  const { data, error } = await query;
  if (error) {
    console.error(`Error ${label}:`, error);
    return [];
  }
  return data ?? [];
}

// ============================================
// GOAL OPERATIONS
// ============================================

export async function createGoal(
  userId: string,
  title: string,
  description: string,
  goalAnalysis: Agent1Output
) {

  try {
    // Idempotency guard — this app's data model only ever expects one active
    // goal per user (every reader elsewhere does .eq('status','active').maybeSingle()).
    // Without this check, any retry of the sync that calls createGoal a second
    // time for the same user (a client-side timeout racing a slow-but-succeeding
    // insert, two Supabase auth events double-firing the OAuth sync path, etc.)
    // inserts a second active row, which then makes every .maybeSingle() read
    // elsewhere throw and silently strands the user back in onboarding.
    const existing = await runOptionalQuery(
      'checking for existing active goal',
      supabase
        .from('user_goals')
        .select('id, title, status, created_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    if (existing) {
      return existing as { id: string; title: string; status: string; created_at: string };
    }

    // Trim goal_analysis to essential fields only — prevents JSONB payload timeouts
    const trimmedAnalysis = goalAnalysis?.goalAnalysis ? {
      domain: goalAnalysis.goalAnalysis.domain,
      category: goalAnalysis.goalAnalysis.category,
      complexity: goalAnalysis.goalAnalysis.complexity,
      successCriteria: goalAnalysis.goalAnalysis.successCriteria,
      keyMilestones: goalAnalysis.goalAnalysis.keyMilestones,
    } : null;

    const goalData = {
      user_id: userId,
      title,
      description,
      goal_analysis: trimmedAnalysis,
      status: 'active'
    };


    // INSERT and return the row atomically. Previously this was insert + a separate
    // fetch-back, and on a fetch hiccup it fabricated a fake crypto.randomUUID() id —
    // which then became the FK for stones/roadmap/tasks and guaranteed a downstream
    // FK violation + an orphaned goal. .select().single() gets the real id in one
    // round-trip; on failure we throw (callers surface it as a real sync failure).
    const { data: createdGoal, error } = await supabase
      .from('user_goals')
      .insert(goalData)
      .select('id, title, status, created_at')
      .single();

    if (error || !createdGoal) {
      console.error('❌ Error creating goal:', error?.code, error?.message, error?.hint);
      throw error ?? new Error('createGoal: insert returned no row');
    }

    return createdGoal;
  } catch (err) {
    console.error('❌ Exception in createGoal:', err);
    throw err;
  }
}

export async function getActiveGoal(userId: string) {
  return runOptionalQuery('fetching goal',
    supabase
      .from('user_goals')
      .select('*, roadmaps(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() // was .single() — a pre-existing duplicate active goal would throw; take latest
  );
}

// ============================================
// STONE OPERATIONS
// ============================================

export async function saveStones(goalId: string, stoneAnswers: StoneAnswer[]) {
  const stonesToInsert = stoneAnswers.map(stone => ({
    goal_id: goalId,
    question: `Stone: ${stone.stoneId}`, // You may want to store the actual question
    answer: stone.answer as string,
    impact_data: stone.impact,
    priority: 'high' as const
  }));

  return runQuery('saving stones',
    supabase
      .from('goal_stones')
      .insert(stonesToInsert)
      .select()
  );
}

// ============================================
// ROADMAP OPERATIONS
// ============================================

export async function createRoadmap(goalId: string, roadmap: Agent3Output, stoneProfile?: Agent2ProfileOutput) {
  return runQuery<{ id: string; [key: string]: unknown }>('creating roadmap',
    supabase
      .from('roadmaps')
      .insert({
        goal_id: goalId,
        phases: roadmap.roadmap.phases,   // store the phases array directly
        config: {
          pedagogical_principles: 'scaffolding, progressive_overload, spacing_effect',
          checkpoint_interval: 7,
          domain_pedagogy: roadmap.domainPedagogy ?? null,
          total_weeks: roadmap.roadmap.phases?.reduce((acc: number, p: { weeks: number[] }) => acc + (p.weeks?.length ?? 0), 0) ?? null,
          // Full agent outputs for cross-device restore
          agent_roadmap_json: roadmap,
          stone_profile_json: stoneProfile ?? null,
        }
      })
      .select()
      .single()
  );
}

export async function getRoadmapByGoalId(goalId: string) {
  return runOptionalQuery('fetching roadmap',
    supabase
      .from('roadmaps')
      .select('*')
      .eq('goal_id', goalId)
      .single()
  );
}

/**
 * Update stone profile in roadmaps.config JSON column.
 * Non-blocking — call with .catch(() => {}) to avoid surfacing errors in UI.
 */
export async function updateRoadmapStoneProfile(
  roadmapId: string,
  stoneProfile: import('@types-app/agents').Agent2ProfileOutput
): Promise<void> {
  // Supabase JS doesn't support JSONB path updates directly — fetch, merge, and update.
  const current = await runOptionalQuery<{ config: Record<string, unknown> | null }>('fetching roadmap config',
    supabase.from('roadmaps').select('config').eq('id', roadmapId).single()
  );
  if (!current) return;

  const mergedConfig = { ...(current.config ?? {}), stone_profile_json: stoneProfile };
  await runQuery('updating roadmap stone profile',
    supabase.from('roadmaps').update({ config: mergedConfig }).eq('id', roadmapId)
  );
}

// ============================================
// ADAPTIVE THRESHOLD OPERATIONS
// ============================================

/**
 * Load per-user threshold adjustments from roadmaps.config JSONB.
 * Returns DEFAULT_THRESHOLDS if not yet set.
 */
const DEFAULT_THRESHOLDS: ThresholdAdjustments = {
  simplify_completion_rate:   60,
  accelerate_completion_rate: 80,
  accelerate_avg_difficulty:  2.5,
  recover_consecutive_skips:  4,
  recover_health_skips:       3,
};

export async function loadThresholdAdjustments(roadmapId: string): Promise<ThresholdAdjustments> {
  const data = await runOptionalQuery<{ config: Record<string, unknown> | null }>('loading threshold adjustments',
    supabase.from('roadmaps').select('config').eq('id', roadmapId).single()
  );
  const adj = (data?.config as Record<string, unknown> | null)?.threshold_adjustments;
  return (adj as ThresholdAdjustments) ?? DEFAULT_THRESHOLDS;
}

/**
 * Persist updated threshold adjustments into roadmaps.config JSONB.
 * Non-blocking — call with .catch(() => {}).
 */
export async function saveThresholdAdjustments(
  roadmapId: string,
  adj: ThresholdAdjustments,
): Promise<void> {
  const current = await runOptionalQuery<{ config: Record<string, unknown> | null }>('fetching roadmap config',
    supabase.from('roadmaps').select('config').eq('id', roadmapId).single()
  );

  const mergedConfig = { ...(current?.config ?? {}), threshold_adjustments: adj };
  await runQuery('saving threshold adjustments',
    supabase.from('roadmaps').update({ config: mergedConfig }).eq('id', roadmapId)
  );
}

// ============================================
// SPRINT MEMORY OPERATIONS
// ============================================

/**
 * Insert a sprint memory row (embedding computed in sprintMemory.ts before calling this).
 */
export async function saveSprintMemoryRow(
  userId: string,
  goalId: string,
  sprintNumber: number,
  content: string,
  embedding: number[],
  metadata: Record<string, unknown>,
): Promise<void> {
  await runQuery('saving sprint memory',
    supabase.from('sprint_memories').insert({
      user_id:      userId,
      goal_id:      goalId,
      sprint_number: sprintNumber,
      content,
      embedding,
      metadata,
    })
  );
}

// ============================================
// TASK OPERATIONS
// ============================================

export async function saveTasks(roadmapId: string, tasks: Array<Record<string, unknown>>) {
  const tasksToInsert = tasks.map(task => ({
    roadmap_id: roadmapId,
    day_number: task.day || task.dayNumber,
    title: task.title,
    content: {
      description: task.description,
      type: task.type,
      duration: task.duration,
      steps: task.steps || [],
      tips: task.tips || [],
      successCriteria: task.successCriteria,
      scheduledFor: task.scheduledFor,
      segments: task.segments || [],
      resources: task.resources || null,
    },
    is_completed: task.completed || false,
    skipped: task.skipped || false
  }));

  return runQuery('saving tasks',
    supabase
      .from('daily_tasks')
      .insert(tasksToInsert)
      .select()
  );
}

export async function getTasksByRoadmapId(roadmapId: string) {
  return runQuery('fetching tasks',
    supabase
      .from('daily_tasks')
      .select('*')
      .eq('roadmap_id', roadmapId)
      .order('day_number', { ascending: true })
  );
}

export async function updateTaskCompletion(
  taskId: string,
  completed: boolean,
  difficultyRating?: number,
  actualDuration?: number,
  userComment?: string,
  feedbackTags?: string[]
) {
  const updates: Record<string, unknown> = {
    is_completed: completed,
    completed_at: completed ? new Date().toISOString() : null
  };

  if (difficultyRating) updates.difficulty_rating = difficultyRating;
  if (actualDuration) updates.actual_duration = actualDuration;
  if (userComment) updates.user_comment = userComment;
  if (feedbackTags && feedbackTags.length > 0) updates.feedback_tags = feedbackTags;

  return runQuery('updating task',
    supabase
      .from('daily_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()
  );
}

export async function updateTaskSkip(
  taskId: string,
  skipReason: 'time' | 'health' | 'difficulty' | 'external'
) {
  return runQuery('skipping task',
    supabase
      .from('daily_tasks')
      .update({
        skipped: true,
        skip_reason: skipReason
      })
      .eq('id', taskId)
      .select()
      .single()
  );
}

// ============================================
// PROFILE/STREAK OPERATIONS
// ============================================

export async function createProfile(
  userId: string,
  fullName?: string
) {
  return runQuery('creating profile',
    supabase
      .from('profiles')
      .insert({
        id: userId,
        full_name: fullName || null,
        location: null,
        bio: null,
        persona_traits: {}
      })
      .select()
      .single()
  );
}

/** Idempotent: creates the profile row on first sign-in (needed for Google OAuth,
 * which never calls `createProfile`), no-ops on every later sign-in so it can't
 * clobber fields the user has since edited (location/bio/persona_traits). */
export async function upsertProfile(userId: string, fullName?: string | null) {
  return runOptionalQuery('upserting profile',
    supabase
      .from('profiles')
      .upsert(
        { id: userId, full_name: fullName || null },
        { onConflict: 'id', ignoreDuplicates: true }
      )
      .select()
      .maybeSingle()
  );
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  location?: string;
  bio?: string;
  persona_traits?: Record<string, unknown>;
}) {
  return runQuery('updating profile',
    supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()
  );
}

export async function getProfile(userId: string) {
  return runOptionalQuery('fetching profile',
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
  );
}

// Helper to calculate streak from tasks
export async function calculateStreak(roadmapId: string): Promise<number> {
  const { data: tasks, error } = await supabase
    .from('daily_tasks')
    .select('day_number, is_completed, completed_at')
    .eq('roadmap_id', roadmapId)
    .eq('is_completed', true)
    .order('day_number', { ascending: false });

  if (error || !tasks || tasks.length === 0) {
    return 0;
  }

  // Calculate consecutive streak counting backwards from most recent completion.
  // Allow the streak to still be "active" if the most recent completion was yesterday
  // (i.e. today's task hasn't been done yet, but the streak is not broken).
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Collect unique completion dates (by day)
  const completedDays = new Set<number>();
  for (const task of tasks) {
    if (!task.completed_at) continue;
    const d = new Date(task.completed_at);
    d.setHours(0, 0, 0, 0);
    completedDays.add(d.getTime());
  }

  if (completedDays.size === 0) return 0;

  // Streak with an earned freeze tolerance so one missed day doesn't zero a
  // hard-won streak (churn fix). Freezes are earned from completion history.
  const allowance = earnedFreezes(completedDays.size);
  return computeStreak(completedDays, today.getTime(), allowance).streak;
}

// ============================================
// TASK FEEDBACK OPERATIONS
// ============================================

export async function saveTaskFeedback(
  userId: string,
  taskId: string,
  goalId: string,
  feedback: {
    difficultyScore: number;
    actualDurationMins?: number;
    feedbackTags?: string[];
    userComment?: string;
    completionStatus?: 'completed' | 'skipped' | 'modified';
  }
) {
  // Feedback is append-only: every submission (including a user editing their
  // answer on the same task) inserts a new row rather than mutating a prior
  // one, so the recalibrator's training history can't be silently rewritten.
  // getRecentFeedback() dedupes to the latest row per task_id for callers
  // that want current-state semantics.
  const feedbackData = {
    user_id: userId,
    task_id: taskId,
    goal_id: goalId,
    difficulty_score: feedback.difficultyScore,
    actual_duration_mins: feedback.actualDurationMins,
    feedback_tags: feedback.feedbackTags || [],
    user_comment: feedback.userComment,
    completion_status: feedback.completionStatus || 'completed'
  };

  return runQuery('saving task feedback',
    supabase
      .from('task_feedback')
      .insert(feedbackData)
      .select()
      .single()
  );
}

export async function getRecentFeedback(
  goalId: string,
  days: number = 14
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const rows = await runListQuery('fetching recent feedback',
    supabase
      .from('task_feedback')
      .select('*')
      .eq('goal_id', goalId)
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: true })
  );

  // Feedback is append-only (see saveTaskFeedback) — a task can have multiple
  // rows if the user edited their answer. Keep only the latest per task_id.
  const latestByTask = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    latestByTask.set(row.task_id, row);
  }

  return Array.from(latestByTask.values());
}

// ============================================
// CHECKPOINT OPERATIONS
// ============================================

export async function saveCheckpoint(
  roadmapId: string,
  checkpointDay: number,
  analysis: {
    overallMastery: 'struggling' | 'on-track' | 'excelling';
    strugglingAreas: string[];
    masteringAreas: string[];
    paceAdjustment: 'slow-down' | 'maintain' | 'accelerate';
    recommendations: string[];
    nextSprintFocus: string;
    personalizedMessage: string;
  }
) {
  return runQuery('saving checkpoint',
    supabase
      .from('checkpoints')
      .insert({
        roadmap_id: roadmapId,
        checkpoint_day: checkpointDay,
        overall_mastery: analysis.overallMastery,
        struggling_areas: analysis.strugglingAreas,
        mastering_areas: analysis.masteringAreas,
        pace_adjustment: analysis.paceAdjustment,
        recommendations: analysis.recommendations,
        next_sprint_focus: analysis.nextSprintFocus,
        personalized_message: analysis.personalizedMessage
      })
      .select()
      .single()
  );
}

export async function getCheckpoints(roadmapId: string) {
  return runListQuery('fetching checkpoints',
    supabase
      .from('checkpoints')
      .select('*')
      .eq('roadmap_id', roadmapId)
      .order('checkpoint_day', { ascending: true })
  );
}

// ============================================
// DAILY TASK SYNC (rolling curriculum → DB)
// ============================================

/**
 * Syncs locally-generated daily tasks to Supabase.
 * Called after Agent 4 / fallback generates a new day's tasks.
 * Only syncs tasks that don't already have a UUID (i.e. local-only tasks).
 */
export async function syncDailyTasksToDB(
  roadmapId: string,
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    type: string;
    duration: number;
    day: number;
    steps?: string[];
    tips?: string[];
    successCriteria?: string;
    scheduledFor?: string;
    segments?: unknown;
    resources?: unknown;
    completed?: boolean;
    skipped?: boolean;
  }>
) {
  // Only sync tasks that are locally generated (non-UUID ids)
  const isUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const localOnly = tasks.filter(t => !isUUID(t.id));
  if (localOnly.length === 0) return [];

  const rows = localOnly.map(t => ({
    roadmap_id: roadmapId,
    day_number: t.day,
    title: t.title,
    content: {
      description: t.description,
      type: t.type,
      duration: t.duration,
      steps: t.steps || [],
      tips: t.tips || [],
      successCriteria: t.successCriteria,
      scheduledFor: t.scheduledFor,
      segments: t.segments || [],
      resources: t.resources || null,
    },
    is_completed: t.completed || false,
    skipped: t.skipped || false,
  }));

  try {
    const { data, error } = await supabase
      .from('daily_tasks')
      .insert(rows)
      .select('id, day_number');

    if (error) {
      console.error('❌ syncDailyTasksToDB failed:', error.message);
      return [];
    }

    return data; // [{id: uuid, day_number: N}] — caller can update local IDs
  } catch (err) {
    console.error('❌ syncDailyTasksToDB exception:', err);
    return [];
  }
}

// ============================================
// SYNC HELPER
// ============================================

/**
 * Complete sync: Save entire roadmap with all tasks
 */
export async function syncCompleteRoadmap(
  userId: string,
  goalTitle: string,
  goalDescription: string,
  goalAnalysis: Agent1Output,
  stoneAnswers: StoneAnswer[],
  roadmap: Agent3Output,
  tasks: Array<Record<string, unknown>>,
  stoneProfile?: Agent2ProfileOutput
) {
  try {
    // Wrap the entire sync operation in a race with a shorter timeout
    const syncOperation = async () => {
      // 1. Create goal
      const goal = await createGoal(userId, goalTitle, goalDescription, goalAnalysis);

      // 2. Save stones
      await saveStones(goal.id, stoneAnswers);

      // 3. Create roadmap
      const roadmapRecord = await createRoadmap(goal.id, roadmap, stoneProfile);

      // 4. Save tasks
      await saveTasks(roadmapRecord.id, tasks);

      return {
        goal,
        roadmap: roadmapRecord,
        success: true
      };
    };

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database sync timeout')), 8000)
    );

    const result = await Promise.race([syncOperation(), timeoutPromise]);
    return result as { goal: Record<string, unknown>; roadmap: Record<string, unknown>; success: boolean };

  } catch (error) {
    // Do NOT fake success. Callers detect the failure (no goal/roadmap ids) and
    // surface a recoverable "couldn't save your plan" state instead of silently
    // landing the user on a local-only dashboard whose progress never persists.
    console.error('❌ Database sync failed (local-only, not persisted):', error);
    return {
      success: false,
      isLocalOnly: true,
      error
    };
  }
}

// ============================================
// RESET
// ============================================

/**
 * Delete all goal-related data for a user.
 * Deleting user_goals cascades to: goal_stones, roadmaps, daily_tasks,
 * checkpoints, sprint_memories, agent_logs.
 * task_feedback has no cascade so it is deleted explicitly first.
 */
export async function deleteUserData(userId: string): Promise<void> {
  // task_feedback has no FK cascade — delete it first. This is user-initiated
  // erasure of their own data (goal reset), not routine mutation, so it's
  // intentionally exempt from the append-only policy on this table.
  await supabase
    .from('task_feedback')
    .delete()
    .eq('user_id', userId);

  // Deleting user_goals triggers all other cascades
  const { error } = await supabase
    .from('user_goals')
    .delete()
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to clear user data: ${error.message}`);
}
