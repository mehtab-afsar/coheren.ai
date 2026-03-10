import { useState, useEffect, lazy, Suspense } from 'react';
import { Bell } from 'lucide-react';
import { tokens } from '@core/design-system';
import DashboardSidebar from '@features/dashboard/components/DashboardSidebar';
import BottomNav from '@features/dashboard/components/BottomNav';
import { ViewErrorBoundary } from '@features/dashboard/components/ViewErrorBoundary';
import { ViewSkeleton } from '@features/dashboard/components/ViewSkeleton';
// TodayView is the default landing — keep static for instant first paint
import TodayView from './views/TodayView';
// Remaining views are lazy-loaded for better initial bundle size
const JourneyView  = lazy(() => import('./views/JourneyView'));
const ProfileView  = lazy(() => import('./views/ProfileView'));
const ProgressView = lazy(() => import('./views/ProgressView'));
const GoalsView    = lazy(() => import('./views/GoalsView'));
const LibraryView  = lazy(() => import('./views/LibraryView'));

import CheckpointScreen from '@features/dashboard/components/CheckpointScreen';
import DifficultyPrompt from '@features/dashboard/components/DifficultyPrompt';
import OfflineBanner from '@features/dashboard/components/OfflineBanner';
import NotificationCenter, { getNotifications, addNotification } from '@features/dashboard/components/NotificationCenter';
import ShareableCard from '@features/dashboard/components/ShareableCard';

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
  const { checkpointData, isRecalibrating, recalibrationResult, handleCheckpointComplete } = useCheckpoint();
  const { isMobile } = useBreakpoint();
  const { shouldPrompt, dismiss } = useDifficultyMonitor();
  const { isOnline, pendingCount } = useOfflineSync();

  const currentDay = useStore(s => s.currentDay);
  const tasks = useStore(s => s.tasks);
  const streak = useStore(s => s.streak);
  const currentGoal = useStore(s => s.currentGoal);

  const [showDifficultyPrompt, setShowDifficultyPrompt] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => getNotifications().filter(n => !n.read).length);

  // Show difficulty prompt once cooldown clears
  useEffect(() => {
    if (shouldPrompt) {
      const timer = setTimeout(() => setShowDifficultyPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [shouldPrompt]);

  const handleSimplify = () => {
    addNotification({
      type: 'plan_adjustment',
      title: 'Plan Simplified',
      body: 'Your remaining week tasks have been adjusted for a gentler pace. Keep going — sustainable beats fast.',
    });
    dismiss();
    setShowDifficultyPrompt(false);
    setUnreadCount(c => c + 1);
  };

  const handleExtend = () => {
    addNotification({
      type: 'plan_adjustment',
      title: 'Timeline Extended',
      body: 'Your roadmap has been extended by 1–2 weeks. You'll get there — at the right pace.',
    });
    dismiss();
    setShowDifficultyPrompt(false);
    setUnreadCount(c => c + 1);
  };

  const handleKeep = () => {
    dismiss();
    setShowDifficultyPrompt(false);
  };

  const totalCompleted = tasks.filter(t => t.completed).length;
  const totalMinutes = tasks.filter(t => t.completed).reduce((sum, t) => sum + (t.duration || 0), 0);
  const hoursInvested = Math.round((totalMinutes / 60) * 10) / 10;

  const handleFocusTap = () => setCurrentView('today');

  // Desktop-only: shift content right when sidebar is open
  const marginLeft = isMobile ? '0' : sidebarOpen ? '260px' : '0';
  const paddingLeft = isMobile ? '16px' : sidebarOpen ? tokens.spacing['4xl'] : 'calc(44px + 48px)';

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return <TodayView onNavigate={setCurrentView} />;
      case 'journey':
        return <JourneyView />;
      case 'profile':
        return <ProfileView />;
      case 'progress':
        return <ProgressView />;
      case 'goals':
        return <GoalsView onNavigate={setCurrentView} />;
      case 'library':
        return <LibraryView />;
      default:
        return <TodayView onNavigate={setCurrentView} />;
    }
  };

  const contentInner = (
    <>
      {/* Offline banner */}
      {!isOnline && <OfflineBanner pendingCount={pendingCount} />}

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
            currentView === 'progress' ? 'progress'
            : currentView === 'journey' ? 'journey'
            : currentView === 'profile' ? 'me'
            : currentView === 'today'   ? 'today'
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
            paddingBottom: isMobile ? '96px' : undefined,
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
          <BottomNav activeTab={currentView} onTabChange={setCurrentView} onFocusTap={handleFocusTap} />
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
          paddingBottom: isMobile ? '96px' : undefined,
        }}>
          {contentInner}
        </div>
      </div>

      {isMobile && (
        <BottomNav activeTab={currentView} onTabChange={setCurrentView} onFocusTap={handleFocusTap} />
      )}

      {/* Modals */}
      {showDifficultyPrompt && (
        <DifficultyPrompt
          onSimplify={handleSimplify}
          onExtend={handleExtend}
          onKeep={handleKeep}
        />
      )}

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
