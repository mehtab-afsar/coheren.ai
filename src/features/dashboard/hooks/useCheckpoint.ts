import { useState, useEffect } from 'react';
import { useStore, type Task } from '@core/store/useStore';
import { getRecentFeedback } from '@lib/database';
import { track } from '@lib/analytics';
import { handleCheckpoint } from '@core/agents/orchestrator';
import { isCheckpointDay } from '@lib/checkpointHelpers';
import { flags } from '@config/feature-flags';
import type { Agent2ProfileOutput } from '@types-app/agents';

interface CheckpointData {
  completedTasks: number;
  totalTasks: number;
  avgDifficulty: number;
  strugglingAreas: string[];
  masteringAreas: string[];
  recentFeedback: Array<{
    difficulty_score: number;
    completion_status: string;
    feedback_tags?: string[];
    actual_duration_mins?: number;
    user_comment?: string;
  }>;
}

interface RecalibrationResult {
  coachMessage: string;
  nextSprintFocus: string;
  stoneDirective?: string;
}

export function useCheckpoint() {
  const [checkpointData, setCheckpointData] = useState<CheckpointData | null>(null);
  const [isRecalibrating, setIsRecalibrating] = useState(false);
  const [recalibrationResult, setRecalibrationResult] = useState<RecalibrationResult | null>(null);

  const currentDay    = useStore((state) => state.currentDay);
  const user          = useStore((state) => state.user);
  const currentGoal   = useStore((state) => state.currentGoal);
  const roadmap       = useStore((state) => state.roadmap);
  const agentRoadmap  = useStore((state) => state.agentRoadmap);
  const stoneProfile  = useStore((state) => state.stoneProfile);
  const tasks         = useStore((state) => state.tasks);
  const setTasks      = useStore((state) => state.setTasks);
  const updateAgentRoadmap = useStore((state) => state.updateAgentRoadmap);

  const isCheckpoint = flags.USE_RECALIBRATION && isCheckpointDay(currentDay, 14);

  // Fetch checkpoint data when it's a checkpoint day
  useEffect(() => {
    if (isCheckpoint && user && currentGoal) {
      const fetchCheckpointData = async () => {
        try {
          const goalId = (currentGoal as { id?: string }).id;
          if (!goalId) return;

          // Fetch last 14 days of feedback
          const recentFeedback = await getRecentFeedback(goalId, 14);

          // Calculate performance metrics
          const completedCount = recentFeedback.filter(f => f.completion_status === 'completed').length;
          const totalTasks = 14;
          const avgDifficulty = recentFeedback.length > 0
            ? recentFeedback.reduce((sum, f) => sum + f.difficulty_score, 0) / recentFeedback.length
            : 3;

          // Identify struggling areas (tasks with difficulty >= 4)
          const strugglingTasks = recentFeedback.filter(f => f.difficulty_score >= 4);
          const strugglingAreas = [...new Set(strugglingTasks.flatMap(f => f.feedback_tags || []))];

          // Identify mastering areas (tasks with difficulty <= 2)
          const masteringTasks = recentFeedback.filter(f => f.difficulty_score <= 2);
          const masteringAreas = [...new Set(masteringTasks.flatMap(f => f.feedback_tags || []))];

          setCheckpointData({
            completedTasks: completedCount,
            totalTasks,
            avgDifficulty: Math.round(avgDifficulty * 10) / 10,
            strugglingAreas,
            masteringAreas,
            recentFeedback
          });
        } catch (error) {
          console.error('Failed to fetch checkpoint data:', error);
        }
      };

      fetchCheckpointData();
    }
  }, [isCheckpoint, user, currentGoal]);

  const handleCheckpointComplete = async () => {
    setIsRecalibrating(true);

    try {
      const goalId = (currentGoal as { id?: string }).id;
      if (!goalId || !roadmap || !checkpointData) {
        throw new Error('Missing required data for checkpoint');
      }

      // Derive timeline and dailyTime from real store data
      const timelineDays = agentRoadmap?.roadmap?.totalDays
        ?? (roadmap.duration ? roadmap.duration * 7 : 90);
      const dailyMinutes = (() => {
        const raw = roadmap.dailyTime ?? '';
        const match = String(raw).match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 30;
      })();

      // Map stored tasks to a title lookup by approximate day
      const taskTitleByDay: Record<number, string> = {};
      for (const t of tasks) {
        if (t.dayNumber != null) taskTitleByDay[t.dayNumber] = t.title;
      }

      // Convert recent feedback to Agent 5 format
      const taskFeedback = checkpointData.recentFeedback.map((f, i) => {
        const approxDay = currentDay - 13 + i;
        return {
          dayNumber: approxDay,
          title: taskTitleByDay[approxDay] ?? 'Task',
          difficultyRating: f.difficulty_score,
          completionTime: f.actual_duration_mins,
          userComment: f.user_comment,
          skipped: f.completion_status === 'skipped',
          skipReason: undefined,
        };
      });

      // Use real stone profile from store, fallback to minimal stub if not yet set
      const resolvedStoneProfile: Agent2ProfileOutput = stoneProfile ?? {
        stoneProfile: {
          userArchetype: 'Unknown',
          primaryStone: 'Inconsistency',
          stones: [],
          agent3Guidance: [],
          agent5Note: '',
          confidence: 0,
        }
      };

      // Use Agent 3 roadmap if available, fall back to legacy roadmap shape
      const resolvedRoadmap = agentRoadmap?.roadmap
        ?? ((roadmap.strategicPlan || roadmap) as unknown as import('@types-app/agents').Roadmap);

      // Run Agent 5 checkpoint analysis
      const result = await handleCheckpoint(
        (currentGoal as { specificGoal?: string }).specificGoal || 'Continue your journey',
        timelineDays,
        dailyMinutes,
        resolvedRoadmap,
        resolvedStoneProfile,
        taskFeedback as unknown as Task[],
        currentDay,
        { userId: user!.id, goalId, agentRoadmap: agentRoadmap ?? undefined }
      );

      // Convert adapted tasks to store format
      const convertedTasks = result.adaptedTasks.map((dailyTask) => ({
        id: String(dailyTask.day),
        title: dailyTask.task.title,
        description: dailyTask.task.description,
        type: 'practice' as const,
        duration: dailyTask.task.estimatedMinutes,
        completed: false,
        skipped: false,
        scheduledFor: new Date().toISOString().split('T')[0],
        day: dailyTask.day,
        dayNumber: dailyTask.day,
        steps: dailyTask.task.steps.map(step => step.instruction),
        tips: dailyTask.task.tips,
        successCriteria: dailyTask.task.successCriteria.primary,
        resources: dailyTask.task.resources // Include matched resources
      }));

      // Update local tasks with new sprint tasks
      setTasks(convertedTasks);

      // Apply recalibration changes back to the agent roadmap
      const adjustedPhase = result.analysis.recalibratedSprint.adjustedPhase;
      const pedChanges = result.analysis.recalibratedSprint.pedagogicalChanges;
      if (adjustedPhase || pedChanges) {
        updateAgentRoadmap((prev) => {
          const updated = { ...prev, roadmap: { ...prev.roadmap, phases: [...prev.roadmap.phases] } };
          // Find the current phase and update its focus areas
          if (adjustedPhase) {
            const phaseIdx = updated.roadmap.phases.findIndex(
              p => p.phaseName === adjustedPhase.phaseName
            );
            if (phaseIdx >= 0) {
              updated.roadmap.phases[phaseIdx] = {
                ...updated.roadmap.phases[phaseIdx],
                focusAreas: adjustedPhase.focusAreas ?? updated.roadmap.phases[phaseIdx].focusAreas,
              };
            }
          }
          // Apply pedagogical changes to review/rest moments
          if (pedChanges) {
            const existingDays = new Set(updated.roadmap.reviewMoments.map(rm => rm.day));
            for (const day of pedChanges.reviewDaysAdded ?? []) {
              if (!existingDays.has(day)) {
                updated.roadmap.reviewMoments = [...updated.roadmap.reviewMoments, {
                  day, type: 'reflection' as const, prompt: 'Review day added by recalibration'
                }];
              }
            }
            for (const day of pedChanges.restDaysAdded ?? []) {
              updated.roadmap.restDays = {
                ...updated.roadmap.restDays,
                customDays: [...(updated.roadmap.restDays.customDays ?? []), day],
              };
            }
          }
          return updated;
        });
      }

      track({
        event: 'checkpoint_completed',
        properties: { day: currentDay, completed_tasks: checkpointData.completedTasks, avg_difficulty: checkpointData.avgDifficulty },
      });

      // Surface the Agent 5 result in the UI (replaces the alert)
      setRecalibrationResult({
        coachMessage:    result.analysis.recalibratedSprint.personalizedMessage,
        nextSprintFocus: result.analysis.checkpointAnalysis.nextSprintFocus,
        stoneDirective:  resolvedStoneProfile.stoneProfile.primaryStone,
      });

      setIsRecalibrating(false);
    } catch (error) {
      console.error('Checkpoint failed:', error);
      alert('Failed to recalibrate roadmap. Please try again.');
      setIsRecalibrating(false);
    }
  };

  /**
   * Early recalibration — triggered by useDifficultyMonitor (3+ consecutive skips).
   * Uses in-memory task history instead of DB fetch, so it works immediately.
   * mode='simplify' → tells Agent 5 to reduce difficulty/duration for next sprint
   * mode='extend'   → tells Agent 5 user needs more time (paceAdjustment=slower)
   */
  const triggerEarlyRecalibration = async (mode: 'simplify' | 'extend') => {
    if (!roadmap || !agentRoadmap || !flags.USE_RECALIBRATION) return;
    setIsRecalibrating(true);

    try {
      const timelineDays = agentRoadmap.roadmap.totalDays ?? 90;
      const dailyMinutes = (() => {
        const raw = roadmap.dailyTime ?? '';
        const match = String(raw).match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 30;
      })();

      // Build feedback from in-memory tasks (last 7 days)
      const recentTasks = [...tasks]
        .filter(t => t.dayNumber != null && t.dayNumber <= currentDay)
        .sort((a, b) => (b.dayNumber ?? 0) - (a.dayNumber ?? 0))
        .slice(0, 7);

      const taskFeedback = recentTasks.map(t => ({
        dayNumber: t.dayNumber ?? t.day,
        title: t.title,
        difficultyRating: t.difficultyRating ?? (t.skipped ? 5 : 3),
        completionTime: t.actualDuration,
        userComment: mode === 'simplify'
          ? 'User requested plan simplification — tasks too hard'
          : 'User requested timeline extension — needs more time',
        skipped: t.skipped,
        skipReason: t.skipReason,
      }));

      const resolvedStoneProfile: Agent2ProfileOutput = stoneProfile ?? {
        stoneProfile: {
          userArchetype: 'Unknown',
          primaryStone: 'Inconsistency',
          stones: [],
          agent3Guidance: [],
          agent5Note: '',
          confidence: 0,
        }
      };

      const resolvedRoadmap = agentRoadmap.roadmap;
      const goalId = (currentGoal as { id?: string }).id;

      const result = await handleCheckpoint(
        (currentGoal as { specificGoal?: string }).specificGoal || 'Continue your journey',
        timelineDays,
        dailyMinutes,
        resolvedRoadmap,
        resolvedStoneProfile,
        taskFeedback as unknown as Task[],
        currentDay,
        { userId: user?.id, goalId, agentRoadmap }
      );

      const convertedTasks = result.adaptedTasks.map((dailyTask) => ({
        id: String(dailyTask.day),
        title: dailyTask.task.title,
        description: dailyTask.task.description,
        type: 'practice' as const,
        duration: dailyTask.task.estimatedMinutes,
        completed: false,
        skipped: false,
        scheduledFor: new Date().toISOString().split('T')[0],
        day: dailyTask.day,
        dayNumber: dailyTask.day,
        steps: dailyTask.task.steps.map(step => step.instruction),
        tips: dailyTask.task.tips,
        successCriteria: dailyTask.task.successCriteria.primary,
        resources: dailyTask.task.resources,
      }));

      setTasks(convertedTasks);

      // Apply recalibration to roadmap
      const earlyAdjustedPhase = result.analysis.recalibratedSprint.adjustedPhase;
      const earlyPedChanges = result.analysis.recalibratedSprint.pedagogicalChanges;
      if (earlyAdjustedPhase || earlyPedChanges) {
        updateAgentRoadmap((prev) => {
          const updated = { ...prev, roadmap: { ...prev.roadmap, phases: [...prev.roadmap.phases] } };
          if (earlyAdjustedPhase) {
            const phaseIdx = updated.roadmap.phases.findIndex(
              p => p.phaseName === earlyAdjustedPhase.phaseName
            );
            if (phaseIdx >= 0) {
              updated.roadmap.phases[phaseIdx] = {
                ...updated.roadmap.phases[phaseIdx],
                focusAreas: earlyAdjustedPhase.focusAreas ?? updated.roadmap.phases[phaseIdx].focusAreas,
              };
            }
          }
          if (earlyPedChanges) {
            const existingDays = new Set(updated.roadmap.reviewMoments.map(rm => rm.day));
            for (const day of earlyPedChanges.reviewDaysAdded ?? []) {
              if (!existingDays.has(day)) {
                updated.roadmap.reviewMoments = [...updated.roadmap.reviewMoments, {
                  day, type: 'reflection' as const, prompt: 'Review day added by early recalibration'
                }];
              }
            }
            for (const day of earlyPedChanges.restDaysAdded ?? []) {
              updated.roadmap.restDays = {
                ...updated.roadmap.restDays,
                customDays: [...(updated.roadmap.restDays.customDays ?? []), day],
              };
            }
          }
          return updated;
        });
      }

      track({
        event: 'early_recalibration_triggered',
        properties: { day: currentDay, mode, skipped_tasks: recentTasks.filter(t => t.skipped).length },
      });

      setRecalibrationResult({
        coachMessage:    result.analysis.recalibratedSprint.personalizedMessage,
        nextSprintFocus: result.analysis.checkpointAnalysis.nextSprintFocus,
        stoneDirective:  resolvedStoneProfile.stoneProfile.primaryStone,
      });
    } catch (error) {
      console.error('Early recalibration failed:', error);
    } finally {
      setIsRecalibrating(false);
    }
  };

  return {
    checkpointData,
    isRecalibrating,
    recalibrationResult,
    handleCheckpointComplete,
    triggerEarlyRecalibration,
  };
}
