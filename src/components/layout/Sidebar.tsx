import { Home, TrendingUp, Target, Library, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { tokens, text } from '../../design-system';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  currentSection: 'home' | 'progress' | 'goals' | 'library';
  onNavigate: (section: 'home' | 'progress' | 'goals' | 'library' | 'settings') => void;
}

export function Sidebar({ isCollapsed, onToggle, currentSection, onNavigate }: SidebarProps) {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'progress' as const, label: 'Progress', icon: TrendingUp },
    { id: 'goals' as const, label: 'Goals', icon: Target },
    { id: 'library' as const, label: 'Library', icon: Library },
  ];

  const sidebarWidth = isCollapsed ? '60px' : '240px';

  return (
    <div
      style={{
        width: sidebarWidth,
        height: '100vh',
        backgroundColor: tokens.colors.background,
        borderRight: `1px solid ${tokens.colors.gray[200]}`,
        display: 'flex',
        flexDirection: 'column',
        transition: `width ${tokens.transitions.medium}`,
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo / Brand */}
      <div
        style={{
          padding: tokens.spacing.xl,
          borderBottom: `1px solid ${tokens.colors.gray[200]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
        }}
      >
        {!isCollapsed && (
          <h1
            style={{
              ...text.h4,
              fontWeight: tokens.typography.weights.medium,
            }}
          >
            CONSIST
          </h1>
        )}
        <button
          onClick={onToggle}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: tokens.transitions.colors,
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = tokens.colors.gray[50])
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')
          }
        >
          {isCollapsed ? (
            <ChevronRight size={16} color={tokens.colors.text.secondary} />
          ) : (
            <ChevronLeft size={16} color={tokens.colors.text.secondary} />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav
        style={{
          flex: 1,
          padding: tokens.spacing.md,
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.xs,
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.md,
                padding: tokens.spacing.md,
                borderRadius: tokens.borderRadius.md,
                border: 'none',
                backgroundColor: isActive
                  ? tokens.colors.text.primary
                  : 'transparent',
                color: isActive
                  ? tokens.colors.primary
                  : tokens.colors.text.secondary,
                cursor: 'pointer',
                transition: tokens.transitions.colors,
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = tokens.colors.gray[50];
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Icon size={20} />
              {!isCollapsed && <span style={text.body}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div
        style={{
          padding: tokens.spacing.md,
          borderTop: `1px solid ${tokens.colors.gray[200]}`,
        }}
      >
        <button
          onClick={() => onNavigate('settings')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.md,
            padding: tokens.spacing.md,
            borderRadius: tokens.borderRadius.md,
            border: 'none',
            backgroundColor: 'transparent',
            color: tokens.colors.text.secondary,
            cursor: 'pointer',
            transition: tokens.transitions.colors,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            width: '100%',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = tokens.colors.gray[50])
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'transparent')
          }
        >
          <Settings size={20} />
          {!isCollapsed && <span style={text.body}>Settings</span>}
        </button>
      </div>
    </div>
  );
}
