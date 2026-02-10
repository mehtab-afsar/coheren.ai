/**
 * Database Helper Functions
 *
 * Functions to sync app state with Supabase database
 */

import { supabase } from './supabase';
import type { Agent1Output, Agent3Output, StoneAnswer } from '../types/agents';

// ============================================
// GOAL OPERATIONS
// ============================================

export async function createGoal(
  userId: string,
  title: string,
  description: string,
  goalAnalysis: Agent1Output
) {
  console.log('🔍 createGoal called with:', { userId, title });

  try {
    // Trim goal_analysis to essential fields only — prevents JSONB payload timeouts
    const trimmedAnalysis = goalAnalysis?.goalAnalysis ? {
      goalType: goalAnalysis.goalAnalysis.goalType,
      domain: goalAnalysis.goalAnalysis.domain,
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

    console.log('📤 Inserting goal (payload size ~', JSON.stringify(goalData).length, 'bytes)');

    // INSERT without .select() to avoid RLS SELECT round-trip causing timeout
    const { error } = await supabase
      .from('user_goals')
      .insert(goalData);

    if (error) {
      console.error('❌ Error creating goal:', error.code, error.message, error.hint);
      throw error;
    }

    // Fetch the created row separately (faster than .select() on insert)
    const { data: createdGoal, error: fetchError } = await supabase
      .from('user_goals')
      .select('id, title, status, created_at')
      .eq('user_id', userId)
      .eq('title', title)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      console.warn('⚠️ Goal inserted but could not fetch it back:', fetchError.message);
      // Return a minimal placeholder so the flow can continue
      return { id: crypto.randomUUID(), title, status: 'active' };
    }

    console.log('✅ Goal created successfully:', createdGoal.id);
    return createdGoal;
  } catch (err) {
    console.error('❌ Exception in createGoal:', err);
    throw err;
  }
}

export async function getActiveGoal(userId: string) {
  const { data, error } = await supabase
    .from('user_goals')
    .select('*, roadmaps(*)')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    console.error('Error fetching goal:', error);
  }

  return data;
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

  const { data, error } = await supabase
    .from('goal_stones')
    .insert(stonesToInsert)
    .select();

  if (error) {
    console.error('Error saving stones:', error);
    throw error;
  }

  return data;
}

// ============================================
// ROADMAP OPERATIONS
// ============================================

export async function createRoadmap(goalId: string, roadmap: Agent3Output) {
  const { data, error } = await supabase
    .from('roadmaps')
    .insert({
      goal_id: goalId,
      phases: roadmap.roadmap,
      config: {
        pedagogical_principles: 'scaffolding, progressive_overload, spacing_effect',
        checkpoint_interval: 14
      }
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating roadmap:', error);
    throw error;
  }

  return data;
}

export async function getRoadmapByGoalId(goalId: string) {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*')
    .eq('goal_id', goalId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching roadmap:', error);
  }

  return data;
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
      scheduledFor: task.scheduledFor
    },
    is_completed: task.completed || false,
    skipped: task.skipped || false
  }));

  const { data, error } = await supabase
    .from('daily_tasks')
    .insert(tasksToInsert)
    .select();

  if (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }

  return data;
}

export async function getTasksByRoadmapId(roadmapId: string) {
  const { data, error } = await supabase
    .from('daily_tasks')
    .select('*')
    .eq('roadmap_id', roadmapId)
    .order('day_number', { ascending: true });

  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }

  return data;
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

  const { data, error } = await supabase
    .from('daily_tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }

  return data;
}

export async function updateTaskSkip(
  taskId: string,
  skipReason: 'time' | 'health' | 'difficulty' | 'external'
) {
  const { data, error } = await supabase
    .from('daily_tasks')
    .update({
      skipped: true,
      skip_reason: skipReason
    })
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error skipping task:', error);
    throw error;
  }

  return data;
}

// ============================================
// PROFILE/STREAK OPERATIONS
// ============================================

export async function createProfile(
  userId: string,
  fullName?: string
) {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      full_name: fullName || null,
      location: null,
      bio: null,
      persona_traits: {}
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating profile:', error);
    throw error;
  }

  return data;
}

export async function updateProfile(userId: string, updates: {
  full_name?: string;
  location?: string;
  bio?: string;
  persona_traits?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }

  return data;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
  }

  return data;
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

  // Find the most recent completed day
  const mostRecent = Math.max(...completedDays);
  const mostRecentDaysAgo = Math.floor((today.getTime() - mostRecent) / 86400000);

  // If the most recent completion is older than yesterday, streak is broken
  if (mostRecentDaysAgo > 1) return 0;

  // Count consecutive days backwards from most recent
  let streak = 0;
  let checkDay = mostRecent;
  while (completedDays.has(checkDay)) {
    streak++;
    checkDay -= 86400000; // go back one day
  }

  return streak;
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
  // Check if feedback already exists for this task (upsert logic)
  const { data: existing } = await supabase
    .from('task_feedback')
    .select('id')
    .eq('task_id', taskId)
    .eq('user_id', userId)
    .single();

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

  let data, error;

  if (existing) {
    // Update existing feedback
    const result = await supabase
      .from('task_feedback')
      .update(feedbackData)
      .eq('id', existing.id)
      .select()
      .single();
    data = result.data;
    error = result.error;
  } else {
    // Insert new feedback
    const result = await supabase
      .from('task_feedback')
      .insert(feedbackData)
      .select()
      .single();
    data = result.data;
    error = result.error;
  }

  if (error) {
    console.error('Error saving task feedback:', error);
    throw error;
  }

  return data;
}

export async function getRecentFeedback(
  goalId: string,
  days: number = 14
) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { data, error } = await supabase
    .from('task_feedback')
    .select('*')
    .eq('goal_id', goalId)
    .gte('created_at', cutoffDate.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching recent feedback:', error);
    return [];
  }

  return data || [];
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
  const { data, error } = await supabase
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
    .single();

  if (error) {
    console.error('Error saving checkpoint:', error);
    throw error;
  }

  return data;
}

export async function getCheckpoints(roadmapId: string) {
  const { data, error } = await supabase
    .from('checkpoints')
    .select('*')
    .eq('roadmap_id', roadmapId)
    .order('checkpoint_day', { ascending: true });

  if (error) {
    console.error('Error fetching checkpoints:', error);
    return [];
  }

  return data || [];
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
  tasks: Array<Record<string, unknown>>
) {
  try {
    // Wrap the entire sync operation in a race with a shorter timeout
    const syncOperation = async () => {
      console.log('📝 Step 1/4: Creating goal...');
      // 1. Create goal
      const goal = await createGoal(userId, goalTitle, goalDescription, goalAnalysis);
      console.log('✅ Step 1/4: Goal created:', goal.id);

      console.log('📝 Step 2/4: Saving stones...');
      // 2. Save stones
      await saveStones(goal.id, stoneAnswers);
      console.log('✅ Step 2/4: Stones saved');

      console.log('📝 Step 3/4: Creating roadmap...');
      // 3. Create roadmap
      const roadmapRecord = await createRoadmap(goal.id, roadmap);
      console.log('✅ Step 3/4: Roadmap created:', roadmapRecord.id);

      console.log('📝 Step 4/4: Saving tasks...');
      console.log('   Tasks to save:', tasks.length);
      // 4. Save tasks
      await saveTasks(roadmapRecord.id, tasks);
      console.log('✅ Step 4/4: Tasks saved');

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
    console.warn('⚠️ Database sync timed out or failed, but proceeding with local state:', error);
    // Return success: true with isLocalOnly flag so the UI doesn't hang
    return {
      success: true,
      isLocalOnly: true,
      error
    };
  }
}
