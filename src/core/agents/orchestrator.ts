/**
 * Agent Orchestrator
 * Coordinates the multi-agent curriculum generation pipeline
 */

import { analyzeGoal } from './goal-analyzer';
import { identifyStones, extractStones } from './stone-identifier';
import { buildCurriculum } from './curriculum-builder';
import { generateTask } from './task-generator';
import { recalibrateCurriculum, convertToFeedback } from './recalibrator';

import type {
  AgentContext,
  Agent1Output,
  Agent2Output,
  Agent2ProfileOutput,
  Agent3Output,
  Agent5Output,
  StoneAnswer,
  DailyTask,
  Roadmap
} from '@types-app/agents';
import type { Task } from '@core/store/useStore';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Run Agents 1 and 2: Analyze goal and identify required stones
 */
export async function runOnboardingAgents(
  goal: string,
  timeline: number = 90,
  dailyTime: number = 30
): Promise<{
  goalAnalysis: Agent1Output;
  stones: Agent2Output;
}> {
  const context: AgentContext = {
    userId: 'temp', // Will be replaced with actual user ID
    goal,
    timeline,
    dailyTimeAvailable: dailyTime
  };

  console.log('🤖 Agent 1: Analyzing goal...');
  const goalAnalysis = await analyzeGoal(context);

  console.log('🧱 Agent 2: Identifying building stones...');
  const stones = await identifyStones(context, goalAnalysis);

  return {
    goalAnalysis,
    stones
  };
}

/**
 * Run Agent 3: Build curriculum after extracting the stone profile
 */
export async function runCurriculumBuilder(
  goal: string,
  timeline: number,
  dailyTime: number,
  goalAnalysis: Agent1Output,
  stoneProfile: Agent2ProfileOutput
): Promise<Agent3Output> {
  const context: AgentContext = {
    userId: 'temp',
    goal,
    timeline,
    dailyTimeAvailable: dailyTime
  };

  console.log('🏛️ Agent 3: Building curriculum...');
  const curriculum = await buildCurriculum(context, goalAnalysis, stoneProfile);

  return curriculum;
}

/**
 * Run Agent 4: Generate daily task
 */
export async function runTaskGenerator(
  dayNumber: number,
  roadmap: Agent3Output,
  stoneProfile: Agent2ProfileOutput,
  dailyTimeAvailable: number,
  previousTasksContext?: string
): Promise<DailyTask> {
  console.log(`📝 Agent 4: Generating task for Day ${dayNumber}...`);
  const task = await generateTask(
    dayNumber,
    roadmap,
    stoneProfile,
    dailyTimeAvailable,
    previousTasksContext
  );

  return task;
}

/**
 * Complete pipeline: From goal input to full roadmap
 */
export async function generateCompleteRoadmap(
  goal: string,
  timeline: number,
  dailyTime: number,
  stoneAnswers: StoneAnswer[],
  category?: string, // For resource matching
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' // For resource matching
): Promise<{
  goalAnalysis: Agent1Output;
  roadmap: Agent3Output;
  firstTask: DailyTask;
}> {
  console.log('🚀 Starting complete roadmap generation...');

  // Step 1 & 2: Analyze goal (already done in onboarding)
  const context: AgentContext = {
    userId: 'temp',
    goal,
    timeline,
    dailyTimeAvailable: dailyTime
  };

  const goalAnalysis = await analyzeGoal(context);

  // Extract stone profile from answers
  console.log('🧱 Extracting stone profile from answers...');
  const stoneProfile = await extractStones(context, goalAnalysis, stoneAnswers);

  // Step 3: Build curriculum with stone profile
  const roadmap = await buildCurriculum(context, goalAnalysis, stoneProfile);

  // Step 4: Generate first day's task (with resources!)
  const firstTask = await generateTask(
    1,
    roadmap,
    stoneProfile,
    dailyTime,
    undefined,          // previousTasksContext
    category,           // Pass category for resource matching
    skillLevel || 'beginner'
  );

  console.log('✅ Roadmap generation complete!');

  return {
    goalAnalysis,
    roadmap,
    firstTask
  };
}

/**
 * Generate a batch of tasks (useful for pre-generating first week)
 */
export async function generateTaskBatch(
  startDay: number,
  endDay: number,
  roadmap: Agent3Output,
  stoneProfile: Agent2ProfileOutput,
  dailyTimeAvailable: number
): Promise<DailyTask[]> {
  console.log(`📋 Generating tasks for days ${startDay} to ${endDay}...`);

  const tasks: DailyTask[] = [];

  for (let day = startDay; day <= endDay; day++) {
    const task = await generateTask(
      day,
      roadmap,
      stoneProfile,
      dailyTimeAvailable
    );
    tasks.push(task);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`✅ Generated ${tasks.length} tasks`);
  return tasks;
}

/**
 * Run Agent 5: Checkpoint analysis and curriculum recalibration
 * Triggered every 14 days to adjust the curriculum based on performance
 */
export async function runCheckpointRecalibration(
  goal: string,
  timeline: number,
  dailyTime: number,
  roadmap: Roadmap,
  stoneProfile: Agent2ProfileOutput,
  completedTasks: Task[], // Tasks from store
  currentDay: number
): Promise<Agent5Output> {
  console.log(`🔄 Agent 5: Running checkpoint analysis for Day ${currentDay}...`);

  const context: AgentContext = {
    userId: 'temp',
    goal,
    timeline,
    dailyTimeAvailable: dailyTime
  };

  // Convert store tasks to feedback format
  const taskFeedback = convertToFeedback(completedTasks);

  const recalibration = await recalibrateCurriculum({
    context,
    roadmap,
    stoneProfile,
    completedTasks: taskFeedback,
    currentDay
  });

  console.log('✅ Checkpoint analysis complete!');
  console.log(`   Mastery Level: ${recalibration.checkpointAnalysis.overallMastery}`);
  console.log(`   Pace Adjustment: ${recalibration.checkpointAnalysis.paceAdjustment}`);

  return recalibration;
}

/**
 * Generate next sprint tasks based on recalibration
 * Creates 14 days of adapted tasks
 */
export async function generateAdaptedSprint(
  recalibration: Agent5Output,
  roadmap: Agent3Output,
  stoneProfile: Agent2ProfileOutput,
  dailyTimeAvailable: number
): Promise<DailyTask[]> {
  const { startDay, endDay } = recalibration.recalibratedSprint;

  console.log(`📋 Generating adapted sprint (Days ${startDay}-${endDay})...`);
  console.log(`   Focus: ${recalibration.checkpointAnalysis.nextSprintFocus}`);

  const tasks: DailyTask[] = [];

  // Build context string about modifications
  const modificationsContext = `
CHECKPOINT ANALYSIS:
- Overall Mastery: ${recalibration.checkpointAnalysis.overallMastery}
- Pace: ${recalibration.checkpointAnalysis.paceAdjustment}
- Struggling Areas: ${recalibration.checkpointAnalysis.strugglingAreas.join(', ')}
- Mastering Areas: ${recalibration.checkpointAnalysis.masteringAreas.join(', ')}
- Next Sprint Focus: ${recalibration.checkpointAnalysis.nextSprintFocus}

MODIFICATIONS TO APPLY:
${recalibration.recalibratedSprint.modifiedTasks.map(mod =>
  `Day ${mod.dayNumber}: ${mod.modification} - ${mod.reason}`
).join('\n')}

PEDAGOGICAL CHANGES:
- Rest Days Added: ${recalibration.recalibratedSprint.pedagogicalChanges.restDaysAdded.join(', ') || 'None'}
- Review Days Added: ${recalibration.recalibratedSprint.pedagogicalChanges.reviewDaysAdded.join(', ') || 'None'}
- Difficulty Reduced: ${recalibration.recalibratedSprint.pedagogicalChanges.difficultyReduction}
- Intensity Increased: ${recalibration.recalibratedSprint.pedagogicalChanges.intensityIncrease}

Generate tasks that reflect these adjustments.
`;

  for (let day = startDay; day <= endDay; day++) {
    // Check if this is a rest/review day
    const isRestDay = recalibration.recalibratedSprint.pedagogicalChanges.restDaysAdded.includes(day);
    const isReviewDay = recalibration.recalibratedSprint.pedagogicalChanges.reviewDaysAdded.includes(day);

    if (isRestDay || isReviewDay) {
      const lightTask = await generateTask(
        day,
        roadmap,
        stoneProfile,
        Math.floor(dailyTimeAvailable * 0.5),
        modificationsContext + `\nThis is a ${isRestDay ? 'REST' : 'REVIEW'} day - keep it light and restorative.`
      );
      tasks.push(lightTask);
    } else {
      const task = await generateTask(
        day,
        roadmap,
        stoneProfile,
        dailyTimeAvailable,
        modificationsContext
      );
      tasks.push(task);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`✅ Generated ${tasks.length} adapted tasks for sprint ${recalibration.recalibratedSprint.sprintNumber}`);
  return tasks;
}

/**
 * Complete checkpoint workflow:
 * 1. Analyze performance
 * 2. Delete future tasks (CRITICAL to avoid duplicates)
 * 3. Generate adapted sprint tasks
 * 4. Save to Supabase
 */
export async function handleCheckpoint(
  goal: string,
  timeline: number,
  dailyTime: number,
  roadmap: Roadmap,
  stoneProfile: Agent2ProfileOutput,
  completedTasks: Task[],
  currentDay: number,
  options?: {
    userId?: string;
    goalId?: string;
    supabase?: SupabaseClient;
  }
): Promise<{
  analysis: Agent5Output;
  adaptedTasks: DailyTask[];
}> {
  console.log('🎯 Starting checkpoint workflow...');

  // Step 1: Run checkpoint analysis
  const analysis = await runCheckpointRecalibration(
    goal,
    timeline,
    dailyTime,
    roadmap,
    stoneProfile,
    completedTasks,
    currentDay
  );

  // Step 2: CRITICAL - Delete future tasks to avoid duplicates
  if (options?.supabase && options?.goalId) {
    console.log(`🗑️ Deleting future tasks (Day ${currentDay + 1} onwards)...`);
    try {
      const { error } = await options.supabase
        .from('daily_tasks')
        .delete()
        .gt('day_number', currentDay)
        .eq('goal_id', options.goalId);

      if (error) {
        console.error('Failed to delete future tasks:', error);
      } else {
        console.log('✅ Future tasks cleared');
      }
    } catch (error) {
      console.error('Error deleting future tasks:', error);
    }
  }

  // Step 3: Generate adapted sprint tasks
  const roadmapOutput: Agent3Output = { roadmap, domainPedagogy: '', stoneModificationSummary: '' };
  const adaptedTasks = await generateAdaptedSprint(
    analysis,
    roadmapOutput,
    stoneProfile,
    dailyTime
  );

  // Step 4: Save checkpoint result to Supabase (optional)
  if (options?.supabase && options?.userId) {
    try {
      await options.supabase.from('checkpoints').insert({
        user_id: options.userId,
        goal_id: options.goalId,
        checkpoint_day: currentDay,
        overall_mastery: analysis.checkpointAnalysis.overallMastery,
        struggling_areas: analysis.checkpointAnalysis.strugglingAreas,
        mastering_areas: analysis.checkpointAnalysis.masteringAreas,
        pace_adjustment: analysis.checkpointAnalysis.paceAdjustment,
        recommendations: analysis.checkpointAnalysis.recommendations,
        next_sprint_focus: analysis.checkpointAnalysis.nextSprintFocus,
        personalized_message: analysis.recalibratedSprint.personalizedMessage
      });
      console.log('✅ Checkpoint saved to Supabase');
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
    }
  }

  console.log('✅ Checkpoint workflow complete!');

  return {
    analysis,
    adaptedTasks
  };
}
