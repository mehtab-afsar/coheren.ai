import { useState, useCallback } from 'react';
import { track } from '@lib/analytics';

export type ViewType = 'today' | 'roadmap' | 'insights' | 'library' | 'you';

export function useDashboardNav() {
  const [currentView, setCurrentViewRaw] = useState<ViewType>('today');
  // Sidebar open by default on desktop only — matchMedia for sync init
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    window.matchMedia('(min-width: 768px)').matches
  );

  const setCurrentView = useCallback((view: ViewType) => {
    setCurrentViewRaw(view);
    track({ event: 'view_changed', properties: { view } });
  }, []);

  return {
    currentView,
    setCurrentView,
    sidebarOpen,
    setSidebarOpen,
  };
}
