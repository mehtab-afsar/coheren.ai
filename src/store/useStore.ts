import { create } from 'zustand';
import type { OnboardingState, GoalCategory } from '../types/index.js';

interface AppStore extends OnboardingState {
  // Actions
  setStep: (step: number) => void;
  updateUniversalProfile: (data: Partial<OnboardingState['universalProfile']>) => void;
  updateCurrentGoal: (data: Partial<OnboardingState['currentGoal']>) => void;
  setGoalCategory: (category: GoalCategory) => void;
  setSpecificGoal: (goal: string) => void;
  resetOnboarding: () => void;
}

export const useStore = create<AppStore>((set) => ({
  step: 0,
  universalProfile: {},
  currentGoal: {},

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

  resetOnboarding: () => set({ step: 0, universalProfile: {}, currentGoal: {} }),
}));
