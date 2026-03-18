/**
 * useCoachMessages
 *
 * Manages a chronological list of AI coach messages persisted in localStorage.
 * Generates new messages based on triggers: app open, task completion, streaks,
 * plan recalibration, and first-week onboarding.
 */

import { useCallback } from 'react';

export interface CoachMessage {
  id: string;
  type: 'daily_brief' | 'task_complete' | 'streak_milestone' | 'plan_adjustment' | 'pattern_observation' | 'intro';
  text: string;
  timestamp: string; // ISO string
  read: boolean;
}

const STORAGE_KEY = 'coheren-coach-messages';
const MAX_MESSAGES = 50;

function loadMessages(): CoachMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: CoachMessage[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)));
  } catch { /* ignore */ }
}

export function useCoachMessages() {
  const getMessages = useCallback((): CoachMessage[] => loadMessages(), []);

  const addMessage = useCallback((
    type: CoachMessage['type'],
    text: string,
  ): CoachMessage => {
    const msg: CoachMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      text,
      timestamp: new Date().toISOString(),
      read: false,
    };
    const existing = loadMessages();
    saveMessages([...existing, msg]);
    return msg;
  }, []);

  const markAllRead = useCallback(() => {
    const msgs = loadMessages().map(m => ({ ...m, read: true }));
    saveMessages(msgs);
  }, []);

  const clearMessages = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  /** Generate intro messages for day 1 users (called once on first open). */
  const generateIntroMessages = useCallback((goalTitle: string) => {
    const existing = loadMessages();
    if (existing.some(m => m.type === 'intro')) return; // already generated
    const msgs: Array<{ type: CoachMessage['type']; text: string }> = [
      {
        type: 'intro',
        text: `Welcome. I've built your personalised ${goalTitle} plan — it's designed around how you actually think and work, not a generic template.`,
      },
      {
        type: 'intro',
        text: `Each day I'll brief you on what to focus on and why. After you complete tasks, tell me how they felt — that's how I'll keep calibrating.`,
      },
      {
        type: 'intro',
        text: `Start with today's first task. Don't overthink it — the plan is already optimised for you.`,
      },
    ];
    const now = Date.now();
    const newMsgs: CoachMessage[] = msgs.map((m, i) => ({
      id: `intro-${i}`,
      type: m.type,
      text: m.text,
      timestamp: new Date(now + i * 500).toISOString(),
      read: false,
    }));
    saveMessages([...existing, ...newMsgs]);
  }, []);

  /** Generate a daily brief for today's first task. */
  const generateDailyBrief = useCallback((taskTitle: string, currentDay: number) => {
    const key = `coach_daily_${currentDay}`;
    try {
      if (localStorage.getItem(key)) return; // already sent today
      localStorage.setItem(key, '1');
    } catch { /* ignore */ }
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    addMessage('daily_brief', `${greeting}. Today's focus: "${taskTitle}". Stay with the plan.`);
  }, [addMessage]);

  /** Generate a message after task completion with specific data. */
  const generateTaskComplete = useCallback((
    completedCount: number,
    totalMinutes: number,
    dayOfWeek: string,
  ) => {
    const texts: Record<number, string> = {
      1: `First task done. ${totalMinutes} minutes in. Keep the momentum going.`,
      3: `3 tasks, ${totalMinutes} minutes — that's a productive ${dayOfWeek}.`,
      5: `5 tasks completed today. You're building something real here.`,
    };
    const text = texts[completedCount]
      ?? `${completedCount} tasks done, ${totalMinutes} minutes invested. Consistent beats perfect.`;
    addMessage('task_complete', text);
  }, [addMessage]);

  /** Generate a streak milestone message. */
  const generateStreakMessage = useCallback((streak: number) => {
    const key = `coach_streak_${streak}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* ignore */ }
    const msgs: Record<number, string> = {
      3:  'Three days in a row. Most people quit before this. You didn\'t.',
      7:  'One full week. Your brain is starting to rewire around this habit.',
      14: 'Two weeks consistent. I\'m adjusting your plan to match your pace.',
      30: '30 days. This is who you are now.',
    };
    const text = msgs[streak] ?? `${streak}-day streak. Remarkable consistency.`;
    addMessage('streak_milestone', text);
  }, [addMessage]);

  /** Generate a message after plan recalibration. */
  const generatePlanAdjustment = useCallback((summary: string) => {
    addMessage('plan_adjustment', summary);
  }, [addMessage]);

  /** Generate data-driven pattern observation (called once per day max). */
  const generatePatternObservation = useCallback((metrics: {
    consistencyScore: number;
    skipPatterns: { reason: string; count: number }[];
    difficultyTrend: { week: number; avg: number }[];
    taskTypeBreakdown: { type: string; count: number; completed: number }[];
    weekOverWeek: { metric: string; change: number }[];
  }, currentDay: number, streak: number) => {
    const key = `coach_pattern_${currentDay}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
    } catch { /* ignore */ }

    // Pick the most relevant observation
    const observations: string[] = [];

    // Skip pattern insight
    if (metrics.skipPatterns.length > 0) {
      const topSkip = metrics.skipPatterns[0];
      const skipLabels: Record<string, string> = {
        time: 'time constraints', health: 'energy/health', difficulty: 'difficulty', external: 'external factors',
      };
      observations.push(
        `I've noticed "${skipLabels[topSkip.reason] ?? topSkip.reason}" is your top skip reason (${topSkip.count}x). ${
          topSkip.reason === 'time' ? 'Try doing just the first step on busy days — partial completion still counts.'
          : topSkip.reason === 'difficulty' ? 'I\'ll adjust upcoming tasks to match your current level better.'
          : topSkip.reason === 'health' ? 'Listen to your body. Rest days are part of the plan, not a failure.'
          : 'External factors happen. The key is showing up the next day.'
        }`
      );
    }

    // Difficulty trend
    if (metrics.difficultyTrend.length >= 2) {
      const latest = metrics.difficultyTrend[metrics.difficultyTrend.length - 1];
      const prev = metrics.difficultyTrend[metrics.difficultyTrend.length - 2];
      if (latest.avg > prev.avg + 0.5) {
        observations.push(`Difficulty is trending up (${prev.avg.toFixed(1)} → ${latest.avg.toFixed(1)}). That means the curriculum is challenging you appropriately — growth happens at the edge of comfort.`);
      } else if (latest.avg < prev.avg - 0.5) {
        observations.push(`Tasks felt easier this week (${latest.avg.toFixed(1)} vs ${prev.avg.toFixed(1)} last week). You're building mastery. Time to push a bit harder.`);
      }
    }

    // Consistency insight
    if (metrics.consistencyScore >= 80 && streak >= 5) {
      observations.push(`${metrics.consistencyScore}% consistency with a ${streak}-day streak. You're in the top tier of learners. This habit is becoming automatic.`);
    } else if (metrics.consistencyScore < 40 && currentDay > 7) {
      observations.push(`Your consistency is at ${metrics.consistencyScore}%. That's okay — the goal isn't perfection. Try committing to just the first step each day. Small wins compound.`);
    }

    // Completion change week-over-week
    const completionWoW = metrics.weekOverWeek.find(w => w.metric === 'Completion');
    if (completionWoW && Math.abs(completionWoW.change) >= 15) {
      if (completionWoW.change > 0) {
        observations.push(`Completion rate jumped ${completionWoW.change}% from last week. Whatever you changed is working — keep it up.`);
      } else {
        observations.push(`Completion dipped ${Math.abs(completionWoW.change)}% from last week. No judgment — just notice what changed and adjust.`);
      }
    }

    // Task type skew
    const reflectionType = metrics.taskTypeBreakdown.find(t => t.type === 'reflection');
    if (reflectionType && reflectionType.count > 0 && reflectionType.completed === 0) {
      observations.push(`You haven't completed any reflection tasks yet. They're only 5 minutes — try one today. Reflection is how your brain consolidates what you've practiced.`);
    }

    if (observations.length > 0) {
      // Pick the most impactful observation (first one, based on priority order above)
      addMessage('pattern_observation', observations[0]);
    }
  }, [addMessage]);

  return {
    getMessages,
    addMessage,
    markAllRead,
    clearMessages,
    generateIntroMessages,
    generateDailyBrief,
    generateTaskComplete,
    generateStreakMessage,
    generatePlanAdjustment,
    generatePatternObservation,
  };
}
