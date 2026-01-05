import { Home, User, TrendingUp, Target, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { tokens, text } from '../design-system';

interface DashboardSidebarProps {
  currentView: 'today' | 'profile' | 'progress' | 'goals' | 'settings';
  onViewChange: (view: 'today' | 'profile' | 'progress' | 'goals' | 'settings') => void;
}

export default function DashboardSidebar({ currentView, onViewChange }: DashboardSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);

  const menuItems = [
    { id: 'today' as const, label: 'Today', icon: Home },
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'progress' as const, label: 'Progress', icon: TrendingUp },
    { id: 'goals' as const, label: 'Goals', icon: Target },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: tokens.spacing.lg,
          left: tokens.spacing.lg,
          zIndex: 1000,
          width: '40px',
          height: '40px',
          backgroundColor: tokens.colors.primary,
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-label="Toggle sidebar"
      >
        {isOpen ? (
          <X size={20} color={tokens.colors.text.inverse} />
        ) : (
          <Menu size={20} color={tokens.colors.text.inverse} />
        )}
      </button>

      {/* Sidebar */}
      <div
        style={{
          position: 'fixed',
          left: isOpen ? '0' : '-260px',
          top: 0,
          width: '260px',
          height: '100vh',
          backgroundColor: tokens.colors.background,
          borderRight: `1px solid ${tokens.colors.gray[200]}`,
          transition: 'left 0.3s ease',
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '80px', // Space for toggle button
        }}
      >
        {/* Logo */}
        <div style={{ padding: `${tokens.spacing.xl} ${tokens.spacing.xl}` }}>
          <h2 style={{
            ...text.h2,
            marginBottom: tokens.spacing.xs,
          }}>
            Coheren
          </h2>
          <p style={{
            ...text.caption,
            color: tokens.colors.text.secondary,
          }}>
            AI Goal Coach
          </p>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: `${tokens.spacing.md} 0` }}>
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
                  padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                  backgroundColor: isActive ? tokens.colors.gray[50] : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? `3px solid ${tokens.colors.primary}` : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = tokens.colors.gray[50];
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Icon
                  size={20}
                  color={isActive ? tokens.colors.primary : tokens.colors.text.secondary}
                />
                <span style={{
                  ...text.body,
                  color: isActive ? tokens.colors.primary : tokens.colors.text.primary,
                  fontWeight: isActive ? tokens.typography.weights.medium : tokens.typography.weights.light,
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
          borderTop: `1px solid ${tokens.colors.gray[200]}`,
        }}>
          <p style={{
            ...text.caption,
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
