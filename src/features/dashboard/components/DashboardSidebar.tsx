import { Home, User, TrendingUp, Target, Settings, Menu, X, Map } from 'lucide-react';
import { useState } from 'react';
import { tokens } from '@core/design-system';
import { useStore } from '@core/store/useStore';
import { Icons } from '@shared/components/ui/icons';

interface DashboardSidebarProps {
  currentView: 'today' | 'profile' | 'progress' | 'goals' | 'journey' | 'settings';
  onViewChange: (view: 'today' | 'profile' | 'progress' | 'goals' | 'journey' | 'settings') => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

const SIDEBAR_BG = '#08080f';
const SIDEBAR_BORDER = 'rgba(255,255,255,0.06)';
const NAV_INACTIVE = 'rgba(255,255,255,0.4)';
const NAV_ACTIVE_TEXT = '#c4b5fd';
const NAV_ACTIVE_BG = 'rgba(124,58,237,0.12)';
const NAV_ACTIVE_BORDER = '#7c3aed';
const NAV_HOVER_BG = 'rgba(255,255,255,0.05)';

export default function DashboardSidebar({ currentView, onViewChange, isOpen: controlledIsOpen, onToggle }: DashboardSidebarProps) {
  const setStep = useStore((state) => state.setStep);
  const [internalIsOpen, setInternalIsOpen] = useState(() => {
    return window.innerWidth >= 768;
  });

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onToggle) onToggle(open);
    else setInternalIsOpen(open);
  };

  const menuItems = [
    { id: 'today' as const, label: 'Today', icon: Home },
    { id: 'journey' as const, label: 'Journey', icon: Map },
    { id: 'progress' as const, label: 'Progress', icon: TrendingUp },
    { id: 'goals' as const, label: 'Goals', icon: Target },
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Toggle button — shown when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            top: tokens.spacing.xl,
            left: tokens.spacing.xl,
            zIndex: 1000,
            width: '40px',
            height: '40px',
            backgroundColor: SIDEBAR_BG,
            border: `1px solid ${SIDEBAR_BORDER}`,
            borderRadius: tokens.borderRadius.md,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            transition: 'all 200ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)';
            e.currentTarget.style.backgroundColor = '#0f0f1a';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = SIDEBAR_BORDER;
            e.currentTarget.style.backgroundColor = SIDEBAR_BG;
          }}
          aria-label="Open sidebar"
        >
          <Menu size={18} strokeWidth={1.5} color="rgba(255,255,255,0.6)" />
        </button>
      )}

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          left: isOpen ? '0' : '-260px',
          top: 0,
          width: '260px',
          height: '100vh',
          backgroundColor: SIDEBAR_BG,
          borderRight: `1px solid ${SIDEBAR_BORDER}`,
          transition: 'left 500ms cubic-bezier(0.23, 1, 0.32, 1)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo + Close */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
          borderBottom: `1px solid ${SIDEBAR_BORDER}`,
        }}>
          <button
            onClick={() => {
              setStep(0);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.md,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              textAlign: 'left',
            }}
          >
            <Icons.logo style={{ width: '22px', height: '22px', color: '#7c3aed' }} />
            <div>
              <h2 style={{
                fontSize: tokens.typography.sizes.base,
                fontWeight: tokens.typography.weights.medium,
                color: 'rgba(255,255,255,0.92)',
                marginBottom: 0,
                letterSpacing: '-0.01em',
              }}>
                coheren.ai
              </h2>
              <p style={{
                fontSize: tokens.typography.sizes.xs,
                fontWeight: tokens.typography.weights.light,
                color: 'rgba(255,255,255,0.25)',
                margin: 0,
                letterSpacing: '0.01em',
              }}>
                Think less. Do more.
              </p>
            </div>
          </button>

          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: '28px',
              height: '28px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: tokens.borderRadius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            aria-label="Close sidebar"
          >
            <X size={16} strokeWidth={1.5} color="rgba(255,255,255,0.3)" />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: `${tokens.spacing.lg} 0` }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.md,
                  padding: `10px ${tokens.spacing.xl}`,
                  backgroundColor: isActive ? NAV_ACTIVE_BG : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? `2px solid ${NAV_ACTIVE_BORDER}` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = NAV_HOVER_BG;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon
                  size={17}
                  strokeWidth={1.5}
                  color={isActive ? NAV_ACTIVE_TEXT : NAV_INACTIVE}
                />
                <span style={{
                  fontSize: tokens.typography.sizes.sm,
                  color: isActive ? NAV_ACTIVE_TEXT : NAV_INACTIVE,
                  fontWeight: isActive ? tokens.typography.weights.medium : tokens.typography.weights.light,
                  letterSpacing: isActive ? '-0.01em' : 'normal',
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
          borderTop: `1px solid ${SIDEBAR_BORDER}`,
        }}>
          <p style={{
            fontSize: '11px',
            fontWeight: tokens.typography.weights.light,
            color: 'rgba(255,255,255,0.15)',
            textAlign: 'center',
            letterSpacing: '0.05em',
          }}>
            v1.0.0
          </p>
        </div>
      </div>

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 998,
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: window.innerWidth < 768 ? 'block' : 'none',
          }}
        />
      )}
    </>
  );
}
