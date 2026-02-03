/**
 * Agent Orchestrator
 * Coordinates the multi-agent curriculum generation pipeline
 */

import { analyzeGoal } from './agent1-goal-analyzer';
import { identifyStones } from './agent2-stone-identifier';
import { buildCurriculum } from './agent3-curriculum-builder';
import { generateTask } from './agent4-task-generator';
import { recalibrateCurriculum, convertToFeedback } from './agent5-recalibrator';

import type {
  AgentContext,
  Agent1Output,
  Agent2Output,
  Agent3Output,
  Agent5Output,
  StoneAnswer,
  DailyTask,
  Roadmap
} from '../types/agents';

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
 * Run Agent 3: Build curriculum after collecting stone answers
 */
export async function runCurriculumBuilder(
  goal: string,
  timeline: number,
  dailyTime: number,
  goalAnalysis: Agent1Output,
  stoneAnswers: StoneAnswer[]
): Promise<Agent3Output> {
  const context: AgentContext = {
    userId: 'temp',
    goal,
    timeline,
    dailyTimeAvailable: dailyTime
  };

  console.log('🏛️ Agent 3: Building curriculum...');
  const curriculum = await buildCurriculum(context, goalAnalysis, stoneAnswers);

  return curriculum;
}

/**
 * Run Agent 4: Generate daily task
 */
export async function runTaskGenerator(
  dayNumber: number,
  roadmap: Agent3Output,
  stoneAnswers: StoneAnswer[],
  dailyTimeAvailable: number,
  previousTasksContext?: string
): Promise<DailyTask> {
  console.log(`📝 Agent 4: Generating task for Day ${dayNumber}...`);
  const task = await generateTask(
    dayNumber,
    roadmap,
    stoneAnswers,
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
  stoneAnswers: StoneAnswer[]
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

  // Step 3: Build curriculum with stone answers
  const roadmap = await buildCurriculum(context, goalAnalysis, stoneAnswers);

  // Step 4: Generate first day's task
  const firstTask = await generateTask(
    1,
    roadmap,
    stoneAnswers,
    dailyTime
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
  stoneAnswers: StoneAnswer[],
  dailyTimeAvailable: number
): Promise<DailyTask[]> {
  console.log(`📋 Generating tasks for days ${startDay} to ${endDay}...`);

  const tasks: DailyTask[] = [];

  for (let day = startDay; day <= endDay; day++) {
    const task = await generateTask(
      day,
      roadmap,
      stoneAnswers,
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
  stoneAnswers: StoneAnswer[],
  completedTasks: any[], // Tasks from store
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
    stoneAnswers,
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
  stoneAnswers: StoneAnswer[],
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
      // Generate lighter task
      const lightTask = await generateTask(
        day,
        roadmap,
        stoneAnswers,
        dailyTimeAvailable * 0.5, // 50% time for rest/review days
        modificationsContext + `\nThis is a ${isRestDay ? 'REST' : 'REVIEW'} day - keep it light and restorative.`
      );
      tasks.push(lightTask);
    } else {
      // Generate regular adapted task
      const task = await generateTask(
        day,
        roadmap,
        stoneAnswers,
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
 * 2. Generate adapted sprint tasks
 */
export async function handleCheckpoint(
  goal: string,
  timeline: number,
  dailyTime: number,
  roadmap: Roadmap,
  stoneAnswers: StoneAnswer[],
  completedTasks: any[],
  currentDay: number
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
    stoneAnswers,
    completedTasks,
    currentDay
  );

  // Step 2: Generate adapted sprint tasks
  const roadmapOutput: Agent3Output = { roadmap };
  const adaptedTasks = await generateAdaptedSprint(
    analysis,
    roadmapOutput,
    stoneAnswers,
    dailyTime
  );

  console.log('✅ Checkpoint workflow complete!');

  return {
    analysis,
    adaptedTasks
  };
}
