import { useState, useEffect, lazy, Suspense } from 'react';
import { Bell } from 'lucide-react';
import { ap } from '@core/design-system/appleTokens';
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
const CoachView    = lazy(() => import('./views/CoachView'));
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
  const { checkpointData, isRecalibrating, recalibrationResult, recalibrationError, clearRecalibrationError, handleCheckpointComplete, triggerEarlyRecalibration } = useCheckpoint();
  const { isMobile } = useBreakpoint();
  const { shouldPrompt, shouldTriggerEarlyRecalibration, dismiss, dismissEarlyRecalibration } = useDifficultyMonitor();
  const { isOnline, pendingCount } = useOfflineSync();

  const currentDay = useStore(s => s.currentDay);
  const tasks = useStore(s => s.tasks);
  const streak = useStore(s => s.streak);
  const currentGoal = useStore(s => s.currentGoal);

  const { generateStreakMessage, generatePlanAdjustment } = useCoachMessages();

  const pendingWeeklyCheckIn = useStore(s => s.pendingWeeklyCheckIn);
  const [showDifficultyPrompt, setShowDifficultyPrompt] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  // Auto-open Coach panel when a weekly check-in is pending
  useEffect(() => {
    if (pendingWeeklyCheckIn !== null) {
      setCoachOpen(true);
    }
  }, [pendingWeeklyCheckIn]);
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
      case 'coach':
        return <CoachView />;
      default:
        return <TodayView onNavigate={(v) => setCurrentView(v as Parameters<typeof setCurrentView>[0])} />;
    }
  };

  // If it's a checkpoint day, show checkpoint screen instead of normal views
  if (checkpointData) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: ap.bg, fontFamily: ap.font }}>
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
          marginLeft: isMobile ? 0 : 220,
          minHeight: '100vh',
          paddingBottom: isMobile ? 80 : 0,
        }}>
          <div style={{ maxWidth: 780, margin: '0 auto', padding: isMobile ? '20px 16px' : '28px 36px' }}>
            <ViewErrorBoundary>
              <CheckpointScreen
                checkpointDay={currentDay}
                sprintNumber={getSprintNumber(currentDay)}
                completedTasks={checkpointData.completedTasks}
                totalTasks={checkpointData.totalTasks}
                avgDifficulty={checkpointData.avgDifficulty}
                strugglingAreas={checkpointData.strugglingAreas}
                masteringAreas={checkpointData.masteringAreas}
                onComplete={() => { handleCheckpointComplete(); }}
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: ap.bg, fontFamily: ap.font }}>
      {/* Sidebar — desktop only */}
      {!isMobile && (
        <DashboardSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          onCoachOpen={() => setCoachOpen(true)}
          isOpen={sidebarOpen}
          onToggle={setSidebarOpen}
        />
      )}

      {/* Main content */}
      <div style={{
        flex: 1,
        marginLeft: isMobile ? 0 : 220,
        minHeight: '100vh',
        paddingBottom: isMobile ? 80 : 0,
      }}>
        {/* Top bar — bell icon */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 30,
          backgroundColor: ap.bg,
          borderBottom: `1px solid ${ap.border}`,
          padding: '12px 36px',
          display: 'flex', justifyContent: 'flex-end',
          alignItems: 'center',
        }}>
          {/* Offline banner inline */}
          {!isOnline && <OfflineBanner pendingCount={pendingCount} />}
          <button
            onClick={() => { setShowNotificationCenter(true); setUnreadCount(0); }}
            style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: ap.textSecondary, display: 'flex', alignItems: 'center' }}
          >
            <Bell size={19} strokeWidth={1.2} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: -3, right: -3,
                width: 14, height: 14, borderRadius: 7,
                backgroundColor: ap.streak, color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{unreadCount}</span>
            )}
          </button>
        </div>

        {/* Page content */}
        <div style={{
          maxWidth: 780, margin: '0 auto',
          padding: isMobile ? '20px 16px' : '28px 36px',
          animation: 'apFadeIn 0.3s ease',
        }}>
          {/* Difficulty prompt — inline coach card (only on Today view) */}
          {showDifficultyPrompt && currentView === 'today' && (
            <DifficultyPrompt
              onSimplify={handleSimplify}
              onExtend={handleExtend}
              onKeep={handleKeep}
            />
          )}

          <ViewErrorBoundary>
            <Suspense fallback={
              <ViewSkeleton type={
                currentView === 'insights' ? 'progress'
                : currentView === 'roadmap'  ? 'journey'
                : currentView === 'you'      ? 'me'
                : currentView === 'today'    ? 'today'
                : 'generic'
              } />
            }>
              <div key={currentView} style={{ animation: 'apFadeIn 0.3s ease' }}>
                {renderView()}
              </div>
            </Suspense>
          </ViewErrorBoundary>
        </div>
      </div>

      {/* BottomNav on mobile */}
      {isMobile && <BottomNav activeTab={currentView} onTabChange={setCurrentView} />}

      {/* Coach Thread */}
      <CoachThread isOpen={coachOpen} onClose={() => setCoachOpen(false)} />

      {/* Notification Center */}
      {showNotificationCenter && (
        <NotificationCenter onClose={() => setShowNotificationCenter(false)} />
      )}

      {/* Shareable Card */}
      {showShareCard && (
        <ShareableCard
          streak={streak}
          tasksCompleted={totalCompleted}
          hoursInvested={hoursInvested}
          domain={currentGoal.category || currentGoal.specificGoal || 'Your Goal'}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {/* Recalibration error toast */}
      {recalibrationError && (
        <div style={{
          position: 'fixed',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3000,
          background: '#fff',
          border: '1px solid #fca5a5',
          borderRadius: 14,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          maxWidth: 360,
          width: 'calc(100% - 40px)',
        }}>
          <span style={{ fontSize: 13, color: '#dc2626', flex: 1 }}>
            {recalibrationError}
          </span>
          <button
            onClick={clearRecalibrationError}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, padding: 0, lineHeight: 1 }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
