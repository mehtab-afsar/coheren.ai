import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OnboardingState, GoalCategory } from '../types/index.js';

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
  resetOnboarding: () => void;
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      step: 0,
      universalProfile: {},
      currentGoal: {},
      checkInTime: '07:00',
      roadmap: null,
      tasks: [],
      currentDay: 1,
      streak: 0,
      completionRate: 0,

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

      resetOnboarding: () => set({
        step: 0,
        universalProfile: {},
        currentGoal: {},
        roadmap: null,
        tasks: [],
        currentDay: 1,
        streak: 0,
        completionRate: 0
      }),
    }),
    {
      name: 'consist-storage',
    }
  )
);
