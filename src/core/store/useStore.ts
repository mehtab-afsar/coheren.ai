import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingState, GoalCategory } from '@types-app/index.js';
import { generateTasksForDay, generateTasksFromAIPlan } from '@shared/utils/taskGenerator.js';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser } from '@lib/supabase';
import { updateTaskCompletion, updateTaskSkip, updateProfile, saveTaskFeedback, syncDailyTasksToDB, deleteUserData, calculateStreak } from '@lib/database';
import type { Agent3Output, Agent2ProfileOutput, DailyTask, TaskStep, AssessmentQuestion, AssessmentResult } from '@types-app/agents.js';
import { runTaskGenerator } from '@core/agents';
import { callEconomyStream } from '@lib/ai-router';
import type { StoneHistoryEntry } from '@lib/stoneUpdater';
import { generateFallbackTask } from '@core/agents/fallback-task-generator';
import { track } from '@lib/analytics';
import { flags } from '@config/feature-flags';
import { type BanditState, type BanditContext, type VariantArm, getInitialBanditState, selectVariant, recordSelection, computeReward, updateArm } from '@lib/bandit';

// ── New hierarchical roadmap types ──────────────────────────────────────────
/** Tracks what resource (video/article) was consumed on a given day.
 *  Used to give practice and retrieval tasks content-aware context. */
export interface ContentEntry {
  day:            number;
  resourceTitle:  string;
  resourceUrl:    string;
  topic:          string;   // day skeleton theme or phase goal
  timestamps?:    Record<string, string>;
  watchFrom?:     string;
  watchTo?:       string;
}

export interface WeekDay {
  day: number;       // absolute day number (1-indexed from goal start)
  weekDay: number;   // 1-7 within the week
  type: 'learning' | 'practice' | 'reflection' | 'challenge' | 'retrieval' | 'rest';
  title: string;
  theme: string;
  intensity: number; // 0-1
  focusArea: string;
}

export interface WeekPlan {
  week: number;      // absolute week number (1-indexed)
  title: string;     // e.g. "Basics of Python"
  theme: string;     // e.g. "Variables, types, basic I/O"
  startDay: number;
  endDay: number;
  status: 'completed' | 'current' | 'tentative' | 'locked';
  days: WeekDay[];   // populated for current + completed weeks; empty for tentative
  recalibratedFrom?: number; // which week's feedback generated this week
}

export interface MonthPlan {
  month: number;     // 1-indexed
  title: string;     // e.g. "Foundation"
  phaseName: string;
  startWeek: number;
  endWeek: number;
  startDay: number;
  endDay: number;
  primaryGoals: string[];
  scienceRationale: string;
  weeks: WeekPlan[];
}

export interface AgentRoadmapV2 {
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
  domainPedagogy: string;
  frameworkName: string;    // e.g. "Spaced Repetition — Ebbinghaus Method"
  frameworkReason: string;  // why chosen for this user's stones + domain
  frameworkScience: string; // 2-3 sentences from RAG knowledge base
  frameworkSources: Array<{ title: string; author: string; note: string }>;
  months: MonthPlan[];
  progressionCurve: Record<string, { intensity: number; volume: string }>;
  stoneModificationSummary: string;
  modifiers_from_stones: Record<string, { removed: string[]; added: string[]; modified: string[] }>;
}

export interface WeeklyCheckIn {
  weekNumber: number;
  completedAt: string;
  answers: {
    pacing: string;
    hardTopics: string;
    taskTypesFeedback: string;
    raw: string[];
  };
}
// ─────────────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'practice' | 'learning' | 'reflection' | 'challenge' | 'retrieval' | 'assessment';
  duration: number; // minutes (planned)
  completed: boolean;
  completedAt?: string;
  skipped: boolean;
  skippedAt?: string;
  skipReason?: 'time' | 'health' | 'difficulty' | 'external';
  rescheduledFrom?: number; // original day if rescheduled
  adjustedDifficulty?: 'easier' | 'same' | 'harder';
  scheduledFor: string;
  day: number;
  dayNumber?: number; // legacy support
  segments?: Array<{ label: string; duration: number; description: string; tip?: string }>;
  requiresPrep?: { items: string[]; note: string };
  steps?: string[]; // step-by-step instructions
  tips?: string[]; // helpful tips
  successCriteria?: string; // what success looks like
  resources?: {
    primary: {
      type: 'video' | 'article' | 'interactive' | 'image' | 'pdf' | 'tool' | 'playlist';
      title: string;
      url: string;
      platform?: string;
      channel?: string;
      duration?: string;
      thumbnail?: string;
      description: string;
      why: string;
      timestamps?: Record<string, string>;
      watchFrom?: string;
      watchTo?: string;
      watchMinutes?: number;
    } | null;
    supplementary?: Array<{
      type: 'video' | 'article' | 'interactive' | 'image' | 'pdf' | 'tool' | 'playlist';
      title: string;
      url: string;
      platform?: string;
      description: string;
      why: string;
    }>;
  };
  checkInTime?: string; // scheduled time
  coachTips?: string[];
  reflection?: string;
  // Agent 5 (Re-calibrator) feedback fields
  difficultyRating?: number; // 1-5 scale (1=easy, 5=very hard)
  actualDuration?: number; // actual minutes taken
  userComment?: string; // struggle notes or feedback
  feedbackTags?: string[]; // quick feedback tags (e.g., 'perfect_pace', 'physical_pain', 'confusing')
  // Assessment fields (for challenge/retrieval/assessment task types)
  assessmentQuestions?: AssessmentQuestion[];
  assessmentResults?: AssessmentResult[];
  retrievalInterval?: number; // days since content was first learned (spaced repetition)
  // Pre-generation fields (5.7)
  status?: 'active' | 'pregenerated';
  createdAt?: string; // ISO8601 — for stale detection
  // Speculative variant (Item 7)
  variant?: 'light' | 'standard' | 'deep';
}

interface WeekPerformance {
  weekNumber: number;
  completionRate: number;
  averageTasksPerDay: number;
  strugglingTasks: string[];
  easedTasks: string[];
  completedAt: string;
}

interface Roadmap {
  /** DB roadmap row id — used to recompute the authoritative streak from the calendar. */
  id?: string;
  title: string;
  category: GoalCategory;
  duration: number;
  dailyTime: string;
  recommendedTime: string;
  phases: Array<{
    title: string;
    weeks: string;
    description: string;
  }>;
  startDate: string;
  endDate: string;
  strategicPlan?: {
    totalWeeks: number;
    weekTemplates: Array<{
      weekNumber: number;
      focus: string;
      description: string;
    }>;
  }; // AI-generated strategic plan
}

interface AppStore extends OnboardingState {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;

  // Pre-auth goal from landing page
  initialGoal: string | null;
  setInitialGoal: (goal: string | null) => void;

  // App state
  checkInTime: string;
  roadmap: Roadmap | null;
  // Persisted agent data for ongoing task generation
  agentRoadmap: Agent3Output | null;
  agentRoadmapV2: AgentRoadmapV2 | null;
  weeklyCheckIns: WeeklyCheckIn[];
  pendingWeeklyCheckIn: number | null;
  stoneProfile: Agent2ProfileOutput | null;
  stoneHistory: StoneHistoryEntry[];
  tasks: Task[];
  currentDay: number;
  streak: number;
  completionRate: number;
  lastCheckInDate: string | null;
  performanceHistory: WeekPerformance[];

  // Auth actions
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;

  // Actions
  setStep: (step: number) => void;
  updateUniversalProfile: (data: Partial<OnboardingState['universalProfile']>) => void;
  updateCurrentGoal: (data: Partial<OnboardingState['currentGoal']>) => void;
  setGoalCategory: (category: GoalCategory) => void;
  setSpecificGoal: (goal: string) => void;
  setCheckInTime: (time: string) => void;
  setRoadmap: (roadmap: Roadmap) => void;
  setAgentData: (agentRoadmap: Agent3Output, stoneProfile: Agent2ProfileOutput) => void;
  updateStoneProfile: (updated: Agent2ProfileOutput) => void;
  addStoneHistoryEntry: (entry: StoneHistoryEntry) => void;
  updateAgentRoadmap: (updater: (roadmap: Agent3Output) => Agent3Output) => void;
  setAgentRoadmapV2: (roadmap: AgentRoadmapV2) => void;
  updateWeek: (weekNumber: number, updatedWeek: WeekPlan) => void;
  addWeeklyCheckIn: (checkIn: WeeklyCheckIn) => void;
  setPendingWeeklyCheckIn: (weekNumber: number | null) => void;
  setTasks: (tasks: Task[]) => void;
  completeTask: (taskId: string) => Promise<void>;
  setTaskFeedback: (taskId: string, difficultyRating: number, feedbackTags?: string[], userComment?: string, actualDuration?: number) => Promise<void>;
  skipTask: (taskId: string, reason?: 'time' | 'health' | 'difficulty' | 'external') => Promise<void>;
  canAdvanceDay: () => boolean;
  advanceDay: () => boolean;
  /** Recompute currentDay from the calendar (roadmap.startDate). The single writer of currentDay besides boot. */
  syncCalendarDay: () => void;
  generateNextDayTasks: () => void;
  pregenerateTasksForDay: (day: number) => Promise<void>;
  /** Speculative variant selection — keyed by day number (Item 7). */
  selectedVariants: Record<number, 'light' | 'standard' | 'deep'>;
  selectTaskVariant: (day: number, variant: 'light' | 'standard' | 'deep') => void;
  /** Thompson Sampling bandit state — tracks Beta distributions per context. */
  banditState: BanditState;
  /** Call after task feedback is submitted to update the bandit arm. */
  updateBanditFeedback: (taskId: string, completed: boolean, difficultyRating: number) => void;
  /** Log of resources (videos/articles) consumed per day — used for content-aware practice. */
  contentLog: Record<number, ContentEntry>;
  logContent: (day: number, entry: ContentEntry) => void;
  /** Transient: streaming preview description while Agent 4 generates. Null = not streaming. */
  streamingTaskDescription: string | null;
  setStreamingTaskDescription: (text: string | null) => void;
  completeAssessment: (taskId: string, results: AssessmentResult[]) => void;
  trackWeekPerformance: () => void;
  resetOnboarding: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Auth state
      user: null,
      isAuthenticated: false,

      // Pre-auth goal from landing page
      initialGoal: null,
      setInitialGoal: (goal) => set({ initialGoal: goal }),

      // App state
      step: 0,
      universalProfile: {},
      currentGoal: {},
      checkInTime: '07:00',
      roadmap: null,
      agentRoadmap: null,
      agentRoadmapV2: null,
      weeklyCheckIns: [],
      pendingWeeklyCheckIn: null,
      stoneProfile: null,
      stoneHistory: [],
      tasks: [],
      currentDay: 1,
      streak: 0,
      completionRate: 0,
      lastCheckInDate: null,
      performanceHistory: [],

      // Auth actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),

      checkAuth: async () => {
        const user = await getCurrentUser();
        set({ user, isAuthenticated: !!user });
      },

      setStep: (step) => set({ step }),

      updateUniversalProfile: (data) =>
        set((state) => ({
          universalProfile: { ...state.universalProfile, ...data }
        })),

      updateCurrentGoal: (data) =>
        set((state) => ({
          currentGoal: { ...state.currentGoal, ...data }
        })),

      setGoalCategory: (category) =>
        set((state) => ({
          currentGoal: { ...state.currentGoal, category }
        })),

      setSpecificGoal: (goal) =>
        set((state) => ({
          currentGoal: { ...state.currentGoal, specificGoal: goal }
        })),

      setCheckInTime: (time) => set({ checkInTime: time }),

      setRoadmap: (roadmap) => set({ roadmap }),

      setAgentData: (agentRoadmap, stoneProfile) => set({ agentRoadmap, stoneProfile }),

      updateStoneProfile: (updated) => set({ stoneProfile: updated }),

      addStoneHistoryEntry: (entry) => set(s => ({ stoneHistory: [...s.stoneHistory, entry] })),

      updateAgentRoadmap: (updater) => set((state) => {
        if (!state.agentRoadmap) return state;
        return { agentRoadmap: updater(state.agentRoadmap) };
      }),

      setAgentRoadmapV2: (roadmap: AgentRoadmapV2) => set({ agentRoadmapV2: roadmap }),

      updateWeek: (weekNumber: number, updatedWeek: WeekPlan) =>
        set((state) => {
          if (!state.agentRoadmapV2) return state;
          const months = state.agentRoadmapV2.months.map(m => ({
            ...m,
            weeks: m.weeks.map(w => w.week === weekNumber ? { ...updatedWeek } : w),
          }));
          return { agentRoadmapV2: { ...state.agentRoadmapV2, months } };
        }),

      addWeeklyCheckIn: (checkIn: WeeklyCheckIn) =>
        set((state) => ({ weeklyCheckIns: [...state.weeklyCheckIns, checkIn] })),

      setPendingWeeklyCheckIn: (weekNumber: number | null) =>
        set({ pendingWeeklyCheckIn: weekNumber }),

      setTasks: (tasks) => set({ tasks }),

      completeTask: async (taskId) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);

        // Only sync to DB if taskId is a valid UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);

        if (state.user && task && isUUID) {
          try {
            await updateTaskCompletion(
              taskId,
              true,
              task.difficultyRating,
              task.actualDuration,
              task.userComment,
              task.feedbackTags
            );
          } catch (error) {
            console.error('Failed to sync task to Supabase:', error);
          }
        }

        set((state) => {
          const tasks = state.tasks.map((task) =>
            task.id === taskId
              ? { ...task, completed: true, completedAt: new Date().toISOString() }
              : task
          );

          const todaysTasks = tasks.filter((t) => t.day === state.currentDay);
          const completedToday = todaysTasks.filter((t) => t.completed).length;
          const completionRate = todaysTasks.length > 0
            ? (completedToday / todaysTasks.length) * 100
            : 0;

          // NOTE: streak is NOT incremented here. It is calendar-based and the DB
          // (calculateStreak) is the single source of truth — recomputed below.
          return { tasks, completionRate };
        });

        // Recompute the authoritative, calendar-based streak from the DB.
        const post = get();
        const roadmapId = post.roadmap?.id;
        const todaysTasks = post.tasks.filter((t) => t.day === post.currentDay);
        const allDone = todaysTasks.length > 0 && todaysTasks.every((t) => t.completed);
        if (allDone && roadmapId) {
          try {
            const freshStreak = await calculateStreak(roadmapId);
            const prevStreak = post.streak;
            set({ streak: freshStreak });

            if (freshStreak > prevStreak && ([7, 14, 30, 60] as number[]).includes(freshStreak)) {
              track({ event: 'streak_milestone', properties: { streak: freshStreak, milestone: freshStreak as 7 | 14 | 30 | 60 } });
            }
            if (post.user && freshStreak !== prevStreak) {
              updateProfile(post.user.id, {
                persona_traits: {
                  ...(post.universalProfile as Record<string, unknown>),
                  streak: freshStreak,
                  lastCheckIn: new Date().toISOString(),
                },
              }).catch(err => console.error('Failed to update streak:', err));
            }
          } catch (err) {
            console.error('Failed to recompute streak:', err);
          }
        }
      },

      setTaskFeedback: async (taskId, difficultyRating, feedbackTags, userComment, actualDuration) => {
        // Update task in store
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, difficultyRating, feedbackTags, userComment, actualDuration }
              : t
          ),
        }));

        // Update bandit arm with reward signal from this feedback
        {
          const feedbackState = get();
          const feedbackTask = feedbackState.tasks.find(t => t.id === taskId);
          if (feedbackTask?.variant) {
            const ctx: BanditContext = {
              domain: (feedbackState.currentGoal as { category?: string }).category ?? 'general',
              primaryStone: feedbackState.stoneProfile?.stoneProfile?.primaryStone ?? 'unknown',
              dayOfWeek: feedbackTask.scheduledFor
                ? new Date(feedbackTask.scheduledFor + 'T00:00:00').getDay()
                : new Date().getDay(),
            };
            const reward = computeReward(feedbackTask.completed, difficultyRating);
            set({ banditState: updateArm(feedbackState.banditState, ctx, feedbackTask.variant as VariantArm, reward) });
          }
        }

        const state = get();
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
        if (!state.user || !isUUID) return;

        try {
          // Update difficulty_rating on the daily_tasks row
          await updateTaskCompletion(taskId, true, difficultyRating, actualDuration, userComment, feedbackTags);

          // Write to task_feedback table (used by checkpoint recalibration)
          const goalId = (state.currentGoal as { id?: string }).id;
          if (goalId) {
            await saveTaskFeedback(taskId, state.user.id, goalId, {
              difficultyScore: difficultyRating,
              actualDurationMins: actualDuration,
              feedbackTags,
              userComment,
              completionStatus: 'completed',
            });
          }
        } catch (err) {
          console.error('Failed to save task feedback:', err);
        }
      },

      skipTask: async (taskId, reason) => {
        const state = get();

        // Only sync to DB if taskId is a valid UUID (rolling-curriculum tasks use "task-N-M" format)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);

        if (state.user && reason && isUUID) {
          try {
            await updateTaskSkip(taskId, reason);
          } catch (error) {
            console.error('Failed to sync skip to Supabase:', error);
          }
        }

        set((state) => {
          const skippedTask = state.tasks.find((t) => t.id === taskId);
          if (!skippedTask) return state;

          // Mark task as skipped
          const tasks = state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  skipped: true,
                  skippedAt: new Date().toISOString(),
                  skipReason: reason
                }
              : task
          );

          // Calculate skip pattern to adjust tomorrow's task
          const recentTasks = state.tasks
            .filter((t) => t.day >= state.currentDay - 3 && t.day <= state.currentDay)
            .slice(-10);
          const skipCount = recentTasks.filter((t) => t.skipped).length;
          const skipRate = recentTasks.length > 0 ? skipCount / recentTasks.length : 0;

          // Adjust difficulty for tomorrow based on skip pattern
          let adjustmentLevel: 'easier' | 'same' | 'harder' = 'easier';
          if (skipRate > 0.3) {
            // High skip rate - make it significantly easier
            adjustmentLevel = 'easier';
          } else if (skipRate < 0.1 && state.completionRate > 80) {
            // Low skip rate and high completion - keep same
            adjustmentLevel = 'same';
          }

          // Find tomorrow's tasks and adjust them
          const tomorrowDay = state.currentDay + 1;
          const adjustedTasks = tasks.map((task) => {
            if (task.day === tomorrowDay && task.type === skippedTask.type) {
              // Adjust task difficulty
              const durationMultiplier = adjustmentLevel === 'easier' ? 0.7 : 1.0;
              return {
                ...task,
                duration: Math.max(10, Math.round(task.duration * durationMultiplier)),
                adjustedDifficulty: adjustmentLevel,
                rescheduledFrom: state.currentDay
              };
            }
            return task;
          });

          return { tasks: adjustedTasks };
        });
      },

      canAdvanceDay: () => {
        const state = get();

        // Only gate on task completion — allow multiple advances per calendar day
        // so users can click through all days in a single session (testing + streaks)
        const todaysTasks = state.tasks.filter((t) => t.day === state.currentDay);
        return todaysTasks.length > 0 && todaysTasks.every((t) => t.completed);
      },

      advanceDay: () => {
        const canAdvance = get().canAdvanceDay();

        if (!canAdvance) {
          return false;
        }

        const today = new Date().toISOString().split('T')[0];
        const state = get();

        // Track weekly performance when crossing a week boundary.
        // The day number itself is derived from the calendar (syncCalendarDay) —
        // never incremented by hand — so a reload can't fight it.
        const beforeWeek = Math.ceil(state.currentDay / 7);

        set({ lastCheckInDate: today, completionRate: 0 });
        get().syncCalendarDay();

        const afterWeek = Math.ceil(get().currentDay / 7);
        if (afterWeek > beforeWeek) {
          get().trackWeekPerformance();
        }

        // Generate the (new) current day's tasks if not present
        get().generateNextDayTasks();

        return true;
      },

      syncCalendarDay: () => {
        const state = get();
        const startDate = state.roadmap?.startDate;
        if (!startDate) return;
        // Total days is unit-ambiguous on roadmap.duration: the onboarding path stores
        // it in MONTHS while App.tsx's DB-load stores it in DAYS. agentRoadmapV2.totalDays
        // is always in days, so prefer it; otherwise treat small values (≤ 24) as months.
        const rawDur = state.roadmap?.duration ?? 0;
        const durationDays = state.agentRoadmapV2?.totalDays
          ?? (rawDur > 0 ? (rawDur <= 24 ? rawDur * 30 : rawDur) : 365);
        const daysSinceStart = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
        const calendarDay = Math.min(Math.max(daysSinceStart + 1, 1), durationDays);
        if (calendarDay !== state.currentDay) {
          set({ currentDay: calendarDay });
        }
      },

      completeAssessment: (taskId, results) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, assessmentResults: results, completed: true, completedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      trackWeekPerformance: () => {
        const state = get();
        const currentWeek = Math.ceil(state.currentDay / 7);

        // Get all tasks from the just-completed week
        const weekStartDay = (currentWeek - 1) * 7 + 1;
        const weekEndDay = currentWeek * 7;
        const weekTasks = state.tasks.filter(
          (t) => t.day >= weekStartDay && t.day <= weekEndDay
        );

        if (weekTasks.length === 0) return;

        const completedTasks = weekTasks.filter((t) => t.completed);
        const completionRate = (completedTasks.length / weekTasks.length) * 100;

        // Find struggling tasks (not completed)
        const strugglingTasks = weekTasks
          .filter((t) => !t.completed)
          .map((t) => t.type);

        // Find eased tasks (completed quickly or consistently)
        const easedTasks = completedTasks
          .filter((t) => t.type === 'reflection') // Reflection tasks are usually easiest
          .map((t) => t.type);

        const performance: WeekPerformance = {
          weekNumber: currentWeek,
          completionRate,
          averageTasksPerDay: weekTasks.length / 7,
          strugglingTasks: [...new Set(strugglingTasks)],
          easedTasks: [...new Set(easedTasks)],
          completedAt: new Date().toISOString()
        };

        set((state) => ({
          performanceHistory: [...state.performanceHistory, performance]
        }));
      },

      generateNextDayTasks: () => {
        const state = get();

        if (!state.roadmap) {
          return;
        }

        const nextDay = state.currentDay;

        // Check if Day N was already pre-generated — if so, just activate it (5.7)
        const pregenerated = state.tasks.find(
          t => t.day === nextDay && t.status === 'pregenerated'
        );
        if (pregenerated) {
          const STALE_MS = 48 * 60 * 60 * 1000;
          const isStale = pregenerated.createdAt
            ? Date.now() - new Date(pregenerated.createdAt).getTime() > STALE_MS
            : false;
          if (!isStale) {
            // Activate pre-generated task (change status to 'active')
            set(s => ({
              tasks: s.tasks.map(t =>
                t.id === pregenerated.id ? { ...t, status: 'active' } : t
              )
            }));
            return;
          }
          // Stale — remove it and fall through to regenerate
          set(s => ({ tasks: s.tasks.filter(t => t.id !== pregenerated.id) }));
        }

        // If we have full agent data AND AI agents are enabled, use Agent 4
        if (flags.USE_AI_AGENTS && state.agentRoadmap && state.stoneProfile) {
          const dailyMinutes = parseInt(state.roadmap.dailyTime) || 30;

          // Build previous task context for Agent 4 (PREVIOUSLY COVERED + difficulty signals)
          const recentCompleted = state.tasks
            .filter(t => (t.completed || t.skipped) && t.dayNumber && t.dayNumber < nextDay)
            .sort((a, b) => (b.dayNumber ?? 0) - (a.dayNumber ?? 0))
            .slice(0, 5);

          const previousTasksContext = recentCompleted.length > 0
            ? recentCompleted.map(t =>
                `- Day ${t.dayNumber}: "${t.title}"` +
                (t.completed ? ` ✓ completed` : ` ✗ skipped${t.skipReason ? ` (${t.skipReason})` : ''}`) +
                (t.difficultyRating ? ` | difficulty: ${t.difficultyRating}/5` : '') +
                (t.actualDuration ? ` | took ${t.actualDuration} min` : '')
              ).join('\n')
            : undefined;

          // Kick off Agent 4 async, optimistically add a placeholder task
          const goalText = (state.currentGoal as { specificGoal?: string }).specificGoal ?? undefined;
          const goalCategory = (state.currentGoal as { category?: string }).category ?? undefined;
          const skillLevel = (state.currentGoal as { skillLevel?: 'beginner' | 'intermediate' | 'advanced' }).skillLevel ?? 'beginner';

          // Build week content summary so practice/retrieval tasks reference real content
          const weekStartDay = Math.floor((nextDay - 1) / 7) * 7 + 1;
          const weekContentEntries = Object.values(state.contentLog)
            .filter(e => e.day >= weekStartDay && e.day < nextDay);
          const weekContentSummary = weekContentEntries.length > 0
            ? weekContentEntries.map(e => {
                const tsStr = e.timestamps && Object.keys(e.timestamps).length > 0
                  ? ` (key sections: ${Object.entries(e.timestamps).map(([k, v]) => `${v} — ${k}`).join(', ')})`
                  : e.watchFrom ? ` (watched ${e.watchFrom}–${e.watchTo ?? 'end'})` : '';
                return `Day ${e.day}: "${e.resourceTitle}"${tsStr} — topic: ${e.topic}`;
              }).join('\n')
            : undefined;

          // Item 7 — Speculative task variants: run 3 parallel Agent 4 calls
          if (flags.USE_TASK_VARIANTS) {
            const VARIANT_HINTS: Record<'light' | 'standard' | 'deep', string> = {
              light:    'Make this gentle and accessible. Shorter, lower cognitive load, 60–70% standard duration.',
              standard: '',
              deep:     'Make this challenging and comprehensive. More steps, 130–150% standard duration.',
            };
            ;(async () => {
              const variants = (['light', 'standard', 'deep'] as const);
              const results = await Promise.allSettled(
                variants.map(v => runTaskGenerator(nextDay, state.agentRoadmap!, state.stoneProfile!, dailyMinutes, previousTasksContext, goalText, goalCategory, skillLevel, VARIANT_HINTS[v], weekContentSummary))
              );
              const variantTasks: Task[] = [];
              for (let i = 0; i < variants.length; i++) {
                const r = results[i];
                if (r.status === 'fulfilled') {
                  const agentTask = r.value;
                  const assessmentData = agentTask as DailyTask & { assessmentQuestions?: AssessmentQuestion[]; taskType?: string };
                  variantTasks.push({
                    id: `agent-day-${nextDay}-${variants[i]}`,
                    title: agentTask.task.title,
                    description: agentTask.task.description,
                    type: (assessmentData.taskType as Task['type']) || 'practice',
                    duration: agentTask.task.estimatedMinutes,
                    completed: false,
                    skipped: false,
                    scheduledFor: new Date().toISOString().split('T')[0],
                    day: nextDay,
                    dayNumber: nextDay,
                    segments: agentTask.task.segments ?? [],
                    steps: agentTask.task.steps.map((s: TaskStep) => s.instruction),
                    tips: agentTask.task.tips,
                    successCriteria: agentTask.task.successCriteria.primary,
                    coachTips: agentTask.task.coachTips ?? [],
                    reflection: agentTask.task.reflection,
                    requiresPrep: agentTask.task.requiresPrep,
                    resources: agentTask.task.resources,
                    assessmentQuestions: assessmentData.assessmentQuestions,
                    variant: variants[i],
                  });
                }
              }
              get().setStreamingTaskDescription(null);
              if (variantTasks.length > 0) {
                // Thompson Sampling: pick the best arm for this context
                const currentState = get();
                const banditCtx: BanditContext = {
                  domain: (currentState.currentGoal as { category?: string }).category ?? 'general',
                  primaryStone: currentState.stoneProfile?.stoneProfile?.primaryStone ?? 'unknown',
                  dayOfWeek: new Date().getDay(),
                };
                const autoVariant = selectVariant(currentState.banditState, banditCtx);
                const updatedBandit = recordSelection(currentState.banditState, nextDay, autoVariant);
                set(s => ({
                  tasks: s.tasks
                    .filter(t => t.id !== `placeholder-day-${nextDay}`)
                    .concat(variantTasks),
                  selectedVariants: { ...s.selectedVariants, [nextDay]: autoVariant },
                  banditState: updatedBandit,
                }));
                // Log content for the auto-selected variant so practice tasks can reference it
                const selectedVariantTask = variantTasks.find(t => t.variant === autoVariant);
                const primaryRes = selectedVariantTask?.resources?.primary;
                if (primaryRes) {
                  const skeletonTheme = state.agentRoadmap?.roadmap?.phases
                    ?.flatMap(p => p.daySkeleton ?? [])
                    .find((_, i) => i === nextDay - 1)?.theme ?? goalText ?? '';
                  get().logContent(nextDay, {
                    day: nextDay,
                    resourceTitle: primaryRes.title,
                    resourceUrl: primaryRes.url,
                    topic: skeletonTheme,
                    timestamps: primaryRes.timestamps,
                    watchFrom: (primaryRes as { watchFrom?: string }).watchFrom,
                    watchTo: (primaryRes as { watchTo?: string }).watchTo,
                  });
                }
              } else {
                // All 3 failed — fall through to single-task fallback
                set(s => ({ tasks: s.tasks.filter(t => t.id !== `placeholder-day-${nextDay}`) }));
                get().generateNextDayTasks();
              }
            })();
            // Add placeholder and return — variants will replace it async
            const placeholder: Task = {
              id: `placeholder-day-${nextDay}`,
              title: "Generating today's task...",
              description: 'Your personalized task is being prepared.',
              type: 'practice',
              duration: dailyMinutes,
              completed: false,
              skipped: false,
              scheduledFor: new Date().toISOString().split('T')[0],
              day: nextDay,
            };
            set((s) => ({ tasks: [...s.tasks, placeholder] }));
            return;
          }

          runTaskGenerator(nextDay, state.agentRoadmap, state.stoneProfile, dailyMinutes, previousTasksContext, goalText, goalCategory, skillLevel, undefined, weekContentSummary)
            .then((agentTask: DailyTask) => {
              // Check if this is an assessment task (has assessment questions attached)
              const assessmentData = agentTask as DailyTask & { assessmentQuestions?: AssessmentQuestion[]; taskType?: string };
              const taskType = (assessmentData.taskType as Task['type']) || 'practice';

              const newTask: Task = {
                id: `agent-day-${nextDay}`,
                title: agentTask.task.title,
                description: agentTask.task.description,
                type: taskType,
                duration: agentTask.task.estimatedMinutes,
                completed: false,
                skipped: false,
                scheduledFor: new Date().toISOString().split('T')[0],
                day: nextDay,
                dayNumber: nextDay,
                segments: agentTask.task.segments ?? [],
                steps: agentTask.task.steps.map((s: TaskStep) => s.instruction),
                tips: agentTask.task.tips,
                successCriteria: agentTask.task.successCriteria.primary,
                coachTips: agentTask.task.coachTips ?? [],
                reflection: agentTask.task.reflection,
                requiresPrep: agentTask.task.requiresPrep,
                resources: agentTask.task.resources,
                // Assessment data
                assessmentQuestions: assessmentData.assessmentQuestions,
              };
              // Replace placeholder with real task, clear streaming preview
              get().setStreamingTaskDescription(null);
              set((s) => ({
                tasks: s.tasks
                  .filter(t => t.id !== `placeholder-day-${nextDay}`)
                  .concat([newTask])
              }));
              // Log content so tomorrow's practice/retrieval can reference it
              if (agentTask.task.resources?.primary) {
                const res = agentTask.task.resources.primary;
                const skeletonTheme = state.agentRoadmap?.roadmap?.phases
                  ?.flatMap(p => p.daySkeleton ?? [])
                  .find((_, i) => i === nextDay - 1)?.theme ?? goalText ?? '';
                get().logContent(nextDay, {
                  day: nextDay,
                  resourceTitle: res.title,
                  resourceUrl: res.url,
                  topic: skeletonTheme,
                  timestamps: res.timestamps,
                  watchFrom: (res as { watchFrom?: string }).watchFrom,
                  watchTo: (res as { watchTo?: string }).watchTo,
                });
              }

              // Sync to Supabase in background (non-blocking)
              const syncState = get();
              const roadmapId = (syncState.roadmap as unknown as Record<string, unknown> & { id?: string })?.id
                ?? (syncState.agentRoadmap as unknown as Record<string, unknown> & { dbRoadmapId?: string })?.dbRoadmapId;
              if (roadmapId && typeof roadmapId === 'string') {
                syncDailyTasksToDB(roadmapId, [newTask]).then(synced => {
                  if (synced.length > 0) {
                    // Update local task ID to the Supabase UUID
                    set(s => ({
                      tasks: s.tasks.map(t =>
                        t.id === newTask.id ? { ...t, id: synced[0].id } : t
                      )
                    }));
                  }
                }).catch(() => { /* non-critical */ });
              }
            })
            .catch((err: unknown) => {
              console.warn(`Agent 4 failed for Day ${nextDay}, using deterministic fallback:`, err);
              // Use phase-aware deterministic fallback (no LLM, always succeeds)
              const agentState = get();
              const fallbackTask = generateFallbackTask(
                nextDay,
                agentState.agentRoadmap!,
                agentState.stoneProfile!,
                dailyMinutes
              );
              const fallbackStoreTask: Task = {
                id: `fallback-day-${nextDay}`,
                title: fallbackTask.task.title,
                description: fallbackTask.task.description,
                type: 'practice',
                duration: fallbackTask.task.estimatedMinutes,
                completed: false,
                skipped: false,
                scheduledFor: new Date().toISOString().split('T')[0],
                day: nextDay,
                dayNumber: nextDay,
                steps: fallbackTask.task.steps.map((s: TaskStep) => s.instruction),
                tips: fallbackTask.task.tips,
                successCriteria: fallbackTask.task.successCriteria.primary,
                coachTips: fallbackTask.task.coachTips ?? [],
              };
              get().setStreamingTaskDescription(null);
              set((s) => ({
                tasks: s.tasks
                  .filter(t => t.id !== `placeholder-day-${nextDay}`)
                  .concat([fallbackStoreTask])
              }));

              // Sync fallback task to Supabase in background
              const fbSyncState = get();
              const fbRoadmapId = (fbSyncState.roadmap as unknown as Record<string, unknown> & { id?: string })?.id
                ?? (fbSyncState.agentRoadmap as unknown as Record<string, unknown> & { dbRoadmapId?: string })?.dbRoadmapId;
              if (fbRoadmapId && typeof fbRoadmapId === 'string') {
                syncDailyTasksToDB(fbRoadmapId, [fallbackStoreTask]).then(synced => {
                  if (synced.length > 0) {
                    set(s => ({
                      tasks: s.tasks.map(t =>
                        t.id === fallbackStoreTask.id ? { ...t, id: synced[0].id } : t
                      )
                    }));
                  }
                }).catch(() => { /* non-critical */ });
              }
            });

          // ── Streaming preview (fire-and-forget) ──
          // Streams a one-sentence description of what Day N will focus on
          // into streamingTaskDescription while Agent 4 runs.
          const phaseTheme = (state.agentRoadmap as unknown as { months?: Array<{ title: string }> } | null)?.months?.[0]?.title ?? state.roadmap?.category ?? 'your goal';
          ;(async () => {
            try {
              get().setStreamingTaskDescription('');
              for await (const token of callEconomyStream({
                messages: [{ role: 'user', content: `One sentence: what will day ${nextDay} practice focus on? Goal: ${goalText ?? 'the goal'}, phase: ${phaseTheme}` }],
                max_tokens: 60,
                temperature: 0.5,
              })) {
                get().setStreamingTaskDescription((get().streamingTaskDescription ?? '') + token);
              }
            } catch {
              get().setStreamingTaskDescription(null);
            }
          })();

          // Add a lightweight placeholder so the UI isn't empty while Agent 4 runs
          const placeholder: Task = {
            id: `placeholder-day-${nextDay}`,
            title: "Generating today's task...",
            description: 'Your personalized task is being prepared.',
            type: 'practice',
            duration: dailyMinutes,
            completed: false,
            skipped: false,
            scheduledFor: new Date().toISOString().split('T')[0],
            day: nextDay,
          };
          set((s) => ({ tasks: [...s.tasks, placeholder] }));
          return;
        }

        // Fallback: use static templates
        const nextWeek = Math.ceil((nextDay + 1) / 7);
        const lastWeekPerformance = state.performanceHistory.find(
          (p) => p.weekNumber === nextWeek - 1
        );
        let difficultyMultiplier = 1.0;
        if (lastWeekPerformance) {
          if (lastWeekPerformance.completionRate < 60) difficultyMultiplier = 0.8;
          else if (lastWeekPerformance.completionRate > 90) difficultyMultiplier = 1.2;
        }

        const nextDayTasks = state.roadmap.strategicPlan
          ? generateTasksFromAIPlan(state.roadmap, nextDay, state.checkInTime)
          : generateTasksForDay(
              state.roadmap.category,
              nextDay,
              state.checkInTime,
              difficultyMultiplier
            );

        set((state) => ({
          tasks: [...state.tasks, ...nextDayTasks]
        }));
      },

      selectedVariants: {},
      selectTaskVariant: (day, variant) => set(state => ({
        selectedVariants: { ...state.selectedVariants, [day]: variant },
      })),

      contentLog: {},
      logContent: (day, entry) => set(s => ({ contentLog: { ...s.contentLog, [day]: entry } })),

      banditState: getInitialBanditState(),
      updateBanditFeedback: (taskId, completed, difficultyRating) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task?.variant) return;
        const ctx: BanditContext = {
          domain: (state.currentGoal as { category?: string }).category ?? 'general',
          primaryStone: state.stoneProfile?.stoneProfile?.primaryStone ?? 'unknown',
          dayOfWeek: task.scheduledFor
            ? new Date(task.scheduledFor + 'T00:00:00').getDay()
            : new Date().getDay(),
        };
        const reward = computeReward(completed, difficultyRating);
        set({ banditState: updateArm(state.banditState, ctx, task.variant as VariantArm, reward) });
      },

      streamingTaskDescription: null,
      setStreamingTaskDescription: (text: string | null) => set({ streamingTaskDescription: text }),

      pregenerateTasksForDay: async (day: number): Promise<void> => {
        const state = get();
        if (!flags.BACKGROUND_TASK_PREGENERATION && !flags.PREGENERATE_TASKS) return;
        if (!state.roadmap || !state.agentRoadmap || !state.stoneProfile) return;
        // Don't pregenerate if already present (active or pregenerated)
        if (state.tasks.some(t => t.day === day)) return;

        const dailyMinutes = parseInt(state.roadmap.dailyTime) || 30;
        const goalText = (state.currentGoal as { specificGoal?: string }).specificGoal ?? undefined;
        const goalCategory = (state.currentGoal as { category?: string }).category ?? undefined;
        const skillLevel = (state.currentGoal as { skillLevel?: 'beginner' | 'intermediate' | 'advanced' }).skillLevel ?? 'beginner';

        try {
          const agentTask = await runTaskGenerator(day, state.agentRoadmap, state.stoneProfile, dailyMinutes, undefined, goalText, goalCategory, skillLevel);
          const assessmentData = agentTask as DailyTask & { assessmentQuestions?: AssessmentQuestion[]; taskType?: string };
          const taskType = (assessmentData.taskType as Task['type']) || 'practice';

          const pregenTask: Task = {
            id: `pregenerated-day-${day}`,
            title: agentTask.task.title,
            description: agentTask.task.description,
            type: taskType,
            duration: agentTask.task.estimatedMinutes,
            completed: false,
            skipped: false,
            scheduledFor: new Date().toISOString().split('T')[0],
            day,
            dayNumber: day,
            segments: agentTask.task.segments ?? [],
            steps: agentTask.task.steps.map((s: TaskStep) => s.instruction),
            tips: agentTask.task.tips,
            successCriteria: agentTask.task.successCriteria.primary,
            coachTips: agentTask.task.coachTips ?? [],
            reflection: agentTask.task.reflection,
            requiresPrep: agentTask.task.requiresPrep,
            assessmentQuestions: assessmentData.assessmentQuestions,
            status: 'pregenerated',
            createdAt: new Date().toISOString(),
          };

          // Only store if the day's task hasn't appeared since we started generating
          set(s => {
            if (s.tasks.some(t => t.day === day)) return {};
            return { tasks: [...s.tasks, pregenTask] };
          });
        } catch {
          // Background failure — silently ignore
        }
      },

      resetOnboarding: () => {
        // Clear Supabase data before wiping local state
        getCurrentUser().then(user => {
          if (user?.id) {
            deleteUserData(user.id).catch(err =>
              console.warn('⚠️ DB reset failed (local state still cleared):', err)
            );
          }
        });

        set({
          step: 0,
          universalProfile: {},
          currentGoal: {},
          roadmap: null,
          agentRoadmap: null,
          agentRoadmapV2: null,
          weeklyCheckIns: [],
          pendingWeeklyCheckIn: null,
          stoneProfile: null,
          stoneHistory: [],
          tasks: [],
          currentDay: 1,
          streak: 0,
          completionRate: 0,
          lastCheckInDate: null,
          performanceHistory: [],
          initialGoal: null,
          contentLog: {},
          banditState: getInitialBanditState(),
        });
      },
    }),
    {
      name: 'consist-storage',
      version: 1,
      migrate: (persistedState) => persistedState,
    }
  )
);
