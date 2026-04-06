/**
 * useStreamingTask
 *
 * Returns streaming preview state for a given day number.
 * Used by TodayView to show a typewriter description while Agent 4 generates the full task.
 *
 * Usage:
 *   const { isStreaming, streamingText, task } = useStreamingTask(currentDay);
 *   if (isStreaming) render streamingText with a cursor; else render task normally.
 */

import { useStore } from '@core/store/useStore';

export function useStreamingTask(dayNumber: number) {
  const streamingText = useStore(s => s.streamingTaskDescription);
  const task = useStore(s => s.tasks.find(t => t.day === dayNumber));
  const isPlaceholder = task?.id === `placeholder-day-${dayNumber}`;

  return {
    isStreaming: isPlaceholder && streamingText !== null,
    streamingText: streamingText ?? '',
    task,
  };
}
