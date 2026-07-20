import { useState, useEffect } from 'react';
import { useStore, type Task, type WeekPlan } from '@core/store/useStore';
import { getRecentFeedback, updateRoadmapStoneProfile, loadThresholdAdjustments, saveThresholdAdjustments } from '@lib/database';
import { track } from '@lib/analytics';
import { handleCheckpoint } from '@core/agents/orchestrator';
import { recalibrateWeek, computeSignals, adaptThresholds, DEFAULT_THRESHOLDS } from '@core/agents/recalibrator';
import { isCheckpointDay } from '@lib/checkpointHelpers';
import { flags } from '@config/feature-flags';
import { updateStoneSeverities } from '@lib/stoneUpdater';
import { embedAndSaveSprintMemory } from '@lib/sprintMemory';
import { compress } from '@lib/sprintCompressor';
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
  const [recalibrationError, setRecalibrationError] = useState<string | null>(null);

  const currentDay         = useStore((state) => state.currentDay);
  const user               = useStore((state) => state.user);
  const currentGoal        = useStore((state) => state.currentGoal);
  const roadmap            = useStore((state) => state.roadmap);
  const agentRoadmap       = useStore((state) => state.agentRoadmap);
  const agentRoadmapV2     = useStore((state) => state.agentRoadmapV2);
  const stoneProfile       = useStore((state) => state.stoneProfile);
  const tasks              = useStore((state) => state.tasks);
  const setTasks           = useStore((state) => state.setTasks);
  const updateAgentRoadmap = useStore((state) => state.updateAgentRoadmap);
  const updateWeek         = useStore((state) => state.updateWeek);
  const setPendingWeeklyCheckIn  = useStore((state) => state.setPendingWeeklyCheckIn);
  const updateStoneProfile       = useStore((state) => state.updateStoneProfile);
  const addStoneHistoryEntry     = useStore((state) => state.addStoneHistoryEntry);
  const stoneHistory             = useStore((state) => state.stoneHistory);

  const CHECKPOINT_INTERVAL = 7; // weekly recalibration
  const isCheckpoint = flags.USE_RECALIBRATION && isCheckpointDay(currentDay, CHECKPOINT_INTERVAL);

  // Detect week completion and set pending weekly check-in
  useEffect(() => {
    if (currentDay > 0 && currentDay % 7 === 0) {
      const completedWeek = currentDay / 7;
      setPendingWeeklyCheckIn(completedWeek);
    }
  }, [currentDay]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch checkpoint data when it's a checkpoint day
  useEffect(() => {
    if (isCheckpoint && user && currentGoal) {
      const fetchCheckpointData = async () => {
        try {
          const goalId = (currentGoal as { id?: string }).id;
          if (!goalId) return;

          // Fetch the last sprint's feedback (weekly = 7 days)
          const recentFeedback = await getRecentFeedback(goalId, CHECKPOINT_INTERVAL);

          // Calculate performance metrics
          const completedCount = recentFeedback.filter(f => f.completion_status === 'completed').length;
          const totalTasks = CHECKPOINT_INTERVAL;
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

  const handleCheckpointComplete = async (weeklyCheckInAnswers?: {
    pacing: string;
    hardTopics: string;
    taskTypesFeedback: string;
    raw: string[];
  }): Promise<void> => {
    setIsRecalibrating(true);

    try {
      const goalId = (currentGoal as { id?: string }).id;
      if (!goalId || !roadmap) {
        throw new Error('Missing required data for checkpoint');
      }

      // Derive timeline and dailyTime from real store data
      const timelineDays = agentRoadmapV2?.totalDays
        ?? agentRoadmap?.roadmap?.totalDays
        ?? (roadmap.duration ? roadmap.duration * 7 : 90);
      const dailyMinutes = (() => {
        const raw = roadmap.dailyTime ?? '';
        const match = String(raw).match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 30;
      })();

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

      // Map stored tasks to feedback format
      const taskTitleByDay: Record<number, string> = {};
      for (const t of tasks) {
        if (t.dayNumber != null) taskTitleByDay[t.dayNumber] = t.title;
      }

      // Use V2 roadmap with weekly recalibration if available
      if (agentRoadmapV2) {
        const goalText = (currentGoal as { specificGoal?: string }).specificGoal || 'Continue your journey';
        const recentDays = 7;
        const recentFeedback = checkpointData?.recentFeedback ?? [];

        const taskFeedback = recentFeedback.map((f, i) => {
          const approxDay = currentDay - (recentDays - 1) + i;
          return {
            dayNumber: approxDay,
            title: taskTitleByDay[approxDay] ?? 'Task',
            difficultyRating: f.difficulty_score,
            completionTime: f.actual_duration_mins ?? dailyMinutes,
            userComment: f.user_comment,
            skipped: f.completion_status === 'skipped',
            skipReason: undefined,
          };
        });

        // ── Bayesian stone update ──
        // Nudge stone riskImpact based on this sprint's behavioral evidence.
        const sprintNumber = Math.ceil(currentDay / 7);
        // For resolution tracking, get the previous sprint's stone snapshot
        const prevHistory = stoneHistory.length > 0
          ? stoneHistory[stoneHistory.length - 1]
          : undefined;
        const updatedProfile = updateStoneSeverities(
          resolvedStoneProfile, taskFeedback, sprintNumber,
          { withEvolution: flags.DYNAMIC_STONE_EVOLUTION, prevHistory },
        );

        // Persist updated profile (Zustand sync, Supabase non-blocking)
        updateStoneProfile(updatedProfile);
        addStoneHistoryEntry({
          sprintNumber,
          updatedAt: new Date().toISOString(),
          stones: updatedProfile.stoneProfile.stones.map(s => ({
            type: s.type,
            riskImpact: s.riskImpact,
            severity: s.severity,
          })),
        });
        const roadmapId = (roadmap as unknown as Record<string, unknown> & { id?: string })?.id as string | undefined;
        if (roadmapId) {
          updateRoadmapStoneProfile(roadmapId, updatedProfile).catch(() => {/* non-critical */});
        }

        // Item 6 — load adaptive thresholds
        const thresholds = flags.ADAPTIVE_THRESHOLDS && roadmapId
          ? await loadThresholdAdjustments(roadmapId).catch(() => DEFAULT_THRESHOLDS)
          : DEFAULT_THRESHOLDS;

        // Compute signals locally to capture prevStatus for threshold nudging
        const signals = computeSignals(taskFeedback, dailyMinutes, thresholds);
        const prevStatus = signals.status;

        const result = await recalibrateWeek({
          context: { goal: goalText, timeline: timelineDays, dailyMinutes },
          roadmap: agentRoadmapV2,
          stoneProfile: updatedProfile,
          completedTasks: taskFeedback,
          currentDay,
          weekNumber: Math.ceil(currentDay / 7),
          weeklyCheckInAnswers,
          thresholds,
        });

        // If stone evolution produced an updated profile, apply it now (overrides updateStoneSeverities above)
        if (result.evolvedStoneProfile) {
          updateStoneProfile(result.evolvedStoneProfile);
          addStoneHistoryEntry({
            sprintNumber,
            updatedAt: new Date().toISOString(),
            stones: result.evolvedStoneProfile.stoneProfile.stones.map(s => ({
              type: s.type,
              riskImpact: s.riskImpact,
              severity: s.severity,
            })),
          });
          if (roadmapId) {
            updateRoadmapStoneProfile(roadmapId, result.evolvedStoneProfile).catch(() => {});
          }
        }

        // Update the store with the new week plan
        const nextWeekNumber = Math.ceil(currentDay / 7) + 1;
        const newWeek: WeekPlan = {
          ...result.recalibratedWeek,
          week: nextWeekNumber,
          status: 'current',
          recalibratedFrom: Math.ceil(currentDay / 7),
        };
        updateWeek(nextWeekNumber, newWeek);

        // Item 6 — persist nudged thresholds (non-blocking)
        if (flags.ADAPTIVE_THRESHOLDS && roadmapId) {
          const newAdj = adaptThresholds(prevStatus, signals, thresholds);
          saveThresholdAdjustments(roadmapId, newAdj).catch(() => {});
        }

        // Item 8 — embed and save sprint memory (non-blocking)
        if (flags.USE_AGENT_MEMORY && user?.id && roadmapId) {
          (async () => {
            try {
              const { snapshot } = await compress(taskFeedback, updatedProfile).catch(() => ({ snapshot: null }));
              const content = snapshot?.summaryNarrative
                ?? `Sprint ${sprintNumber}: ${signals.completionRate.toFixed(0)}% completion. Status: ${signals.status}.`;
              await embedAndSaveSprintMemory(user.id!, roadmapId!, sprintNumber, content, {
                completionRate: signals.completionRate,
                status: signals.status,
                weekRange: `Days ${currentDay - 6}–${currentDay}`,
              });
            } catch { /* non-fatal */ }
          })();
        }

        setPendingWeeklyCheckIn(null);

        track({
          event: 'checkpoint_completed',
          properties: { day: currentDay, completed_tasks: checkpointData?.completedTasks ?? 0, avg_difficulty: checkpointData?.avgDifficulty ?? 3 },
        });

        setRecalibrationResult({
          coachMessage:    result.recalibratedWeek.personalizedMessage,
          nextSprintFocus: result.checkpointAnalysis.nextSprintFocus,
          stoneDirective:  resolvedStoneProfile.stoneProfile.primaryStone,
        });

        setIsRecalibrating(false);
        return;
      }

      // Legacy path — use old 14-day sprint recalibration if V2 roadmap not available
      if (!checkpointData) throw new Error('Missing checkpoint data for legacy path');

      const taskFeedback = checkpointData.recentFeedback.map((f, i) => {
        const approxDay = currentDay - 13 + i;
        return {
          dayNumber: approxDay,
          title: taskTitleByDay[approxDay] ?? 'Task',
          difficultyRating: f.difficulty_score,
          completionTime: f.actual_duration_mins ?? dailyMinutes,
          userComment: f.user_comment,
          skipped: f.completion_status === 'skipped',
          skipReason: undefined,
        };
      });

      const resolvedRoadmap = agentRoadmap?.roadmap
        ?? ((roadmap.strategicPlan || roadmap) as unknown as import('@types-app/agents').Roadmap);

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
      }));

      setTasks(convertedTasks);

      const adjustedPhase = result.analysis.recalibratedSprint.adjustedPhase;
      const pedChanges = result.analysis.recalibratedSprint.pedagogicalChanges;
      if (adjustedPhase || pedChanges) {
        updateAgentRoadmap((prev) => {
          const updated = { ...prev, roadmap: { ...prev.roadmap, phases: [...prev.roadmap.phases] } };
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
      track({ event: 'recalibration_accepted', properties: { day: currentDay, mode: checkpointData.avgDifficulty < 2.5 ? 'simplify' : 'extend' } });

      setRecalibrationResult({
        coachMessage:    result.analysis.recalibratedSprint.personalizedMessage,
        nextSprintFocus: result.analysis.checkpointAnalysis.nextSprintFocus,
        stoneDirective:  resolvedStoneProfile.stoneProfile.primaryStone,
      });

      setIsRecalibrating(false);
    } catch (error) {
      console.error('Checkpoint failed:', error);
      setRecalibrationError('Failed to recalibrate roadmap. Please try again.');
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
    recalibrationError,
    clearRecalibrationError: () => setRecalibrationError(null),
    handleCheckpointComplete,
    triggerEarlyRecalibration,
  };
}
