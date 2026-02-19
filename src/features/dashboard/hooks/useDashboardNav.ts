import { useState } from 'react';

type ViewType = 'today' | 'journey' | 'profile' | 'progress' | 'goals' | 'library';

export function useDashboardNav() {
  const [currentView, setCurrentView] = useState<ViewType>('today');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

  return {
    currentView,
    setCurrentView,
    sidebarOpen,
    setSidebarOpen,
  };
}
