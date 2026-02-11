/**
 * Multi-Agent Curriculum Generation System
 *
 * Export all agents and orchestrator functions
 */

// Individual Agents
export { analyzeGoal } from './goal-analyzer';
export { identifyStones } from './stone-identifier';
export { buildCurriculum } from './curriculum-builder';
export { generateTask } from './task-generator';
export { recalibrateCurriculum, shouldTriggerCheckpoint, convertToFeedback } from './recalibrator';

// Orchestrator
export {
  runOnboardingAgents,
  runCurriculumBuilder,
  runTaskGenerator,
  generateCompleteRoadmap,
  generateTaskBatch,
  runCheckpointRecalibration,
  generateAdaptedSprint,
  handleCheckpoint
} from './orchestrator';

// Re-export types
export type {
  AgentContext,
  Agent1Output,
  Agent2Output,
  Agent3Output,
  Agent5Input,
  Agent5Output,
  DailyTask,
  StoneAnswer,
  BuildingStone,
  Roadmap,
  CompletedTaskFeedback,
  CheckpointAnalysis,
  RecalibratedSprint
} from '@types-app/agents';
