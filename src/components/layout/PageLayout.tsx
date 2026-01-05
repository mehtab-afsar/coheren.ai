import { useState, useEffect } from 'react';
import { tokens } from '../../design-system';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';

interface PageLayoutProps {
  children: React.ReactNode;
  variant?: 'onboarding' | 'app' | 'modal';
  maxWidth?: 'narrow' | 'standard' | 'comfortable' | 'wide' | 'full';
  showSidebar?: boolean;
  currentSection?: 'home' | 'progress' | 'goals' | 'library';
  onNavigate?: (section: 'home' | 'progress' | 'goals' | 'library' | 'settings') => void;
}

const PAGE_WIDTHS = {
  narrow: '448px',
  standard: '500px',
  comfortable: '600px',
  wide: '672px',
  full: '100%',
};

export function PageLayout({
  children,
  variant = 'onboarding',
  maxWidth = 'standard',
  showSidebar = true,
  currentSection = 'home',
  onNavigate,
}: PageLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Onboarding variant - centered content, no sidebar
  if (variant === 'onboarding') {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tokens.colors.background,
          padding: `${tokens.spacing['3xl']} ${tokens.spacing.xl}`,
        }}
      >
        <div
          style={{
            maxWidth: PAGE_WIDTHS[maxWidth],
            width: '100%',
          }}
        >
          {children}
        </div>
      </div>
    );
  }

  // Modal variant - overlay with backdrop
  if (variant === 'modal') {
    return (
      <>
        {/* Backdrop */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
          }}
        />

        {/* Modal content */}
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '90%',
            maxWidth: PAGE_WIDTHS[maxWidth],
            backgroundColor: tokens.colors.background,
            borderRadius: tokens.borderRadius.lg,
            boxShadow:
              '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 1000,
            maxHeight: '90vh',
            overflow: 'auto',
          }}
        >
          {children}
        </div>
      </>
    );
  }

  // App variant - with sidebar/mobile nav
  if (variant === 'app') {
    const sidebarWidth = sidebarCollapsed ? '60px' : '240px';

    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: tokens.colors.gray[50],
        }}
      >
        {/* Desktop Sidebar */}
        {!isMobile && showSidebar && (
          <Sidebar
            isCollapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            currentSection={currentSection}
            onNavigate={onNavigate || (() => {})}
          />
        )}

        {/* Main Content */}
        <div
          style={{
            marginLeft: !isMobile && showSidebar ? sidebarWidth : '0',
            paddingBottom: isMobile && showSidebar ? '60px' : '0',
            transition: `margin-left ${tokens.transitions.medium}`,
            minHeight: '100vh',
          }}
        >
          <div
            style={{
              maxWidth: maxWidth === 'full' ? '100%' : PAGE_WIDTHS[maxWidth],
              margin: '0 auto',
            }}
          >
            {children}
          </div>
        </div>

        {/* Mobile Bottom Nav */}
        {isMobile && showSidebar && (
          <MobileNav
            currentSection={currentSection}
            onNavigate={onNavigate || (() => {})}
          />
        )}
      </div>
    );
  }

  return null;
}
