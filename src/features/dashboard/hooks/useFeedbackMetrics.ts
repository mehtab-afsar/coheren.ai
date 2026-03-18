import { useMemo } from 'react';
import { useStore, type Task } from '@core/store/useStore';

export interface FeedbackMetrics {
  difficultyTrend: { week: number; avg: number }[];
  taskTypeBreakdown: { type: string; count: number; completed: number }[];
  skipPatterns: { reason: string; count: number }[];
  consistencyScore: number; // 0–100, % of days with ≥1 completed task
  weekOverWeek: { metric: string; thisWeek: number; lastWeek: number; change: number }[];
  topFeedbackTags: { tag: string; count: number }[];
}

export function useFeedbackMetrics(): FeedbackMetrics {
  const tasks = useStore(s => s.tasks);
  const currentDay = useStore(s => s.currentDay);

  return useMemo(() => {
    const currentWeek = Math.ceil(currentDay / 7);

    // ── Difficulty Trend ──
    const weekDifficulties = new Map<number, number[]>();
    tasks.forEach(t => {
      if (t.difficultyRating && t.completed) {
        const w = Math.ceil((t.dayNumber ?? t.day) / 7);
        const arr = weekDifficulties.get(w) ?? [];
        arr.push(t.difficultyRating);
        weekDifficulties.set(w, arr);
      }
    });
    const difficultyTrend = Array.from(weekDifficulties.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([week, ratings]) => ({
        week,
        avg: Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10,
      }));

    // ── Task Type Breakdown ──
    const typeMap = new Map<string, { count: number; completed: number }>();
    tasks.forEach(t => {
      const entry = typeMap.get(t.type) ?? { count: 0, completed: 0 };
      entry.count++;
      if (t.completed) entry.completed++;
      typeMap.set(t.type, entry);
    });
    const taskTypeBreakdown = Array.from(typeMap.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count);

    // ── Skip Patterns ──
    const skipMap = new Map<string, number>();
    tasks.forEach(t => {
      if (t.skipped && t.skipReason) {
        skipMap.set(t.skipReason, (skipMap.get(t.skipReason) ?? 0) + 1);
      }
    });
    const skipPatterns = Array.from(skipMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // ── Consistency Score ──
    const daysWithCompletion = new Set<number>();
    tasks.forEach(t => {
      if (t.completed) daysWithCompletion.add(t.dayNumber ?? t.day);
    });
    const totalActiveDays = Math.max(1, currentDay);
    const consistencyScore = Math.round((daysWithCompletion.size / totalActiveDays) * 100);

    // ── Week Over Week ──
    const thisWeekTasks = tasks.filter(t => Math.ceil((t.dayNumber ?? t.day) / 7) === currentWeek);
    const lastWeekTasks = tasks.filter(t => Math.ceil((t.dayNumber ?? t.day) / 7) === currentWeek - 1);

    const calcCompletion = (arr: Task[]) => arr.length > 0 ? Math.round((arr.filter(t => t.completed).length / arr.length) * 100) : 0;
    const calcAvgDifficulty = (arr: Task[]) => {
      const rated = arr.filter(t => t.difficultyRating);
      return rated.length > 0 ? Math.round((rated.reduce((s, t) => s + (t.difficultyRating ?? 0), 0) / rated.length) * 10) / 10 : 0;
    };

    const thisCompletion = calcCompletion(thisWeekTasks);
    const lastCompletion = calcCompletion(lastWeekTasks);
    const thisDifficulty = calcAvgDifficulty(thisWeekTasks);
    const lastDifficulty = calcAvgDifficulty(lastWeekTasks);

    const weekOverWeek = [
      { metric: 'Completion', thisWeek: thisCompletion, lastWeek: lastCompletion, change: thisCompletion - lastCompletion },
      { metric: 'Avg Difficulty', thisWeek: thisDifficulty, lastWeek: lastDifficulty, change: Math.round((thisDifficulty - lastDifficulty) * 10) / 10 },
    ];

    // ── Feedback Tags ──
    const tagMap = new Map<string, number>();
    tasks.forEach(t => {
      if (t.feedbackTags) {
        t.feedbackTags.forEach(tag => tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1));
      }
    });
    const topFeedbackTags = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      difficultyTrend,
      taskTypeBreakdown,
      skipPatterns,
      consistencyScore,
      weekOverWeek,
      topFeedbackTags,
    };
  }, [tasks, currentDay]);
}
