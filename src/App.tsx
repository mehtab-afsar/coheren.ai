import { useEffect, useState } from 'react';
import { useStore, mapDbTaskToStoreTask } from '@core/store/useStore';
import LandingPage from '@features/onboarding/components/LandingPage';
import ChatOnboarding from '@features/onboarding/components/ChatOnboarding';
import Dashboard from '@features/dashboard';
import Settings from '@features/dashboard/components/Settings';
import AuthPage from '@features/auth/AuthPage';
import ErrorBoundary from '@shared/components/ErrorBoundary';
import { onAuthStateChange, supabase } from '@lib/supabase';
import { getTasksByRoadmapId, calculateStreak, syncCompleteRoadmap, upsertProfile } from '@lib/database';
import { identifyUser, resetAnalyticsUser, track } from '@lib/analytics';
import { expireStaleCheckpoints } from '@lib/checkpointHelpers';
import { readPendingOAuthSync, clearPendingOAuthSync } from '@lib/oauthSyncStash';

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

    // Purge any stale pipeline checkpoints from previous sessions
    expireStaleCheckpoints();

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
        // Identify by stable id only — do NOT send email (PII) to PostHog. The
        // id maps back to the user in Supabase if you ever need to join server-side.
        identifyUser(session.user.id);

        // Email/password signup creates this row via createProfile(); Google
        // OAuth never calls that, so ensure it here too. Idempotent — no-ops
        // for returning users (ignoreDuplicates), never overwrites edits.
        const googleName = session.user.user_metadata?.full_name ?? session.user.user_metadata?.name ?? null;
        upsertProfile(session.user.id, googleName).catch(() => {});

        // Activation funnel: fire `signup` only for a genuinely NEW account, not a
        // returning login. `SIGNED_IN` fires on both, so gate on account age — a
        // just-created account is <5 min old. This is the real signup conversion step.
        if (event === 'SIGNED_IN' && session.user.created_at) {
          const accountAgeMs = Date.now() - new Date(session.user.created_at).getTime();
          if (accountAgeMs >= 0 && accountAgeMs < 5 * 60_000) {
            track({ event: 'signup', properties: { method: session.user.app_metadata?.provider ?? 'email' } });
          }
        }

        // Always read live step (not stale closure) to avoid token-refresh reset
        const liveStep = useStore.getState().step;
        const liveTasks = useStore.getState().tasks;
        const liveGoalId = useStore.getState().currentGoal?.id;

        // A token refresh must NEVER re-hydrate or redirect. If we're on the
        // dashboard, a refresh firing during the background-reconcile window (tasks
        // present but goalId not yet written) would otherwise fall through, re-query,
        // find no roadmap yet, and bounce the user back to onboarding. Treat refresh
        // as a no-op for app state whenever we're already past onboarding.
        if (event === 'TOKEN_REFRESHED' && liveStep === 2) {
          return;
        }

        // If already on dashboard with data AND the DB ids are hydrated, skip re-fetching.
        // When goalId is still resolving (value-first reconcile window) we fall through
        // to hydrate — but the "no goal found" branch below must NOT bounce an active
        // step-2 session back to onboarding (that's the race fix; see there).
        if (liveStep === 2 && liveTasks.length > 0 && liveGoalId) {
          return;
        }

        // If on onboarding with roadmap already generated (value-first funnel: user just signed up),
        // the ChatOnboarding component handles the sync in-place — don't interfere.
        // EXCEPTION: a Google OAuth sign-in navigates away and back, so ChatOnboarding's
        // in-memory handler never runs — finish the sync here from the stashed data instead.
        if (liveStep === 1 && useStore.getState().roadmap) {
          const pendingSync = readPendingOAuthSync();
          if (pendingSync) {
            // C5: claim-then-run — clear the stash BEFORE starting the sync so a
            // second auth event firing mid-sync can't re-read it and double-fire
            // the same goal/roadmap write.
            clearPendingOAuthSync();
            try {
              const { currentGoal, agentRoadmap, stoneProfile, tasks } = useStore.getState();
              if (agentRoadmap && currentGoal.specificGoal) {
                const result = await syncCompleteRoadmap(
                  session.user.id,
                  currentGoal.specificGoal,
                  `Generated via AI multi-agent system for ${currentGoal.category}`,
                  pendingSync.goalAnalysis,
                  pendingSync.answers,
                  agentRoadmap,
                  tasks as unknown as Array<Record<string, unknown>>,
                  stoneProfile ?? undefined
                );
                const goalId = (result as { goal?: { id?: string } }).goal?.id;
                const roadmapId = (result as { roadmap?: { id?: string } }).roadmap?.id;
                if (goalId && roadmapId) {
                  await useStore.getState().reconcileSyncedRoadmap(goalId, roadmapId);
                  useStore.setState({ syncDegraded: false });
                } else {
                  console.error('⚠️ Post-OAuth sync produced no DB ids — local-only session');
                  useStore.setState({ syncDegraded: true });
                }
              }
            } catch (err) {
              console.error('Post-OAuth roadmap sync failed:', err);
              useStore.setState({ syncDegraded: true });
            }
            useStore.setState({ step: 2 });
          }
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
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(); // order+limit(1) so a pre-existing duplicate active goal can't throw

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
              id: roadmapRow.id,
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

            // Load tasks from DB (shared mapper — single source of truth with the
            // post-signup reconciliation in the store)
            const dbTasks = await getTasksByRoadmapId(roadmapRow.id);
            const tasksForStore = (dbTasks ?? []).map((t) => mapDbTaskToStoreTask(t as Record<string, unknown>));

            // Calculate current day (days since start + 1, capped at duration)
            const daysSinceStart = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
            const currentDay = Math.min(Math.max(daysSinceStart + 1, 1), durationDays);

            // Calculate streak from DB
            const streak = await calculateStreak(roadmapRow.id).catch(() => 0);

            // Load currentGoal into store. The id is required for the weekly
            // checkpoint (useCheckpoint reads currentGoal.id to fetch sprint feedback).
            const currentGoal = {
              id: goals.id,
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
              syncDegraded: false, // DB hydration succeeded — clear any prior sync-failure banner
              ...(restoredAgentRoadmap ? { agentRoadmap: restoredAgentRoadmap } : {}),
              ...(restoredStoneProfile ? { stoneProfile: restoredStoneProfile } : {}),
            });
          } else {
            // No active goal in the DB. Do NOT bounce an active dashboard session
            // (step 2 with tasks) to onboarding — that's the reconcile-window race: a
            // value-first user's roadmap write may not have landed yet, and their
            // in-flight sync/reconcile will finish and set the ids. Only route to
            // onboarding for users who genuinely have no local plan.
            const s = useStore.getState();
            if (!(s.step === 2 && s.tasks.length > 0)) {
              useStore.setState({ step: 1 });
            }
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
          // Clear THIS user's local data so the next user on a shared browser can't
          // see A's dashboard (persist has no per-user isolation). LOCAL-ONLY — no
          // deleteUserData() here; the DB is untouched. Mirrors resetOnboarding's
          // field set minus the destructive DB delete.
          useStore.setState({
            step: 0,
            isAuthenticated: false,
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
          });
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
        // Await the reset (which now awaits the DB delete) before reloading, so the
        // delete isn't aborted by the navigation.
        resetOnboarding().finally(() => window.location.reload());
      }
    }
  };

  // Add keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Activation funnel: top of funnel. Fires when the landing page is shown
  // (on first load and any return to step 0).
  useEffect(() => {
    if (step === 0) track({ event: 'landing_view', properties: {} });
  }, [step]);

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
            borderTopColor: '#C4552D',
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
      {/* step 2 without a user (momentary during auth reconcile) — show a loader,
          never a blank white screen. */}
      {step === 2 && !user && (
        <div key="dashboard-loading" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 28, height: 28, border: '3px solid #E5E7EB', borderTopColor: '#C4552D', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      {step === 3 && <AuthPage key="signup" mode="signup" />}
      {step === 4 && <AuthPage key="signin" mode="signin" />}
      {step === 10 && user && <Settings key="settings" />}

    {/* Quick reset button - bottom right corner (dev only) */}
      {import.meta.env.DEV && (
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
      )}
    </ErrorBoundary>
  );
}

export default App;
