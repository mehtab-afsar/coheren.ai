import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingState, GoalCategory } from '../types/index.js';
import { generateTasksForDay, generateTasksFromAIPlan } from '../utils/taskGenerator.js';

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'practice' | 'learning' | 'reflection';
  duration: number; // minutes
  completed: boolean;
  completedAt?: string;
  scheduledFor: string;
  day: number;
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
  strategicPlan?: any; // AI-generated strategic plan
}

interface AppStore extends OnboardingState {
  // App state
  checkInTime: string;
  roadmap: Roadmap | null;
  tasks: Task[];
  currentDay: number;
  streak: number;
  completionRate: number;
  lastCheckInDate: string | null;
  performanceHistory: WeekPerformance[];

  // Actions
  setStep: (step: number) => void;
  updateUniversalProfile: (data: Partial<OnboardingState['universalProfile']>) => void;
  updateCurrentGoal: (data: Partial<OnboardingState['currentGoal']>) => void;
  setGoalCategory: (category: GoalCategory) => void;
  setSpecificGoal: (goal: string) => void;
  setCheckInTime: (time: string) => void;
  setRoadmap: (roadmap: Roadmap) => void;
  setTasks: (tasks: Task[]) => void;
  completeTask: (taskId: string) => void;
  canAdvanceDay: () => boolean;
  advanceDay: () => boolean;
  generateNextDayTasks: () => void;
  trackWeekPerformance: () => void;
  resetOnboarding: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
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

      completeTask: (taskId) =>
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

          return { tasks, completionRate, streak: newStreak };
        }),

      canAdvanceDay: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // Check if all today's tasks are complete
        const todaysTasks = state.tasks.filter((t) => t.day === state.currentDay);
        const allTasksComplete = todaysTasks.length > 0 && todaysTasks.every((t) => t.completed);

        // Check if user hasn't already advanced today
        const hasNotAdvancedToday = state.lastCheckInDate !== today;

        return allTasksComplete && hasNotAdvancedToday;
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
          console.error('Cannot generate tasks: roadmap not set');
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
            console.log(`Week ${nextWeek}: Reducing difficulty (${lastWeekPerformance.completionRate}% completion)`);
          } else if (lastWeekPerformance.completionRate > 90) {
            // Excelling - increase difficulty by 20%
            difficultyMultiplier = 1.2;
            console.log(`Week ${nextWeek}: Increasing difficulty (${lastWeekPerformance.completionRate}% completion)`);
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
        performanceHistory: []
      }),
    }),
    {
      name: 'consist-storage',
    }
  )
);
