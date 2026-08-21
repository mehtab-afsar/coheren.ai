import type { ReactNode } from 'react';
import { ap } from '@core/design-system/appleTokens';
import { PageContainer } from '@shared/components/layout/PageContainer';
import DashboardSidebar, { SIDEBAR_WIDTH } from './DashboardSidebar';
import BottomNav from './BottomNav';
import type { ViewType } from '../hooks/useDashboardNav';

interface DashboardShellProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onCoachOpen: () => void;
  sidebarOpen: boolean;
  onSidebarToggle: (open: boolean) => void;
  isMobile: boolean;
  /** Content column width — passed through to PageContainer. */
  maxWidth?: number;
  /** Sticky bar above the content column (e.g. the bell/notifications row). */
  topBar?: ReactNode;
  children: ReactNode;
}

/**
 * The dashboard chrome — sidebar (desktop) or BottomNav (mobile) plus the
 * content column. Single owner of that structure so it isn't hand-copied
 * per render branch (it previously was, once for the checkpoint screen and
 * once for the normal view, and would drift the moment only one got edited).
 */
export function DashboardShell({
  currentView,
  onViewChange,
  onCoachOpen,
  sidebarOpen,
  onSidebarToggle,
  isMobile,
  maxWidth = 1120,
  topBar,
  children,
}: DashboardShellProps) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: ap.bg, fontFamily: ap.font }}>
      {!isMobile && (
        <DashboardSidebar
          currentView={currentView}
          onViewChange={onViewChange}
          onCoachOpen={onCoachOpen}
          isOpen={sidebarOpen}
          onToggle={onSidebarToggle}
        />
      )}

      <div style={{
        flex: 1,
        marginLeft: isMobile ? 0 : SIDEBAR_WIDTH,
        minHeight: '100vh',
        paddingBottom: isMobile ? 80 : 0,
      }}>
        {topBar}
        <PageContainer maxWidth={maxWidth} isMobile={isMobile}>
          {children}
        </PageContainer>
      </div>

      {isMobile && <BottomNav activeTab={currentView} onTabChange={onViewChange} />}
    </div>
  );
}
