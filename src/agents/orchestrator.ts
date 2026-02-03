/**
 * Agent Orchestrator
 * Coordinates the multi-agent curriculum generation pipeline
 */

import { analyzeGoal } from './agent1-goal-analyzer';
import { identifyStones } from './agent2-stone-identifier';
import { buildCurriculum } from './agent3-curriculum-builder';
import { generateTask } from './agent4-task-generator';

import type {
  AgentContext,
  Agent1Output,
  Agent2Output,
  Agent3Output,
  StoneAnswer,
  DailyTask
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
