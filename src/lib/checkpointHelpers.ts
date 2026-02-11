/**
 * Checkpoint Helper Functions
 *
 * Utilities for detecting checkpoints and preparing data for Agent 5
 */

import type { CompletedTaskFeedback } from '@types-app/agents';

/**
 * Check if a given day is a checkpoint day
 */
export function isCheckpointDay(dayNumber: number, checkpointInterval: number = 14): boolean {
  return dayNumber > 0 && dayNumber % checkpointInterval === 0;
}

/**
 * Get the next checkpoint day
 */
export function getNextCheckpointDay(currentDay: number, checkpointInterval: number = 14): number {
  return Math.ceil(currentDay / checkpointInterval) * checkpointInterval;
}

/**
 * Get which sprint number this checkpoint belongs to
 */
export function getSprintNumber(checkpointDay: number, checkpointInterval: number = 14): number {
  return checkpointDay / checkpointInterval;
}

/**
 * Calculate performance metrics from completed tasks
 */
export function calculatePerformanceMetrics(tasks: CompletedTaskFeedback[]) {
  if (tasks.length === 0) {
    return {
      avgDifficulty: 0,
      completionRate: 0,
      avgTimeOverage: 0,
      totalCompleted: 0,
      totalSkipped: 0
    };
  }

  const avgDifficulty = tasks.reduce((sum, t) => sum + t.difficultyRating, 0) / tasks.length;
  const completedTasks = tasks.filter(t => !t.skipped);
  const completionRate = (completedTasks.length / tasks.length) * 100;

  // Calculate average time overage (only for completed tasks)
  let avgTimeOverage = 0;
  if (completedTasks.length > 0) {
    const totalTimeOverage = completedTasks.reduce((sum, t) => {
      // Assuming estimatedTime is 30 min if not provided
      const estimated = 30;
      return sum + (t.completionTime - estimated);
    }, 0);
    avgTimeOverage = totalTimeOverage / completedTasks.length;
  }

  return {
    avgDifficulty: Math.round(avgDifficulty * 10) / 10,
    completionRate: Math.round(completionRate),
    avgTimeOverage: Math.round(avgTimeOverage),
    totalCompleted: completedTasks.length,
    totalSkipped: tasks.filter(t => t.skipped).length
  };
}

/**
 * Identify struggling areas from task feedback
 */
export function identifyStrugglingAreas(tasks: CompletedTaskFeedback[]): string[] {
  const struggles: string[] = [];

  // Tasks rated as very hard (4-5)
  const hardTasks = tasks.filter(t => t.difficultyRating >= 4);

  if (hardTasks.length > 0) {
    // Extract common themes from titles
    const titles = hardTasks.map(t => t.title);

    // Simple keyword extraction (you can make this smarter)
    const keywords = new Set<string>();
    titles.forEach(title => {
      const words = title.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 4 && !['learn', 'practice', 'master', 'understand'].includes(word)) {
          keywords.add(word);
        }
      });
    });

    keywords.forEach(keyword => struggles.push(keyword));
  }

  // Check for skip patterns
  const skipReasons = tasks
    .filter(t => t.skipped && t.skipReason)
    .map(t => t.skipReason!);

  if (skipReasons.filter(r => r === 'difficulty').length > 2) {
    struggles.push('Task complexity too high');
  }

  if (skipReasons.filter(r => r === 'time').length > 2) {
    struggles.push('Time management challenges');
  }

  if (skipReasons.filter(r => r === 'health').length > 1) {
    struggles.push('Physical fatigue or injury risk');
  }

  return [...new Set(struggles)]; // Remove duplicates
}

/**
 * Identify mastering areas from task feedback
 */
export function identifyMasteringAreas(tasks: CompletedTaskFeedback[]): string[] {
  const mastering: string[] = [];

  // Tasks rated as easy (1-2) that were completed
  const easyTasks = tasks.filter(t => !t.skipped && t.difficultyRating <= 2);

  if (easyTasks.length > 0) {
    // Extract common themes
    const titles = easyTasks.map(t => t.title);

    const keywords = new Set<string>();
    titles.forEach(title => {
      const words = title.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 4 && !['learn', 'practice', 'master', 'understand'].includes(word)) {
          keywords.add(word);
        }
      });
    });

    keywords.forEach(keyword => mastering.push(keyword));
  }

  // Check for consistent completion with good time
  const fastCompletions = tasks.filter(t =>
    !t.skipped && t.completionTime < 25 // Faster than expected
  );

  if (fastCompletions.length > 3) {
    mastering.push('Time efficiency');
  }

  return [...new Set(mastering)]; // Remove duplicates
}

/**
 * Convert Zustand task format to Agent 5 CompletedTaskFeedback format
 */
export function convertToCompletedTaskFeedback(
  tasks: Array<{
    id: string;
    title: string;
    completed: boolean;
    skipped: boolean;
    skipReason?: 'time' | 'health' | 'difficulty' | 'external';
    difficultyRating?: number;
    actualDuration?: number;
    userComment?: string;
    day?: number;
    dayNumber?: number;
  }>
): CompletedTaskFeedback[] {
  return tasks.map((task, index) => ({
    dayNumber: task.day || task.dayNumber || index + 1,
    title: task.title,
    difficultyRating: task.difficultyRating || 3, // Default to medium if not rated
    completionTime: task.actualDuration || 30, // Default to 30 min if not tracked
    userComment: task.userComment,
    skipped: task.skipped,
    skipReason: task.skipReason
  }));
}

/**
 * Determine if recalibration should be triggered based on performance
 */
export function shouldTriggerRecalibration(
  dayNumber: number,
  avgDifficulty: number,
  completionRate: number,
  checkpointInterval: number = 14
): boolean {
  // Always trigger at checkpoint days
  if (isCheckpointDay(dayNumber, checkpointInterval)) {
    return true;
  }

  // Early trigger if performance is very poor
  if (dayNumber >= 7) {
    // After first week, check if struggling badly
    if (avgDifficulty > 4.5 || completionRate < 50) {
      return true; // Emergency recalibration
    }
  }

  return false;
}

/**
 * Get checkpoint status message for user
 */
export function getCheckpointMessage(
  sprintNumber: number,
  completionRate: number,
  avgDifficulty: number
): string {
  const performance = avgDifficulty > 3.5 ? 'challenging' :
                     avgDifficulty < 2.5 ? 'easy' : 'balanced';

  if (completionRate > 85 && performance === 'balanced') {
    return `🎉 Outstanding work on Sprint ${sprintNumber}! You're making excellent progress.`;
  }

  if (completionRate > 70) {
    return `💪 Solid performance on Sprint ${sprintNumber}. Let's fine-tune the next phase.`;
  }

  if (completionRate > 50) {
    return `🌟 You completed Sprint ${sprintNumber}! Let's adjust the roadmap to match your pace.`;
  }

  return `📊 Sprint ${sprintNumber} complete. Let's review and optimize your learning path.`;
}

/**
 * "Grit Factor" Analysis - Analyze difficulty + duration combinations
 * to provide more nuanced recommendations
 *
 * Identifies four patterns:
 * 1. Mentally Confusing: High difficulty + Quick completion (conceptual struggle)
 * 2. Physical Grind: High difficulty + Long duration (both mentally and physically demanding)
 * 3. Effortless Flow: Low difficulty + Quick completion (mastered)
 * 4. Needs Optimization: Low difficulty + Long duration (unclear instructions or inefficiency)
 */
export function analyzeGritFactor(tasks: CompletedTaskFeedback[]): {
  mentallyConfusing: CompletedTaskFeedback[]; // High difficulty + Quick completion
  physicalGrind: CompletedTaskFeedback[]; // High difficulty + Long duration
  effortlessFlow: CompletedTaskFeedback[]; // Low difficulty + Quick completion
  needsOptimization: CompletedTaskFeedback[]; // Low difficulty + Long duration
  recommendations: string[];
} {
  const mentallyConfusing: CompletedTaskFeedback[] = [];
  const physicalGrind: CompletedTaskFeedback[] = [];
  const effortlessFlow: CompletedTaskFeedback[] = [];
  const needsOptimization: CompletedTaskFeedback[] = [];
  const recommendations: string[] = [];

  tasks.forEach(task => {
    const isHighDifficulty = task.difficultyRating >= 4;
    const isLowDifficulty = task.difficultyRating <= 2;
    const isQuickCompletion = task.completionTime && task.completionTime < 20;
    const isLongDuration = task.completionTime && task.completionTime > 40;

    // Categorize by pattern
    if (isHighDifficulty && isQuickCompletion) {
      mentallyConfusing.push(task);
    } else if (isHighDifficulty && isLongDuration) {
      physicalGrind.push(task);
    } else if (isLowDifficulty && isQuickCompletion) {
      effortlessFlow.push(task);
    } else if (isLowDifficulty && isLongDuration) {
      needsOptimization.push(task);
    }
  });

  // Generate recommendations based on patterns
  if (mentallyConfusing.length >= 3) {
    recommendations.push(
      '🧠 Add "Simplified Explanation" days - many tasks are conceptually difficult despite being quick to complete. Common in Coding/UPSC prep.'
    );
  }

  if (physicalGrind.length >= 3) {
    recommendations.push(
      '💪 Add "Rest/Recovery" days - multiple tasks are both mentally and physically demanding. Common in Boxing/Guitar practice.'
    );
  }

  if (effortlessFlow.length >= 5) {
    recommendations.push(
      '⚡ Accelerate pace - many tasks are being completed easily and quickly. You\'re ready for more advanced content.'
    );
  }

  if (needsOptimization.length >= 3) {
    recommendations.push(
      '📝 Simplify task structure - easy tasks are taking too long, possibly due to unclear instructions or inefficient workflow.'
    );
  }

  // Cross-pattern analysis
  if (mentallyConfusing.length > 0 && physicalGrind.length > 0) {
    recommendations.push(
      '🎯 Separate conceptual learning from physical practice - you\'re experiencing both types of difficulty.'
    );
  }

  return {
    mentallyConfusing,
    physicalGrind,
    effortlessFlow,
    needsOptimization,
    recommendations
  };
}
