import { useState } from 'react';
import type { TaskFeedback } from '@features/dashboard/components/TaskFeedbackModal';
import { track } from '@lib/analytics';
import { useStore } from '@core/store/useStore';

export function useTaskActions(
  completeTask: (id: string) => Promise<void>,
  skipTask: (id: string, reason?: 'time' | 'health' | 'difficulty' | 'external') => Promise<void>,
  setTaskFeedback: (taskId: string, difficultyRating: number, feedbackTags?: string[], userComment?: string, actualDuration?: number) => Promise<void>
) {
  const currentDay = useStore((s) => s.currentDay);
  const tasks = useStore((s) => s.tasks);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [skippingTaskId, setSkippingTaskId] = useState<string | null>(null);
  const [skipReasonTaskId, setSkipReasonTaskId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [showSkipMessage, setShowSkipMessage] = useState(false);
  const [pendingFeedbackTaskId, setPendingFeedbackTaskId] = useState<string | null>(null);

  const handleCompleteTask = (taskId: string, sourceX?: number, sourceY?: number) => {
    // Guard against double-submit: a fast double-tap fires this twice before the
    // task's `completed` flag flips (the async DB write hasn't resolved), causing
    // duplicate completion + streak writes. Bail if this task is already completing
    // or already done.
    const target = tasks.find((t) => t.id === taskId);
    if (!target || target.completed || completingTaskId === taskId) return;

    const x = sourceX ?? window.innerWidth / 2;
    const y = sourceY ?? window.innerHeight / 2;

    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: `${taskId}-${i}-${Date.now()}`,
      x, y,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setCompletingTaskId(taskId);

    completeTask(taskId);
    const completedTask = tasks.find((t) => t.id === taskId);
    track({ event: 'task_completed', properties: { task_id: taskId, task_type: completedTask?.type, day: currentDay } });
    setTimeout(() => setCompletingTaskId(null), 450);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !p.id.startsWith(taskId)));
    }, 1900);
    // Show feedback modal after particles settle
    setTimeout(() => setPendingFeedbackTaskId(taskId), 600);
  };

  const submitFeedback = (taskId: string, feedback: TaskFeedback) => {
    setPendingFeedbackTaskId(null);
    setTaskFeedback(taskId, feedback.difficultyRating, feedback.feedbackTags, feedback.userComment, feedback.actualDuration);
    track({ event: 'task_feedback_submitted', properties: { task_id: taskId, difficulty: feedback.difficultyRating } });
  };

  const dismissFeedback = () => setPendingFeedbackTaskId(null);

  const handleSkipTask = (taskId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSkipReasonTaskId(prev => prev === taskId ? null : taskId);
  };

  const confirmSkip = (
    taskId: string,
    reason: 'time' | 'health' | 'difficulty' | 'external',
    setCinemaTaskId: (id: string | null) => void
  ) => {
    setSkipReasonTaskId(null);
    setCinemaTaskId(null);
    setSkippingTaskId(taskId);
    setTimeout(() => {
      skipTask(taskId, reason);
      track({ event: 'task_skipped', properties: { task_id: taskId, reason, day: currentDay } });
      setSkippingTaskId(null);
      setShowSkipMessage(true);
      setTimeout(() => setShowSkipMessage(false), 3000);
    }, 300);
  };

  return {
    completingTaskId,
    skippingTaskId,
    skipReasonTaskId,
    setSkipReasonTaskId,
    particles,
    showSkipMessage,
    pendingFeedbackTaskId,
    submitFeedback,
    dismissFeedback,
    handleCompleteTask,
    handleSkipTask,
    confirmSkip,
  };
}
