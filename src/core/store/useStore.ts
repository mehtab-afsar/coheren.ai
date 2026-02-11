import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingState, GoalCategory } from '@types-app/index.js';
import { generateTasksForDay, generateTasksFromAIPlan } from '@shared/utils/taskGenerator.js';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser } from '@lib/supabase';
import { updateTaskCompletion, updateTaskSkip, updateProfile } from '@lib/database';
import type { TaskResource } from '@types-app/agents.js';

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'practice' | 'learning' | 'reflection';
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
  steps?: string[]; // step-by-step instructions
  tips?: string[]; // helpful tips
  successCriteria?: string; // what success looks like
  checkInTime?: string; // scheduled time
  // Learning resources
  resources?: {
    primary: TaskResource | null;
    supplementary: TaskResource[];
  };
  // Agent 5 (Re-calibrator) feedback fields
  difficultyRating?: number; // 1-5 scale (1=easy, 5=very hard)
  actualDuration?: number; // actual minutes taken
  userComment?: string; // struggle notes or feedback
  feedbackTags?: string[]; // quick feedback tags (e.g., 'perfect_pace', 'physical_pain', 'confusing')
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
  setTasks: (tasks: Task[]) => void;
  completeTask: (taskId: string) => Promise<void>;
  skipTask: (taskId: string, reason?: 'time' | 'health' | 'difficulty' | 'external') => Promise<void>;
  canAdvanceDay: () => boolean;
  advanceDay: () => boolean;
  generateNextDayTasks: () => void;
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
            console.log('✅ Task synced to Supabase');
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

          // Update streak if all today's tasks are done
          const allDone = todaysTasks.length > 0 && todaysTasks.every((t) => t.completed);
          const newStreak = allDone ? state.streak + 1 : state.streak;

          // Update streak in profile if user is authenticated
          if (state.user && newStreak > state.streak) {
            updateProfile(state.user.id, {
              persona_traits: {
                ...(state.universalProfile as Record<string, unknown>),
                streak: newStreak,
                lastCheckIn: new Date().toISOString()
              }
            }).catch(err => console.error('Failed to update streak:', err));
          }

          return { tasks, completionRate, streak: newStreak };
        });
      },

      skipTask: async (taskId, reason) => {
        const state = get();

        // Only sync to DB if taskId is a valid UUID (rolling-curriculum tasks use "task-N-M" format)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);

        if (state.user && reason && isUUID) {
          try {
            await updateTaskSkip(taskId, reason);
            console.log('✅ Task skip synced to Supabase');
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

        // Track weekly performance when completing week 7, 14, 21, etc.
        const currentWeek = Math.ceil(state.currentDay / 7);
        const nextDay = state.currentDay + 1;
        const nextWeek = Math.ceil(nextDay / 7);

        if (nextWeek > currentWeek) {
          // Completed a week, track performance
          get().trackWeekPerformance();
        }

        set((state) => ({
          currentDay: state.currentDay + 1,
          lastCheckInDate: today,
          completionRate: 0 // Reset completion rate for new day
        }));

        // Generate next day's tasks
        get().generateNextDayTasks();

        return true;
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

        // Check if we should adjust difficulty based on performance
        const nextWeek = Math.ceil((state.currentDay + 1) / 7);
        const lastWeekPerformance = state.performanceHistory.find(
          (p) => p.weekNumber === nextWeek - 1
        );

        let difficultyMultiplier = 1.0;

        if (lastWeekPerformance) {
          if (lastWeekPerformance.completionRate < 60) {
            // Struggling - reduce difficulty by 20%
            difficultyMultiplier = 0.8;
          } else if (lastWeekPerformance.completionRate > 90) {
            // Excelling - increase difficulty by 20%
            difficultyMultiplier = 1.2;
          }
        }

        // Try to use AI-generated plan first, fall back to templates with adaptive difficulty
        const nextDayTasks = state.roadmap.strategicPlan
          ? generateTasksFromAIPlan(state.roadmap, state.currentDay, state.checkInTime)
          : generateTasksForDay(
              state.roadmap.category,
              state.currentDay,
              state.checkInTime,
              difficultyMultiplier
            );

        set((state) => ({
          tasks: [...state.tasks, ...nextDayTasks]
        }));
      },

      resetOnboarding: () => set({
        step: 0,
        universalProfile: {},
        currentGoal: {},
        roadmap: null,
        tasks: [],
        currentDay: 1,
        streak: 0,
        completionRate: 0,
        lastCheckInDate: null,
        performanceHistory: [],
        initialGoal: null,
      }),
    }),
    {
      name: 'consist-storage',
    }
  )
);
