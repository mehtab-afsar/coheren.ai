import { useState } from 'react';
import { useStore } from '@core/store/useStore';
import { signIn, signUp } from '@lib/supabase';
import { syncCompleteRoadmap } from '@lib/database';
import { generateInitialTasks } from '@shared/utils/taskGenerator';
import type { Agent1Output, StoneAnswer } from '@core/agents';
import type { GoalCategory } from '@types-app/index';

interface PendingSyncData {
  goalAnalysisData: Agent1Output;
  answers: StoneAnswer[];
  agentRoadmap: Parameters<typeof syncCompleteRoadmap>[5];
  initialTasksData: ReturnType<typeof generateInitialTasks> | Parameters<typeof syncCompleteRoadmap>[6];
}

interface UseAuthGateParams {
  collectedData: {
    goal: string;
    category: GoalCategory | null;
  };
  setInitialGoal: (goal: string | null) => void;
  setStep: (step: number) => void;
}

export function useAuthGate({
  collectedData,
  setInitialGoal,
  setStep,
}: UseAuthGateParams) {
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [authGateMode, setAuthGateMode] = useState<'signup' | 'login'>('signup');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingSyncData, setPendingSyncData] = useState<PendingSyncData | null>(null);

  const handleAuthGateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      let userId: string | null = null;

      if (authGateMode === 'signup') {
        const { data, error } = await signUp(authEmail, authPassword, { full_name: authName });
        if (error) { setAuthError(error.message); setAuthLoading(false); return; }
        userId = data.user?.id ?? null;
        // Set user in store directly from response — don't rely on getSession() which can be null
        if (data.user) useStore.setState({ user: data.user, isAuthenticated: true });
      } else {
        const { data, error } = await signIn(authEmail, authPassword);
        if (error) { setAuthError(error.message); setAuthLoading(false); return; }
        userId = data.user?.id ?? null;
        if (data.user) useStore.setState({ user: data.user, isAuthenticated: true });
      }

      if (!userId) {
        setAuthError('Authentication failed. Please try again.');
        setAuthLoading(false);
        return;
      }

      // Clear initialGoal from store
      setInitialGoal(null);

      // Sync roadmap to Supabase
      if (pendingSyncData) {
        console.log('📤 Syncing roadmap after signup...');
        syncCompleteRoadmap(
          userId,
          collectedData.goal,
          `Generated via AI multi-agent system for ${collectedData.category}`,
          pendingSyncData.goalAnalysisData,
          pendingSyncData.answers,
          pendingSyncData.agentRoadmap,
          pendingSyncData.initialTasksData as Parameters<typeof syncCompleteRoadmap>[6]
        ).then(result => {
          if (result.success) console.log('✅ Roadmap synced after signup!');
        }).catch(err => console.warn('⚠️ Sync after signup failed:', err));
      }

      // Go to dashboard
      setShowAuthGate(false);
      setStep(2);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'An error occurred');
      setAuthLoading(false);
    }
  };

  return {
    showAuthGate,
    setShowAuthGate,
    authGateMode,
    setAuthGateMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authName,
    setAuthName,
    authLoading,
    authError,
    setAuthError,
    pendingSyncData,
    setPendingSyncData,
    handleAuthGateSubmit,
  };
}
