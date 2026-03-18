import { useState, useEffect, lazy, Suspense } from 'react';
import { Bell } from 'lucide-react';
import { tokens } from '@core/design-system';
import DashboardSidebar from '@features/dashboard/components/DashboardSidebar';
import BottomNav from '@features/dashboard/components/BottomNav';
import { ViewErrorBoundary } from '@features/dashboard/components/ViewErrorBoundary';
import { ViewSkeleton } from '@features/dashboard/components/ViewSkeleton';
// TodayView is the default landing — keep static for instant first paint
import TodayView from './views/TodayView';
// Views — lazy-loaded
const RoadmapView  = lazy(() => import('./views/RoadmapView'));
const InsightsView = lazy(() => import('./views/InsightsView'));
const YouView      = lazy(() => import('./views/YouView'));
const LibraryView  = lazy(() => import('./views/LibraryView'));
const AgentHealthDashboard = lazy(() => import('./components/AgentHealthDashboard'));

import CheckpointScreen from '@features/dashboard/components/CheckpointScreen';
import DifficultyPrompt from '@features/dashboard/components/DifficultyPrompt';
import OfflineBanner from '@features/dashboard/components/OfflineBanner';
import NotificationCenter from '@features/dashboard/components/NotificationCenter';
import { getNotifications, addNotification } from '@features/dashboard/components/notification-utils';
import ShareableCard from '@features/dashboard/components/ShareableCard';
import CoachThread from '@features/dashboard/components/CoachThread';
import { useCoachMessages } from './hooks/useCoachMessages';

import { getSprintNumber } from '@lib/checkpointHelpers';
import { useStore } from '@core/store/useStore';
import { useCheckpoint } from './hooks/useCheckpoint';
import { useDashboardNav } from './hooks/useDashboardNav';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { useNotifications } from '@hooks/useNotifications';
import { useAutoAdvance } from '@hooks/useAutoAdvance';
import { useDifficultyMonitor } from '@hooks/useDifficultyMonitor';
import { useOfflineSync } from '@hooks/useOfflineSync';

export default function Dashboard() {
  useNotifications();
  useAutoAdvance();
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useDashboardNav();
  const { checkpointData, isRecalibrating, recalibrationResult, handleCheckpointComplete, triggerEarlyRecalibration } = useCheckpoint();
  const { isMobile } = useBreakpoint();
  const { shouldPrompt, shouldTriggerEarlyRecalibration, dismiss, dismissEarlyRecalibration } = useDifficultyMonitor();
  const { isOnline, pendingCount } = useOfflineSync();

  const currentDay = useStore(s => s.currentDay);
  const tasks = useStore(s => s.tasks);
  const streak = useStore(s => s.streak);
  const currentGoal = useStore(s => s.currentGoal);

  const { generateStreakMessage, generatePlanAdjustment } = useCoachMessages();

  const [showDifficultyPrompt, setShowDifficultyPrompt] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getNotifications().filter(n => !n.read).length);
  const [showDebugPanel] = useState(() => new URLSearchParams(window.location.search).get('debug') === 'agents');

  // Generate streak milestone coach messages
  useEffect(() => {
    if (streak > 0) generateStreakMessage(streak);
  }, [streak]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show difficulty prompt once cooldown clears
  useEffect(() => {
    if (shouldPrompt) {
      const timer = setTimeout(() => setShowDifficultyPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [shouldPrompt]);

  // Auto-trigger early recalibration on 3 consecutive skips
  useEffect(() => {
    if (shouldTriggerEarlyRecalibration && !isRecalibrating) {
      dismissEarlyRecalibration();
      triggerEarlyRecalibration('simplify').then(() => {
        generatePlanAdjustment("I noticed you've been skipping tasks — I've simplified the next few days to help you get back on track.");
        addNotification({ type: 'plan_adjustment', title: 'Plan Auto-Adjusted', body: 'Your plan was simplified after 3 consecutive skips.' });
        setUnreadCount(c => c + 1);
      });
    }
  }, [shouldTriggerEarlyRecalibration]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSimplify = () => {
    dismiss();
    setShowDifficultyPrompt(false);
    triggerEarlyRecalibration('simplify').then(() => {
      generatePlanAdjustment("I've simplified your remaining week — fewer tasks, shorter sessions. Sustainable beats fast every time.");
      addNotification({ type: 'plan_adjustment', title: 'Plan Simplified', body: 'Your remaining week tasks have been adjusted for a gentler pace.' });
      setUnreadCount(c => c + 1);
    });
  };

  const handleExtend = () => {
    dismiss();
    setShowDifficultyPrompt(false);
    triggerEarlyRecalibration('extend').then(() => {
      generatePlanAdjustment("I've extended your roadmap by 1–2 weeks. The goal hasn't changed — just the pace. You'll get there.");
      addNotification({ type: 'plan_adjustment', title: 'Timeline Extended', body: "Your roadmap has been extended by 1-2 weeks." });
      setUnreadCount(c => c + 1);
    });
  };

  const handleKeep = () => {
    dismiss();
    setShowDifficultyPrompt(false);
  };

  const totalCompleted = tasks.filter(t => t.completed).length;
  const totalMinutes = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.duration || 0), 0);
  const hoursInvested = Math.round((totalMinutes / 60) * 10) / 10;

  // Desktop-only: shift content right when sidebar is open
  const marginLeft = isMobile ? '0' : sidebarOpen ? '260px' : '0';
  const paddingLeft = isMobile ? '16px' : sidebarOpen ? tokens.spacing['4xl'] : 'calc(44px + 48px)';

  const renderView = () => {
    // Debug panel overrides all views when ?debug=agents is in URL
    if (showDebugPanel) return <AgentHealthDashboard />;

    switch (currentView) {
      case 'today':
        return <TodayView onNavigate={(v) => setCurrentView(v as Parameters<typeof setCurrentView>[0])} />;
      case 'roadmap':
        return <RoadmapView />;
      case 'insights':
        return <InsightsView />;
      case 'library':
        return <LibraryView />;
      case 'you':
        return <YouView />;
      default:
        return <TodayView onNavigate={(v) => setCurrentView(v as Parameters<typeof setCurrentView>[0])} />;
    }
  };

  const contentInner = (
    <>
      {/* Offline banner */}
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

      {/* Difficulty prompt — inline coach card (only on Today view) */}
      {showDifficultyPrompt && currentView === 'today' && (
        <DifficultyPrompt
          onSimplify={handleSimplify}
          onExtend={handleExtend}
          onKeep={handleKeep}
        />
      )}

      {/* Notification bell — shown when unread > 0 */}
      {unreadCount > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: tokens.spacing.sm }}>
          <button
            onClick={() => { setShowNotificationCenter(true); setUnreadCount(0); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: '99px',
              cursor: 'pointer',
              color: '#7c3aed',
            }}
          >
            <Bell size={13} strokeWidth={2} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>{unreadCount}</span>
          </button>
        </div>
      )}

      <ViewErrorBoundary>
        <Suspense fallback={
          <ViewSkeleton type={
            currentView === 'insights' ? 'progress'
            : currentView === 'roadmap' ? 'journey'
            : currentView === 'you'     ? 'me'
            : currentView === 'today'   ? 'today'
            : currentView === 'library' ? 'generic'
            : 'generic'
          } />
        }>
          <div key={currentView} style={{ animation: 'dashFadeIn 0.18s ease both' }}>
            {renderView()}
          </div>
        </Suspense>
      </ViewErrorBoundary>
    </>
  );

  // If it's a checkpoint day, show checkpoint screen instead of normal views
  if (checkpointData) {
    return (
      <div style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: tokens.colors.background,
      }}>
        {!isMobile && (
          <DashboardSidebar
            currentView={currentView}
            onViewChange={setCurrentView}
            onCoachOpen={() => setCoachOpen(true)}
            isOpen={sidebarOpen}
            onToggle={setSidebarOpen}
          />
        )}

        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          transition: 'margin-left 500ms cubic-bezier(0.23, 1, 0.32, 1)',
          marginLeft,
        }}>
          <div style={{
            width: '100%',
            maxWidth: '800px',
            padding: isMobile ? '20px 16px' : `${tokens.spacing['4xl']} ${tokens.spacing['4xl']}`,
            paddingLeft,
            paddingBottom: isMobile ? 'calc(96px + env(safe-area-inset-bottom))' : undefined,
          }}>
            <ViewErrorBoundary>
              <CheckpointScreen
                checkpointDay={currentDay}
                sprintNumber={getSprintNumber(currentDay)}
                completedTasks={checkpointData.completedTasks}
                totalTasks={checkpointData.totalTasks}
                avgDifficulty={checkpointData.avgDifficulty}
                strugglingAreas={checkpointData.strugglingAreas}
                masteringAreas={checkpointData.masteringAreas}
                onComplete={handleCheckpointComplete}
                isRecalibrating={isRecalibrating}
                recalibrationResult={recalibrationResult}
              />
            </ViewErrorBoundary>
          </div>
        </div>

        {isMobile && (
          <BottomNav activeTab={currentView} onTabChange={setCurrentView} />
        )}
      </div>
    );
  }

  // Normal dashboard view
  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: tokens.colors.background,
    }}>
      {!isMobile && (
        <DashboardSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onCoachOpen={() => setCoachOpen(true)}
          isOpen={sidebarOpen}
          onToggle={setSidebarOpen}
        />
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        transition: 'margin-left 500ms cubic-bezier(0.23, 1, 0.32, 1)',
        marginLeft,
      }}>
        <div style={{
          width: '100%',
          maxWidth: '800px',
          padding: isMobile ? '20px 16px' : `${tokens.spacing['4xl']} ${tokens.spacing['4xl']}`,
          paddingLeft,
          // Extra bottom padding on mobile so content isn't hidden behind BottomNav
          paddingBottom: isMobile ? 'calc(96px + env(safe-area-inset-bottom))' : undefined,
        }}>
          {contentInner}
        </div>
      </div>

      {isMobile && (
        <BottomNav activeTab={currentView} onTabChange={setCurrentView} />
      )}

      {/* Coach Thread */}
      <CoachThread isOpen={coachOpen} onClose={() => setCoachOpen(false)} />

      {/* Modals */}
      {showNotificationCenter && (
        <NotificationCenter onClose={() => setShowNotificationCenter(false)} />
      )}

      {showShareCard && (
        <ShareableCard
          streak={streak}
          tasksCompleted={totalCompleted}
          hoursInvested={hoursInvested}
          domain={currentGoal.category || currentGoal.specificGoal || 'Your Goal'}
          onClose={() => setShowShareCard(false)}
        />
      )}
    </div>
  );
}
