import { useState } from 'react';
import { tokens } from '../design-system';
import DashboardSidebar from '../components/DashboardSidebar';
import TodayView from '../components/views/TodayView';
import ProfileView from '../components/views/ProfileView';
import ProgressView from '../components/views/ProgressView';
import GoalsView from '../components/views/GoalsView';
import SettingsView from '../components/views/SettingsView';

type ViewType = 'today' | 'profile' | 'progress' | 'goals' | 'settings';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState<ViewType>('today');

  const renderView = () => {
    switch (currentView) {
      case 'today':
        return <TodayView />;
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
      backgroundColor: tokens.colors.gray[50],
    }}>
      {/* Sidebar */}
      <DashboardSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
      />

      {/* Main Content */}
      <div style={{
        flex: 1,
        marginLeft: '260px', // Sidebar width
        padding: tokens.spacing['3xl'],
        transition: 'margin-left 0.3s ease',
      }}>
        {renderView()}
      </div>
    </div>
  );
}
