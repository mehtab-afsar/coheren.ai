export type GoalCategory = 'Fitness' | 'Exam' | 'Hobby' | 'Learning' | 'Habit' | 'Creative';

export interface UniversalProfile {
  name: string;
  dailyRoutine: {
    wakeTime: string;
    sleepTime: string;
    workHours: {
      start: string;
      end: string;
    };
    freeTimeSlots: Array<{
      start: string;
      end: string;
      type: 'morning' | 'afternoon' | 'evening';
    }>;
  };
  energyPattern: 'morning' | 'afternoon' | 'evening' | 'night';
  weekendAvailability: 'flexible' | 'limited' | 'busy' | '';
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
}

export interface FitnessData {
  currentLevel: 'beginner' | 'intermediate' | 'advanced';
  injuries: string[];
  equipment: string[];
}

export interface ExamData {
  examName: string;
  examDate: string;
  attempt: 'first' | 'retaking';
  studyCapacity_hours: number;
  biggestChallenge?: string;
}

export interface Goal {
  goalId: string;
  /** Supabase `user_goals` row id — the field the app actually uses to tie local
   *  state to the DB row (set by reconcileSyncedRoadmap / DB hydration). Optional
   *  because it's absent pre-sync. Typed here so call sites stop using `as {id?}`. */
  id?: string;
  category: GoalCategory;
  specificGoal: string;
  createdAt: string;
  status: 'active' | 'paused' | 'completed';
  fitnessData?: FitnessData;
  examData?: ExamData;
  timeline: {
    targetDate: string;
    estimatedDuration_months: number;
    dailyTimeCommitment_minutes: number;
    scheduledSlot: {
      start: string;
      end: string;
    };
  };
}

export interface OnboardingState {
  step: number;
  universalProfile: Partial<UniversalProfile>;
  currentGoal: Partial<Goal>;
}
