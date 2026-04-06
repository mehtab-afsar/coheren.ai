/**
 * Agent Orchestrator
 * Coordinates the multi-agent curriculum generation pipeline
 */

import { analyzeGoal, buildClarifications } from './goal-analyzer';
import { identifyStones, extractStones, extractPreliminary, crossValidateStones } from './stone-identifier';
import { buildCurriculum, buildCurriculumPreview, resolvePaceCalibration, buildLegacyAgent3Output } from './curriculum-builder';
import { generateTask } from './task-generator';
import { recalibrateCurriculum, convertToFeedback } from './recalibrator';
import { withAgentLogging } from '@lib/agent-logger';
import {
  generatePipelineId,
  saveAgentCheckpoint,
  loadAgentCheckpoint,
  clearPipelineCheckpoints,
} from '@lib/checkpointHelpers';
import { retrieveKnowledgeWithFallback } from '@core/rag';
import { flags } from '@config/feature-flags';

import type {
  AgentContext,
  Agent1Output,
  Agent2Output,
  Agent2ProfileOutput,
  Agent3Output,
  Agent5Output,
  StoneAnswer,
  DailyTask,
  Roadmap,
  GoalClarificationOutput,
  StoneRound2Output,
  CrossValidationResult,
  CurriculumPreview,
  PaceCalibration,
  PaceChoice,
} from '@types-app/agents';
import type { AgentRoadmapV2 } from '@core/store/useStore';
// Minimal interface to avoid circular import with @core/store/useStore
interface Task {
  day?: number;
  dayNumber?: number;
  title: string;
  type?: string;
  difficultyRating?: number;
  actualDuration?: number;
  duration: number;
  userComment?: string;
  skipped: boolean;
  skipReason?: 'time' | 'health' | 'difficulty' | 'external';
  assessmentResults?: Array<{
    questionId: string;
    userAnswer: string | number;
    selfScore?: number;
    correct?: boolean;
    confidence: string;
  }>;
}
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Run Agents 1 and 2: Analyze goal and identify required stones.
 * NOTE: Agent 2 (stone-identifier) requires Agent 1's output — they are inherently sequential.
 * Parallelization opportunity lives in generateTaskBatch (see below).
 */
export async function runOnboardingAgents(
  goal: string,
  timeline: number = 90,
  dailyTime: number = 30,
  behavioralFlags: string[] = [],
  chatContext?: {
    skillLevel?: 'beginner' | 'intermediate' | 'advanced';
    energyPattern?: string;
    name?: string;
    category?: string;
    practiceEnvironment?: string;
  }
): Promise<{
  goalAnalysis: Agent1Output;
  stones: Agent2Output;
}> {
  const context: AgentContext = {
    userId: 'temp',
    goal,
    timeline,
    dailyTimeAvailable: dailyTime,
    behavioralFlags,
    ...chatContext,
  };

  const goalAnalysis = await withAgentLogging(
    { agentName: 'agent1_goal_analyzer', runType: 'onboarding', input: { goal, timeline, dailyTime }, metadata: { behavioralFlags } },
    () => analyzeGoal(context)
  );

  const stones = await withAgentLogging(
    { agentName: 'agent2_stone_identifier', runType: 'onboarding', input: { goal }, metadata: { category: chatContext?.category } },
    () => identifyStones(context, goalAnalysis)
  );

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
): Promise<AgentRoadmapV2> {
  const context: AgentContext = {
    userId: 'temp',
    goal,
    timeline,
    dailyTimeAvailable: dailyTime
  };

  const curriculum = await withAgentLogging(
    { agentName: 'agent3_curriculum_builder', runType: 'onboarding', input: { goal, timeline, dailyTime } },
    () => buildCurriculum(context, goalAnalysis, stoneProfile)
  );

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
  previousTasksContext?: string,
  goalText?: string,
  category?: string,
  skillLevel?: 'beginner' | 'intermediate' | 'advanced',
  variantHint?: string,
  weekContentSummary?: string,
): Promise<DailyTask> {
  const task = await withAgentLogging(
    { agentName: 'agent4_task_generator', runType: 'daily_task', input: { dayNumber }, metadata: { category, skillLevel } },
    () => generateTask(
      dayNumber,
      roadmap,
      stoneProfile,
      dailyTimeAvailable,
      previousTasksContext,
      category,
      skillLevel ?? 'beginner',
      undefined, // ragContext
      goalText,
      variantHint,
      weekContentSummary,
    )
  );

  return task;
}

/**
 * Pre-fetch RAG context for Agent 4 while Agent 3 is running (5.3).
 * Thin wrapper around retrieveKnowledgeWithFallback — returns null on any error.
 */
async function prefetchRagContext(
  domain: string,
  stoneProfile: Agent2ProfileOutput,
  goal: string
): Promise<string | null> {
  try {
    const result = await retrieveKnowledgeWithFallback(
      { goal, category: domain, currentStruggle: stoneProfile.stoneProfile.primaryStone },
      'new-goal'
    );
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Complete pipeline: From goal input to full roadmap.
 *
 * Accepts an optional `pipelineId` so callers can retry with the same ID and
 * resume from the last successful agent checkpoint (gated behind PIPELINE_CHECKPOINTS flag).
 * Returns the `pipelineId` so the caller can persist it for retry scenarios.
 */
export async function generateCompleteRoadmap(
  goal: string,
  timeline: number,
  dailyTime: number,
  stoneAnswers: StoneAnswer[],
  category?: string,
  skillLevel?: 'beginner' | 'intermediate' | 'advanced',
  behavioralFlags: string[] = [],
  preComputedStoneProfile?: Agent2ProfileOutput,
  pipelineId?: string,
  /** Optional: sprint memory chunks for returning users (Change 5). */
  sprintMemoryContext?: string,
  practiceEnvironment?: string,
): Promise<{
  goalAnalysis: Agent1Output;
  roadmap: AgentRoadmapV2;
  firstTask: DailyTask;
  stoneProfile: Agent2ProfileOutput;
  pipelineId: string;
}> {
  const pid = pipelineId ?? generatePipelineId();

  const context: AgentContext = {
    userId: 'temp',
    goal,
    timeline,
    dailyTimeAvailable: dailyTime,
    behavioralFlags,
    practiceEnvironment,
  };

  // ── Agents 1 + 2 (with checkpoint resume) ──
  let goalAnalysis: Agent1Output;
  let stoneProfile: Agent2ProfileOutput;

  const cachedGoalAnalysis = loadAgentCheckpoint<Agent1Output>(pid, 'goal_analysis');
  const cachedStoneProfile = loadAgentCheckpoint<Agent2ProfileOutput>(pid, 'stone_profile');

  if (cachedGoalAnalysis && cachedStoneProfile) {
    goalAnalysis = cachedGoalAnalysis;
    stoneProfile = cachedStoneProfile;
  } else {
    goalAnalysis = await analyzeGoal(context);
    saveAgentCheckpoint(pid, 'goal_analysis', goalAnalysis);

    stoneProfile = preComputedStoneProfile ?? await extractStones(context, goalAnalysis, stoneAnswers);
    saveAgentCheckpoint(pid, 'stone_profile', stoneProfile);
  }

  // ── Agent 3 + RAG pre-fetch (parallel wave 2 when flag enabled) ──
  let roadmapV2: AgentRoadmapV2;
  const cachedCurriculum = loadAgentCheckpoint<AgentRoadmapV2>(pid, 'curriculum');

  // Start RAG pre-fetch early so it runs alongside Agent 3 (or Agent 3 skip)
  const prefetchedRag: Promise<string | null> = flags.PARALLEL_AGENT_EXECUTION
    ? prefetchRagContext(goalAnalysis.goalAnalysis.domain, stoneProfile, goal).catch(() => null)
    : Promise.resolve(null);

  if (cachedCurriculum) {
    roadmapV2 = cachedCurriculum;
  } else if (flags.PARALLEL_AGENT_EXECUTION) {
    // Wave 2: RAG pre-fetch runs in parallel with Agent 3 (prefetchedRag already in-flight above)
    const priorLearningBlock = flags.USE_SPRINT_MEMORY_IN_ALL_AGENTS && sprintMemoryContext
      ? `## Prior Learning History\n${sprintMemoryContext}\n\n`
      : '';
    roadmapV2 = await buildCurriculum(context, goalAnalysis, stoneProfile, priorLearningBlock || undefined);
    saveAgentCheckpoint(pid, 'curriculum', roadmapV2);
  } else {
    // Inject sprint memory as ragContext prefix when returning user has history
    const priorLearningBlock = flags.USE_SPRINT_MEMORY_IN_ALL_AGENTS && sprintMemoryContext
      ? `## Prior Learning History\n${sprintMemoryContext}\n\n`
      : '';
    roadmapV2 = await buildCurriculum(context, goalAnalysis, stoneProfile, priorLearningBlock || undefined);
    saveAgentCheckpoint(pid, 'curriculum', roadmapV2);
  }

  // ── Agent 4 — Day 1 task (with checkpoint resume + optional pre-fetched RAG) ──
  const legacyRoadmap = buildLegacyAgent3Output(roadmapV2);
  let firstTask: DailyTask;
  const cachedTasks = loadAgentCheckpoint<DailyTask>(pid, 'tasks');

  if (cachedTasks) {
    firstTask = cachedTasks;
  } else {
    // Pre-fetched RAG context (already loaded in parallel with Agent 3 when flag is on)
    const ragContext = await prefetchedRag;
    firstTask = await generateTask(
      1,
      legacyRoadmap,
      stoneProfile,
      dailyTime,
      undefined,
      category,
      skillLevel || 'beginner',
      ragContext ?? undefined,
      goal
    );
    saveAgentCheckpoint(pid, 'tasks', firstTask);
  }

  // ── Success: clear all checkpoints for this pipeline run ──
  clearPipelineCheckpoints(pid);

  return {
    goalAnalysis,
    roadmap: roadmapV2,
    firstTask,
    stoneProfile,
    pipelineId: pid,
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
  dailyTimeAvailable: number,
  category?: string,
  skillLevel?: 'beginner' | 'intermediate' | 'advanced'
): Promise<DailyTask[]> {

  const days = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);
  const BATCH_SIZE = 3; // Run 3 tasks concurrently to stay well within rate limits
  const allTasks: DailyTask[] = [];

  for (let i = 0; i < days.length; i += BATCH_SIZE) {
    const batch = days.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(day => generateTask(
        day,
        roadmap,
        stoneProfile,
        dailyTimeAvailable,
        undefined,
        category,
        skillLevel || 'beginner'
      ))
    );
    allTasks.push(...batchResults);

    // Brief pause between batches to respect rate limits
    if (i + BATCH_SIZE < days.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return allTasks;
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

  const context: AgentContext = {
    userId: 'temp',
    goal,
    timeline,
    dailyTimeAvailable: dailyTime
  };

  // Convert store tasks to feedback format
  const taskFeedback = convertToFeedback(completedTasks);

  // Summarize assessment results for recalibration context
  const assessmentTasks = completedTasks.filter(t =>
    t.assessmentResults && t.assessmentResults.length > 0
  );
  if (assessmentTasks.length > 0) {
    assessmentTasks.map(t => {
      const results = t.assessmentResults!;
      const correct = results.filter(r => r.correct === true).length;
      const total = results.length;
      const avgSelfScore = results
        .filter(r => r.selfScore !== undefined)
        .reduce((sum, r) => sum + (r.selfScore ?? 0), 0) / Math.max(1, results.filter(r => r.selfScore !== undefined).length);
      const highConfWrong = results.filter(r => (r.confidence === 'confident' || r.confidence === 'certain') && r.correct === false).length;
      return `Day ${t.day ?? t.dayNumber}: ${correct}/${total} correct, avg self-score ${avgSelfScore.toFixed(1)}/5${highConfWrong > 0 ? `, ${highConfWrong} misconception(s) detected` : ''}`;
    }).join('\n');
  }

  const recalibration = await withAgentLogging(
    { agentName: 'agent5_recalibrator', runType: 'checkpoint', input: { currentDay, taskCount: taskFeedback.length } },
    () => recalibrateCurriculum({
      context,
      roadmap,
      stoneProfile,
      completedTasks: taskFeedback,
      currentDay
    })
  );


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

  const days = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);
  const BATCH_SIZE = 3;

  for (let i = 0; i < days.length; i += BATCH_SIZE) {
    const batch = days.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(day => {
        const isRestDay = recalibration.recalibratedSprint.pedagogicalChanges.restDaysAdded.includes(day);
        const isReviewDay = recalibration.recalibratedSprint.pedagogicalChanges.reviewDaysAdded.includes(day);
        if (isRestDay || isReviewDay) {
          return generateTask(
            day,
            roadmap,
            stoneProfile,
            Math.floor(dailyTimeAvailable * 0.5),
            modificationsContext + `\nThis is a ${isRestDay ? 'REST' : 'REVIEW'} day - keep it light and restorative.`
          );
        }
        return generateTask(day, roadmap, stoneProfile, dailyTimeAvailable, modificationsContext);
      })
    );
    tasks.push(...batchResults);

    if (i + BATCH_SIZE < days.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

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
    agentRoadmap?: Agent3Output; // full Agent3Output when available — preserves domainPedagogy
  }
): Promise<{
  analysis: Agent5Output;
  adaptedTasks: DailyTask[];
}> {

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
    try {
      const { error } = await options.supabase
        .from('daily_tasks')
        .delete()
        .gt('day_number', currentDay)
        .eq('goal_id', options.goalId);

      if (error) {
        console.error('Failed to delete future tasks:', error);
      }
    } catch (error) {
      console.error('Error deleting future tasks:', error);
    }
  }

  // Step 3: Generate adapted sprint tasks
  // Prefer the full Agent3Output (preserves domainPedagogy) over a stub
  const roadmapOutput: Agent3Output = options?.agentRoadmap
    ?? { roadmap, domainPedagogy: '', stoneModificationSummary: '' };
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
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
    }
  }


  return {
    analysis,
    adaptedTasks
  };
}

// ============================================
// MULTI-STAGE VALIDATION PIPELINE HELPERS
// ============================================

/**
 * Stage 1b: After Agent 1 runs, determine if goal clarifications are needed.
 * Returns GoalClarificationOutput — caller checks needsClarification before showing UI.
 */
export function getGoalClarifications(agent1Output: Agent1Output): GoalClarificationOutput {
  return buildClarifications(agent1Output);
}

/**
 * Stage 2b: Preliminary stone extraction after Round 1 answers.
 * Returns follow-up questions + preliminary stone list.
 */
export async function runStoneRound2(
  goal: string,
  timeline: number,
  dailyTime: number,
  agent1Output: Agent1Output,
  round1Answers: StoneAnswer[],
): Promise<StoneRound2Output> {
  const context: AgentContext = {
    userId: 'temp',
    goal,
    timeline,
    dailyTimeAvailable: dailyTime,
  };

  return withAgentLogging(
    { agentName: 'agent2_stone_round2', runType: 'onboarding', input: { goal, round1Answers: round1Answers.length } },
    () => extractPreliminary(context, agent1Output, round1Answers)
  );
}

/**
 * Stage 2c: Cross-validate Round 1 + Round 2 answers to detect stone misattributions.
 */
export function runStoneCrossValidation(
  preliminary: StoneRound2Output,
  round2Answers: StoneAnswer[],
): CrossValidationResult {
  return crossValidateStones(preliminary.preliminaryStones, round2Answers);
}

/**
 * Stage 3b: Generate 7-day preview from Agent 3 output or AgentRoadmapV2. No LLM call.
 */
export function getCurriculumPreview(
  agent3Output: Agent3Output | AgentRoadmapV2,
  category: string,
  dailyMinutes: number,
): CurriculumPreview {
  const legacy = 'months' in agent3Output
    ? buildLegacyAgent3Output(agent3Output)
    : agent3Output;
  return buildCurriculumPreview(legacy, category, dailyMinutes);
}

/**
 * Stage 3c: Resolve user's pace choice into calibration params.
 */
export function getPaceCalibration(choice: PaceChoice): PaceCalibration {
  return resolvePaceCalibration(choice);
}

// Re-export for convenience
export type {
  GoalClarificationOutput,
  StoneRound2Output,
  CrossValidationResult,
  CurriculumPreview,
  PaceCalibration,
  PaceChoice,
};
