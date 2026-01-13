import { Home, User, TrendingUp, Target, Settings, Menu, X, Map } from 'lucide-react';
import { useState } from 'react';
import { tokens } from '../design-system';

interface DashboardSidebarProps {
  currentView: 'today' | 'profile' | 'progress' | 'goals' | 'journey' | 'settings';
  onViewChange: (view: 'today' | 'profile' | 'progress' | 'goals' | 'journey' | 'settings') => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

export default function DashboardSidebar({ currentView, onViewChange, isOpen: controlledIsOpen, onToggle }: DashboardSidebarProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(() => {
    // Default to open on desktop, closed on mobile
    return window.innerWidth >= 768;
  });

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const setIsOpen = (open: boolean) => {
    if (onToggle) {
      onToggle(open);
    } else {
      setInternalIsOpen(open);
    }
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
      {/* Toggle Button - Only shown when sidebar is closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            top: tokens.spacing.xl,
            left: tokens.spacing.xl,
            zIndex: 1000,
            width: '44px',
            height: '44px',
            backgroundColor: tokens.colors.surface,
            border: `1px solid ${tokens.colors.borderLight}`,
            borderRadius: tokens.borderRadius.md,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: tokens.shadows.sm,
            transition: 'all 500ms cubic-bezier(0.23, 1, 0.32, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
            e.currentTarget.style.boxShadow = tokens.shadows.md;
            e.currentTarget.style.borderColor = tokens.colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = tokens.shadows.sm;
            e.currentTarget.style.borderColor = tokens.colors.borderLight;
          }}
          aria-label="Open sidebar"
        >
          <Menu size={20} strokeWidth={1.5} color={tokens.colors.text.secondary} />
        </button>
      )}

      {/* Sidebar - Premium with breathable spacing */}
      <div
        style={{
          position: 'fixed',
          left: isOpen ? '0' : '-260px',
          top: 0,
          width: '260px',
          height: '100vh',
          backgroundColor: tokens.colors.surface,
          borderRight: `1px solid ${tokens.colors.borderLight}`,
          transition: 'left 500ms cubic-bezier(0.23, 1, 0.32, 1)',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Logo with Close Button */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: `${tokens.spacing.xl} ${tokens.spacing.xl}`,
          borderBottom: `1px solid ${tokens.colors.borderLight}`,
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontSize: tokens.typography.sizes.xl,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.xs,
            }}>
              Coheren
            </h2>
            <p style={{
              fontSize: tokens.typography.sizes.xs,
              fontWeight: tokens.typography.weights.light,
              color: tokens.colors.text.tertiary,
              fontStyle: 'italic',
            }}>
              Think less. Do more.
            </p>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: tokens.borderRadius.sm,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: tokens.transitions.all,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = tokens.colors.state.hover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="Close sidebar"
          >
            <X size={18} strokeWidth={1.5} color={tokens.colors.text.tertiary} />
          </button>
        </div>

        {/* Navigation - Premium spacing with top gap */}
        <nav style={{
          flex: 1,
          padding: `${tokens.spacing['2xl']} 0`,
          paddingTop: tokens.spacing.xl,
        }}>
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
                  padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
                  backgroundColor: isActive ? tokens.colors.primarySubtle : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? `2px solid ${tokens.colors.primary}` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: tokens.transitions.all,
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = tokens.colors.state.hover;
                    e.currentTarget.style.transform = 'translateX(2px)';
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
                  size={20}
                  strokeWidth={1.5}
                  color={isActive ? tokens.colors.primary : tokens.colors.text.secondary}
                />
                <span style={{
                  fontSize: tokens.typography.sizes.base,
                  color: isActive ? tokens.colors.primary : tokens.colors.text.primary,
                  fontWeight: isActive ? tokens.typography.weights.regular : tokens.typography.weights.light,
                }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{
          padding: tokens.spacing.xl,
          borderTop: `1px solid ${tokens.colors.borderLight}`,
        }}>
          <p style={{
            fontSize: tokens.typography.sizes.xs,
            fontWeight: tokens.typography.weights.light,
            color: tokens.colors.text.tertiary,
            textAlign: 'center',
          }}>
            v1.0.0
          </p>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998,
            display: window.innerWidth < 768 ? 'block' : 'none',
          }}
        />
      )}
    </>
  );
}
