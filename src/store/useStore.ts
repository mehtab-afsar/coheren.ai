import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingState, GoalCategory } from '../types/index.js';
import { generateTasksForDay } from '../utils/taskGenerator.js';

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

        set((state) => ({
          currentDay: state.currentDay + 1,
          lastCheckInDate: today,
          completionRate: 0 // Reset completion rate for new day
        }));

        // Generate next day's tasks
        get().generateNextDayTasks();

        return true;
      },

      generateNextDayTasks: () => {
        const state = get();

        if (!state.roadmap) {
          console.error('Cannot generate tasks: roadmap not set');
          return;
        }

        const nextDayTasks = generateTasksForDay(
          state.roadmap.category,
          state.currentDay,
          state.checkInTime
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
        lastCheckInDate: null
      }),
    }),
    {
      name: 'consist-storage',
    }
  )
);
