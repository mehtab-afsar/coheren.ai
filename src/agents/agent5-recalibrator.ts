/**
 * Agent 5: Curriculum Re-calibrator
 *
 * Triggered every 14 days (or at checkpoints) to:
 * 1. Analyze user's performance on completed tasks
 * 2. Identify struggles, mastery patterns, and behavioral trends
 * 3. Adjust the next sprint (14 days) of the curriculum
 *
 * This agent makes the curriculum ADAPTIVE, not static.
 */

import Groq from 'groq-sdk';
import type {
  AgentContext,
  Roadmap,
  StoneAnswer
} from '../types/agents';

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

interface CompletedTaskFeedback {
  dayNumber: number;
  title: string;
  difficultyRating: number; // 1-5 scale (1=easy, 5=very hard)
  completionTime: number; // actual minutes taken
  userComment?: string; // optional struggle notes
  skipped: boolean;
  skipReason?: 'time' | 'health' | 'difficulty' | 'external';
}

interface CheckpointAnalysis {
  checkpointDay: number; // e.g., 14, 28, 42
  overallMastery: 'struggling' | 'on-track' | 'excelling';
  strugglingAreas: string[]; // e.g., ["F-chord transitions", "Stamina"]
  masteringAreas: string[]; // e.g., ["Basic strumming", "Finger positioning"]
  paceAdjustment: 'slow-down' | 'maintain' | 'accelerate';
  motivationalInsights: string; // What's working emotionally
  recommendations: string[]; // Specific changes to make
  nextSprintFocus: string; // The theme for Days 15-28
}

interface RecalibratedSprint {
  sprintNumber: number; // Which 14-day sprint this is
  startDay: number;
  endDay: number;
  adjustedPhase?: {
    phaseName: string;
    focusAreas: Record<string, number>;
    rationale: string;
  };
  modifiedTasks: Array<{
    dayNumber: number;
    modification: 'added' | 'removed' | 'adjusted';
    reason: string;
    newFocus?: string;
  }>;
  pedagogicalChanges: {
    restDaysAdded: number[];
    reviewDaysAdded: number[];
    difficultyReduction: boolean;
    intensityIncrease: boolean;
  };
  personalizedMessage: string; // Message to show user at checkpoint
}

const AGENT5_SYSTEM_PROMPT = `You are a Curriculum Re-Calibration Expert specializing in adaptive learning.

Your job is to analyze a learner's performance over the last 14 days and adjust the NEXT 14 days of their curriculum.

## Core Principles

1. **Data-Driven Adjustment**: Base decisions on actual completion rates, difficulty ratings, and user comments.
2. **Pedagogical Integrity**: Don't skip foundational skills, but do adjust pacing and intensity.
3. **Motivational Sensitivity**: If a user is struggling emotionally (not just technically), adjust to rebuild confidence.
4. **Progressive Overload**: If they're excelling, increase challenge incrementally (not drastically).

## Decision Framework

### If Mastery is HIGH (avg difficulty < 2.5, completion > 85%)
- **Action**: Accelerate progression
- **How**: Skip redundant practice days, introduce advanced concepts earlier
- **Example**: "User mastered basic chords in 10 days (planned 14). Move to chord transitions 4 days early."

### If Mastery is ON-TRACK (avg difficulty 2.5-3.5, completion 70-85%)
- **Action**: Maintain current pace
- **How**: Keep the roadmap as-is but add more variation to prevent monotony
- **Example**: "User is progressing as expected. Add 1 rest day and 1 creative exploration day."

### If Mastery is LOW (avg difficulty > 3.5, completion < 70%)
- **Action**: Slow down and reinforce
- **How**: Add 2-3 remedial days before moving to next phase
- **Example**: "User struggled with footwork (4 tasks rated 'hard'). Add 3 days of isolated footwork drills before sparring."

## Special Cases

### Physical Skills (Boxing, Guitar, Dance)
- High difficulty ratings often mean physical adaptation needed (muscle memory, stamina)
- **Solution**: Add more rest days, reduce intensity, focus on form over quantity

### Cognitive Skills (UPSC, Programming)
- High difficulty ratings often mean conceptual gaps
- **Solution**: Add review days, provide more scaffolding, break concepts into smaller chunks

### Habit Formation (Meditation, Journaling)
- High skip rates (not difficulty) indicate motivation issues
- **Solution**: Reduce session length, add variety, connect to intrinsic motivation

## Output Format

Return a JSON object with this structure:

{
  "checkpointAnalysis": {
    "checkpointDay": 14,
    "overallMastery": "on-track" | "struggling" | "excelling",
    "strugglingAreas": ["Area 1", "Area 2"],
    "masteringAreas": ["Area 1", "Area 2"],
    "paceAdjustment": "slow-down" | "maintain" | "accelerate",
    "motivationalInsights": "What's working emotionally",
    "recommendations": ["Change 1", "Change 2"],
    "nextSprintFocus": "Theme for next 14 days"
  },
  "recalibratedSprint": {
    "sprintNumber": 2,
    "startDay": 15,
    "endDay": 28,
    "adjustedPhase": {
      "phaseName": "Adjusted Phase Name",
      "focusAreas": { "technique": 40, "conditioning": 30, "rest": 30 },
      "rationale": "Why we're adjusting focus"
    },
    "modifiedTasks": [
      {
        "dayNumber": 15,
        "modification": "added" | "removed" | "adjusted",
        "reason": "Why this change",
        "newFocus": "What replaces it"
      }
    ],
    "pedagogicalChanges": {
      "restDaysAdded": [17, 24],
      "reviewDaysAdded": [21],
      "difficultyReduction": true,
      "intensityIncrease": false
    },
    "personalizedMessage": "Message to show user at checkpoint"
  }
}

## Critical Rules

1. NEVER skip foundational skills entirely - only adjust pacing
2. ALWAYS explain rationale for changes
3. BE SPECIFIC about what to adjust (not vague like "practice more")
4. MAINTAIN the original goal's integrity (don't change "learn boxing" to "learn cardio")
5. RESPECT the user's time constraints (dailyTimeAvailable)

Return ONLY valid JSON with no additional commentary.`;

export interface Agent5Input {
  context: AgentContext;
  roadmap: Roadmap;
  stoneAnswers: StoneAnswer[];
  completedTasks: CompletedTaskFeedback[];
  currentDay: number;
}

export interface Agent5Output {
  checkpointAnalysis: CheckpointAnalysis;
  recalibratedSprint: RecalibratedSprint;
}

/**
 * Analyze user performance and recalibrate the curriculum
 */
export async function recalibrateCurriculum(
  input: Agent5Input
): Promise<Agent5Output> {
  const { context, roadmap, stoneAnswers, completedTasks, currentDay } = input;

  // Calculate performance metrics
  const avgDifficulty = completedTasks.reduce((sum, t) => sum + t.difficultyRating, 0) / completedTasks.length;
  const completionRate = (completedTasks.filter(t => !t.skipped).length / completedTasks.length) * 100;
  const avgTimeOverage = completedTasks.reduce((sum, t) =>
    sum + (t.completionTime - context.dailyTimeAvailable), 0
  ) / completedTasks.length;

  const userPrompt = `# Curriculum Re-Calibration Request

## User Context
- **Goal**: ${context.goal}
- **Timeline**: ${context.timeline} days
- **Daily Time Available**: ${context.dailyTimeAvailable} minutes
- **Current Day**: ${currentDay}

## Original Roadmap
${JSON.stringify(roadmap, null, 2)}

## User Constraints (Stone Answers)
${stoneAnswers.map(s => `- ${s.stoneId}: ${s.answer}`).join('\n')}

## Performance Data (Last 14 Days)

### Summary Metrics
- **Average Difficulty Rating**: ${avgDifficulty.toFixed(2)} / 5
- **Completion Rate**: ${completionRate.toFixed(1)}%
- **Average Time Overage**: ${avgTimeOverage > 0 ? `+${avgTimeOverage.toFixed(0)}` : avgTimeOverage.toFixed(0)} minutes

### Task-by-Task Breakdown
${completedTasks.map(task => `
**Day ${task.dayNumber}**: ${task.title}
- Difficulty: ${task.difficultyRating}/5
- Time: ${task.completionTime} min (planned: ${context.dailyTimeAvailable} min)
- Status: ${task.skipped ? `SKIPPED (${task.skipReason})` : 'COMPLETED'}
${task.userComment ? `- Comment: "${task.userComment}"` : ''}
`).join('\n')}

## Your Task

Analyze this performance data and determine:
1. Is the user struggling, on-track, or excelling?
2. What specific areas need more/less focus?
3. How should the NEXT 14 days (Days ${currentDay + 1}-${currentDay + 14}) be adjusted?

Return a detailed checkpoint analysis and a recalibrated sprint plan for the next 14 days.`;

  try {
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: AGENT5_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.4, // Balance between analytical and creative adjustments
      max_tokens: 4000,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Agent 5 (Re-calibrator) returned no response');
    }

    const parsed = JSON.parse(response) as Agent5Output;

    console.log('[Agent 5] Checkpoint Analysis:', parsed.checkpointAnalysis.overallMastery);
    console.log('[Agent 5] Next Sprint Focus:', parsed.checkpointAnalysis.nextSprintFocus);

    return parsed;
  } catch (error) {
    console.error('[Agent 5] Re-calibration failed:', error);
    throw new Error(`Agent 5 re-calibration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper: Determine if a checkpoint should trigger
 */
export function shouldTriggerCheckpoint(currentDay: number, checkpointInterval: number = 14): boolean {
  return currentDay > 0 && currentDay % checkpointInterval === 0;
}

/**
 * Helper: Convert CompletedTaskFeedback from your Task interface
 */
export function convertToFeedback(tasks: any[]): CompletedTaskFeedback[] {
  return tasks.map(task => ({
    dayNumber: task.day || task.dayNumber,
    title: task.title,
    difficultyRating: task.difficultyRating || 3, // default to medium if not set
    completionTime: task.actualDuration || task.duration,
    userComment: task.userComment,
    skipped: task.skipped,
    skipReason: task.skipReason
  }));
}
