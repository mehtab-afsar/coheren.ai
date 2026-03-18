import { useEffect, useState } from 'react';
import { useStore } from '@core/store/useStore';
import LandingPage from '@features/onboarding/components/LandingPage';
import ChatOnboarding from '@features/onboarding/components/ChatOnboarding';
import Dashboard from '@features/dashboard';
import Settings from '@features/dashboard/components/Settings';
import AuthPage from '@features/auth/AuthPage';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import { onAuthStateChange, supabase } from '@lib/supabase';
import { getTasksByRoadmapId, calculateStreak } from '@lib/database';
import { identifyUser, resetAnalyticsUser } from '@lib/analytics';

function App() {
  const step = useStore((state) => state.step);
  const resetOnboarding = useStore((state) => state.resetOnboarding);
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const checkAuth = useStore((state) => state.checkAuth);
  const setInitialGoal = useStore((state) => state.setInitialGoal);

  const [authInitialized, setAuthInitialized] = useState(false);

  // Initialize auth on mount
  useEffect(() => {
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('Auth check timed out, continuing without auth');
      setAuthInitialized(true);
    }, 5000); // 5 second timeout (increased from 3s)

    checkAuth()
      .then(() => {
        clearTimeout(timeoutId);
        setAuthInitialized(true);
      })
      .catch((error) => {
        console.error('Auth check failed:', error);
        clearTimeout(timeoutId);
        setAuthInitialized(true); // Continue anyway
      });

    // Listen for auth state changes
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {

      // Clear timeout when auth state changes - we know auth is working
      if (timeoutId) {
        clearTimeout(timeoutId);
        setAuthInitialized(true);
      }
      if (session?.user) {
        setUser(session.user);
        identifyUser(session.user.id, { email: session.user.email });

        // Always read live step (not stale closure) to avoid token-refresh reset
        const liveStep = useStore.getState().step;
        const liveTasks = useStore.getState().tasks;

        // If already on dashboard with data loaded, skip re-fetching (handles token refreshes)
        if (liveStep === 2 && liveTasks.length > 0) {
          return;
        }

        // If on onboarding with roadmap already generated (value-first funnel: user just signed up),
        // the ChatOnboarding component handles the sync — don't interfere
        if (liveStep === 1 && useStore.getState().roadmap) {
          return;
        }

        // Default to step 1 immediately to avoid blank screen during async DB check
        // Only redirect on fresh sign-in or initial session load — NOT on token refresh,
        // so users who clicked "Back" to the landing page are not pushed back into chat.
        if (liveStep === 0 && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          useStore.setState({ step: 1 });
        }

        // Check if user has a roadmap in Supabase
        try {
          const { data: goals, error } = await supabase
            .from('user_goals')
            .select('*, roadmaps(*)')
            .eq('user_id', session.user.id)
            .eq('status', 'active')
            .maybeSingle(); // Use maybeSingle() instead of single() to handle no results

          if (error) {
            console.warn('Could not fetch goals:', error.message);
          }

          // roadmaps is returned as an array by Supabase (one-to-many join)
          const roadmapEntry = Array.isArray(goals?.roadmaps)
            ? goals.roadmaps[0]
            : goals?.roadmaps;

          if (goals && roadmapEntry) {
            // User has an active goal in database - load all data into store, then go to dashboard

            const roadmapRow = roadmapEntry;
            const phases = Array.isArray(roadmapRow.phases) ? roadmapRow.phases : [];

            // Map DB goal/roadmap row to store shape
            const startDate = goals.created_at || new Date().toISOString();
            const durationDays = (roadmapRow.config?.total_weeks ?? 12) * 7;
            const endDate = new Date(new Date(startDate).getTime() + durationDays * 86400000).toISOString();

            const roadmapForStore = {
              title: goals.title,
              // Map description keywords to valid GoalCategory for task generation
              category: (() => {
                const desc = (goals.description ?? '').toLowerCase();
                if (desc.includes('fitness') || desc.includes('workout') || desc.includes('exercise') || desc.includes('run')) return 'Fitness';
                if (desc.includes('exam') || desc.includes('study') || desc.includes('test') || desc.includes('cert')) return 'Exam';
                if (desc.includes('habit') || desc.includes('routine') || desc.includes('daily')) return 'Habit';
                if (desc.includes('creative') || desc.includes('design') || desc.includes('art') || desc.includes('write')) return 'Creative';
                if (desc.includes('hobby') || desc.includes('music') || desc.includes('play')) return 'Hobby';
                return 'Learning'; // Default: tech, programming, language, courses, etc.
              })() as import('./types/index.js').GoalCategory,
              duration: durationDays,
              dailyTime: roadmapRow.config?.daily_time_minutes ? `${roadmapRow.config.daily_time_minutes} minutes` : '45 minutes',
              recommendedTime: '08:00',
              phases: phases.map((p: Record<string, unknown>) => ({
                // Handle both seed shape {title, weeks, description} and agent shape {phaseName, weeks[], primaryGoals[]}
                title: (p.title ?? p.phaseName ?? 'Phase') as string,
                weeks: Array.isArray(p.weeks)
                  ? `${p.weeks[0]}-${p.weeks[p.weeks.length - 1]}`
                  : (p.weeks ?? '') as string,
                description: Array.isArray(p.primaryGoals)
                  ? (p.primaryGoals as string[]).join('. ')
                  : (p.description ?? '') as string,
              })),
              startDate,
              endDate,
            };

            // Load tasks from DB
            const dbTasks = await getTasksByRoadmapId(roadmapRow.id);
            const tasksForStore = (dbTasks ?? []).map((t) => {
              const content = t.content as Record<string, unknown> ?? {};
              return {
                id: t.id as string,
                title: t.title as string,
                description: (content.description as string) ?? '',
                type: ((content.type as string) ?? 'practice') as 'practice' | 'learning' | 'reflection',
                duration: (content.duration as number) ?? 45,
                completed: Boolean(t.is_completed),
                completedAt: t.completed_at as string | undefined,
                skipped: Boolean(t.skipped),
                scheduledFor: (content.scheduledFor as string) ?? '08:00',
                day: t.day_number as number,
                dayNumber: t.day_number as number,
                steps: (content.steps as string[]) ?? [],
                tips: (content.tips as string[]) ?? [],
                successCriteria: (content.successCriteria as string) ?? '',
                resources: content.resources as import('@core/store/useStore').Task['resources'],
                difficultyRating: t.difficulty_rating as number | undefined,
                actualDuration: t.actual_duration as number | undefined,
              };
            });

            // Calculate current day (days since start + 1, capped at duration)
            const daysSinceStart = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
            const currentDay = Math.min(Math.max(daysSinceStart + 1, 1), durationDays);

            // Calculate streak from DB
            const streak = await calculateStreak(roadmapRow.id).catch(() => 0);

            // Load currentGoal into store
            const currentGoal = {
              category: roadmapForStore.category,
              specificGoal: goals.description ?? '',
            };

            // Restore agent data from DB config (for cross-device / localStorage-cleared scenarios)
            const dbConfig = roadmapRow.config as Record<string, unknown> ?? {};
            const restoredAgentRoadmap = dbConfig.agent_roadmap_json as import('@types-app/agents').Agent3Output | undefined;
            const restoredStoneProfile = dbConfig.stone_profile_json as import('@types-app/agents').Agent2ProfileOutput | undefined;

            useStore.setState({
              step: 2,
              roadmap: roadmapForStore,
              tasks: tasksForStore,
              currentDay,
              streak,
              currentGoal,
              ...(restoredAgentRoadmap ? { agentRoadmap: restoredAgentRoadmap } : {}),
              ...(restoredStoneProfile ? { stoneProfile: restoredStoneProfile } : {}),
            });
          } else {
            // User has no goal in database - go to onboarding
            useStore.setState({ step: 1 });
          }
        } catch (err) {
          console.error('Error checking user goals:', err);
          useStore.setState({ step: 1 });
        }
      } else {
        resetAnalyticsUser();
        // Only reset to landing page if not actively onboarding (step 1 is now pre-auth)
        const currentStep = useStore.getState().step;
        if (currentStep !== 1) {
          setUser(null);
          useStore.setState({ step: 0 });
        } else {
          // Step 1 is intentionally pre-auth — just clear user reference, keep onboarding
          setUser(null);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Developer reset button (visible with keyboard shortcut)
  const handleKeyDown = (e: KeyboardEvent) => {
    // Press Ctrl/Cmd + Shift + R to reset
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'r') {
      e.preventDefault();
      if (confirm('Reset all data and start over?')) {
        resetOnboarding();
        window.location.reload();
      }
    }
  };

  // Add keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show loading while checking auth
  if (!authInitialized) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #E5E7EB',
            borderTopColor: '#6366F1',
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ color: '#6B7280', fontSize: '14px' }}>Loading...</p>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {step === 0 && <LandingPage key="landing" onGetStarted={(goal: string) => {
        setInitialGoal(goal);
        useStore.setState({ step: 1 });
      }} />}
      {step === 1 && <ChatOnboarding key="chat" />}
      {step === 2 && user && (
        <ErrorBoundary label="dashboard" key="dashboard">
          <Dashboard />
        </ErrorBoundary>
      )}
      {step === 3 && <AuthPage key="signup" mode="signup" />}
      {step === 4 && <AuthPage key="signin" mode="signin" />}
      {step === 10 && user && <Settings key="settings" />}

    {/* Quick reset button - bottom right corner for development */}
      <div style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999
      }}>
        <button
          onClick={() => {
            if (confirm('Reset everything and start fresh?')) {
              localStorage.clear();
              window.location.reload();
            }
          }}
          style={{
            padding: '8px 16px',
            background: '#ef5350',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 300,
            opacity: 0.3,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.3'}
          title="Reset all data (or press Ctrl+Shift+R)"
        >
          Reset
        </button>
      </div>
    </ErrorBoundary>
  );
}

export default App;
