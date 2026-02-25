import { Home, User, TrendingUp, Target, Menu, X, Map, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { tokens } from '@core/design-system';
import { useStore } from '@core/store/useStore';
import { Icons } from '@shared/components/ui/icons';
import { useUserLevel } from '@hooks/useUserLevel';

interface DashboardSidebarProps {
  currentView: 'today' | 'profile' | 'progress' | 'goals' | 'journey' | 'library';
  onViewChange: (view: 'today' | 'profile' | 'progress' | 'goals' | 'journey' | 'library') => void;
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
  const { universalProfile, roadmap } = useStore();
  const level = useUserLevel();

  const initials = universalProfile?.name
    ? universalProfile.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  const [internalIsOpen, setInternalIsOpen] = useState(() =>
    window.matchMedia('(min-width: 768px)').matches
  );

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
    { id: 'library' as const, label: 'Library', icon: BookOpen },
    { id: 'profile' as const, label: 'Profile', icon: User },
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
          background: 'linear-gradient(180deg, #08080f 0%, #0d0d1a 100%)',
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
                  transition: 'all 180ms cubic-bezier(0.4,0,0.2,1)',
                  textAlign: 'left',
                  boxShadow: isActive ? 'inset 0 0 28px rgba(124,58,237,0.07)' : 'none',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = NAV_HOVER_BG;
                    e.currentTarget.style.transform = 'translateX(3px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }
                }}
              >
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2 : 1.5}
                  color={isActive ? NAV_ACTIVE_TEXT : NAV_INACTIVE}
                  style={{ filter: isActive ? `drop-shadow(0 0 6px ${NAV_ACTIVE_TEXT}90)` : 'none', transition: 'all 180ms ease' }}
                />
                <span style={{
                  fontSize: tokens.typography.sizes.base,
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
          {/* User identity row */}
          {universalProfile?.name && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.md,
              marginBottom: tokens.spacing.lg,
              padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
              backgroundColor: 'rgba(124,58,237,0.07)',
              border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: tokens.borderRadius.md,
            }}>
              {/* Initials circle */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
                letterSpacing: '-0.01em',
              }}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.medium,
                  color: 'rgba(255,255,255,0.85)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {universalProfile.name}
                </p>
                {roadmap?.title && (
                  <p style={{
                    fontSize: '10px',
                    color: 'rgba(167,139,250,0.55)',
                    margin: '1px 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: tokens.typography.weights.light,
                    letterSpacing: '0.01em',
                  }}>
                    {roadmap.title}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Level badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: tokens.typography.weights.light, letterSpacing: '0.04em' }}>
              LEVEL
            </span>
            <span style={{
              fontSize: '11px',
              fontWeight: tokens.typography.weights.medium,
              color: level.color,
              letterSpacing: '0.04em',
              textTransform: 'uppercase' as const,
            }}>
              {level.label}
            </span>
          </div>
          {/* Progress bar toward next level */}
          <div style={{ height: '3px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '99px', overflow: 'hidden', marginBottom: '6px' }}>
            <div style={{
              height: '100%',
              width: `${level.progress}%`,
              backgroundColor: level.color,
              borderRadius: '99px',
              transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
              boxShadow: `0 0 6px ${level.color}80`,
            }} />
          </div>
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)', fontWeight: tokens.typography.weights.light, margin: 0, letterSpacing: '0.02em' }}>
            {level.tier === 'master' ? level.tagline : `${level.score} / ${level.nextAt} pts`}
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
            backgroundColor: 'rgba(0,0,0,0.45)',
            zIndex: 998,
            display: 'block',
          }}
        />
      )}
    </>
  );
}
