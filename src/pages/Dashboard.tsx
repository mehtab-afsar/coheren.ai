import { useState } from 'react';
import { tokens } from '../design-system';
import DashboardSidebar from '../components/DashboardSidebar';
import TodayView from '../components/views/TodayView';
import JourneyView from '../components/views/JourneyView';
import ProfileView from '../components/views/ProfileView';
import ProgressView from '../components/views/ProgressView';
import GoalsView from '../components/views/GoalsView';
import SettingsView from '../components/views/SettingsView';

type ViewType = 'today' | 'journey' | 'profile' | 'progress' | 'goals' | 'settings';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

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
