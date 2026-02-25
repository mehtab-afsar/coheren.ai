import { useState, useEffect } from 'react';
import { useStore, type Task } from '@core/store/useStore';
import { getRecentFeedback } from '@lib/database';
import { track } from '@lib/analytics';
import { handleCheckpoint } from '@core/agents/orchestrator';
import { isCheckpointDay } from '@lib/checkpointHelpers';
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

  const currentDay = useStore((state) => state.currentDay);
  const user = useStore((state) => state.user);
  const currentGoal = useStore((state) => state.currentGoal);
  const roadmap = useStore((state) => state.roadmap);
  const setTasks = useStore((state) => state.setTasks);

  const isCheckpoint = isCheckpointDay(currentDay, 14);

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

      // Convert recent feedback to Agent 5 format
      const taskFeedback = checkpointData.recentFeedback.map((f) => ({
        dayNumber: currentDay - 13 + checkpointData.recentFeedback.indexOf(f), // Approximate day number
        title: 'Task', // We don't have task titles in feedback table
        difficultyRating: f.difficulty_score,
        completionTime: f.actual_duration_mins,
        userComment: f.user_comment,
        skipped: f.completion_status === 'skipped',
        skipReason: undefined
      }));

      // Minimal stone profile — TODO: load real Agent2ProfileOutput from store/DB
      const stoneProfile: Agent2ProfileOutput = {
        stoneProfile: {
          userArchetype: 'Unknown',
          primaryStone: 'Inconsistency',
          stones: [],
          agent3Guidance: [],
          agent5Note: '',
          confidence: 0,
        }
      };

      // Run Agent 5 checkpoint analysis
      const result = await handleCheckpoint(
        (currentGoal as { specificGoal?: string }).specificGoal || 'Continue your journey',
        90, // Default timeline
        30, // Default daily time
        (roadmap.strategicPlan || roadmap) as unknown as import('@types-app/agents').Roadmap,
        stoneProfile,
        taskFeedback as unknown as Task[],
        currentDay,
        {
          userId: user!.id,
          goalId: goalId,
          supabase: undefined // Supabase client will be used from the orchestrator
        }
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

      track({
        event: 'checkpoint_completed',
        properties: { day: currentDay, completed_tasks: checkpointData.completedTasks, avg_difficulty: checkpointData.avgDifficulty },
      });

      // Surface the Agent 5 result in the UI (replaces the alert)
      setRecalibrationResult({
        coachMessage:    result.analysis.recalibratedSprint.personalizedMessage,
        nextSprintFocus: result.analysis.checkpointAnalysis.nextSprintFocus,
        // stoneDirective will be added when real stone profile is loaded from DB
      });

      setIsRecalibrating(false);
    } catch (error) {
      console.error('Checkpoint failed:', error);
      alert('Failed to recalibrate roadmap. Please try again.');
      setIsRecalibrating(false);
    }
  };

  return {
    checkpointData,
    isRecalibrating,
    recalibrationResult,
    handleCheckpointComplete,
  };
}
