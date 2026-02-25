import { tokens } from '@core/design-system';
import DashboardSidebar from '@features/dashboard/components/DashboardSidebar';
import BottomNav from '@features/dashboard/components/BottomNav';
import TodayView from './views/TodayView';
import JourneyView from './views/JourneyView';
import ProfileView from './views/ProfileView';
import ProgressView from './views/ProgressView';
import GoalsView from './views/GoalsView';
import LibraryView from './views/LibraryView';

import CheckpointScreen from '@features/dashboard/components/CheckpointScreen';
import { getSprintNumber } from '@lib/checkpointHelpers';
import { useStore } from '@core/store/useStore';
import { useCheckpoint } from './hooks/useCheckpoint';
import { useDashboardNav } from './hooks/useDashboardNav';
import { useBreakpoint } from '@hooks/useBreakpoint';
import { useNotifications } from '@hooks/useNotifications';

export default function Dashboard() {
  useNotifications();
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useDashboardNav();
  const { checkpointData, isRecalibrating, recalibrationResult, handleCheckpointComplete } = useCheckpoint();
  const { isMobile } = useBreakpoint();

  const currentDay = useStore((state) => state.currentDay);

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
          <div key={currentView} style={{ animation: 'dashFadeIn 0.18s ease both' }}>
            {renderView()}
          </div>
        </div>
      </div>

      {isMobile && (
        <BottomNav activeTab={currentView} onTabChange={setCurrentView} onFocusTap={handleFocusTap} />
      )}
    </div>
  );
}
