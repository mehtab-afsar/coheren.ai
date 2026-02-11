import { tokens } from '@core/design-system';
import DashboardSidebar from '@features/dashboard/components/DashboardSidebar';
import TodayView from './views/TodayView';
import JourneyView from './views/JourneyView';
import ProfileView from './views/ProfileView';
import ProgressView from './views/ProgressView';
import GoalsView from './views/GoalsView';
import SettingsView from './views/SettingsView';
import CheckpointScreen from '@features/dashboard/components/CheckpointScreen';
import { getSprintNumber } from '@lib/checkpointHelpers';
import { useStore } from '@core/store/useStore';
import { useCheckpoint } from './hooks/useCheckpoint';
import { useDashboardNav } from './hooks/useDashboardNav';

export default function Dashboard() {
  const { currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useDashboardNav();
  const { checkpointData, isRecalibrating, handleCheckpointComplete } = useCheckpoint();

  const currentDay = useStore((state) => state.currentDay);

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return <TodayView />;
      case 'journey':
        return <JourneyView />;
      case 'profile':
        return <ProfileView />;
      case 'progress':
        return <ProgressView />;
      case 'goals':
        return <GoalsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <TodayView />;
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
        {/* Sidebar */}
        <DashboardSidebar
          currentView={currentView}
          onViewChange={setCurrentView}
          isOpen={sidebarOpen}
          onToggle={setSidebarOpen}
        />

        {/* Checkpoint Screen */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          transition: 'margin-left 500ms cubic-bezier(0.23, 1, 0.32, 1)',
          marginLeft: sidebarOpen ? '260px' : '0',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '800px',
            padding: `${tokens.spacing['4xl']} ${tokens.spacing['4xl']}`,
            paddingLeft: sidebarOpen ? tokens.spacing['4xl'] : 'calc(44px + 48px)',
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
            />
          </div>
        </div>
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
      {/* Sidebar */}
      <DashboardSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={setSidebarOpen}
      />

      {/* Main Content - Centered with smooth transition */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        transition: 'margin-left 500ms cubic-bezier(0.23, 1, 0.32, 1)',
        marginLeft: sidebarOpen ? '260px' : '0',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '800px',
          padding: `${tokens.spacing['4xl']} ${tokens.spacing['4xl']}`,
          paddingLeft: sidebarOpen ? tokens.spacing['4xl'] : 'calc(44px + 48px)', // Space for toggle button
        }}>
          {renderView()}
        </div>
      </div>
    </div>
  );
}
