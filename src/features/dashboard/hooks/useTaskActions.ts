import { useState } from 'react';

export function useTaskActions(
  completeTask: (id: string) => Promise<void>,
  skipTask: (id: string, reason?: 'time' | 'health' | 'difficulty' | 'external') => Promise<void>
) {
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [skippingTaskId, setSkippingTaskId] = useState<string | null>(null);
  const [skipReasonTaskId, setSkipReasonTaskId] = useState<string | null>(null);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const [showSkipMessage, setShowSkipMessage] = useState(false);

  const handleCompleteTask = (taskId: string, sourceX?: number, sourceY?: number) => {
    const x = sourceX ?? window.innerWidth / 2;
    const y = sourceY ?? window.innerHeight / 2;

    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: `${taskId}-${i}-${Date.now()}`,
      x, y,
    }));
    setParticles(prev => [...prev, ...newParticles]);
    setCompletingTaskId(taskId);

    completeTask(taskId);
    setTimeout(() => setCompletingTaskId(null), 450);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !p.id.startsWith(taskId)));
    }, 1900);
  };

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
    handleCompleteTask,
    handleSkipTask,
    confirmSkip,
  };
}
