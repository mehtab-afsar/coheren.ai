import { Home, TrendingUp, Target, Library } from 'lucide-react';
import { tokens, text } from '../../design-system';

interface MobileNavProps {
  currentSection: 'home' | 'progress' | 'goals' | 'library';
  onNavigate: (section: 'home' | 'progress' | 'goals' | 'library') => void;
}

export function MobileNav({ currentSection, onNavigate }: MobileNavProps) {
  const navItems = [
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'progress' as const, label: 'Progress', icon: TrendingUp },
    { id: 'goals' as const, label: 'Goals', icon: Target },
    { id: 'library' as const, label: 'Library', icon: Library },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: tokens.colors.background,
        borderTop: `1px solid ${tokens.colors.gray[200]}`,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        zIndex: 200,
        paddingBottom: 'env(safe-area-inset-bottom)', // iOS safe area
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
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: tokens.spacing.xs,
              border: 'none',
              backgroundColor: 'transparent',
              color: isActive
                ? tokens.colors.text.primary
                : tokens.colors.text.tertiary,
              cursor: 'pointer',
              padding: tokens.spacing.sm,
              transition: tokens.transitions.colors,
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = tokens.colors.text.secondary;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.color = tokens.colors.text.tertiary;
              }
            }}
          >
            <Icon size={20} />
            <span
              style={{
                ...text.caption,
                fontSize: tokens.typography.sizes.xs,
              }}
            >
              {item.label}
            </span>
            {isActive && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  width: '40px',
                  height: '2px',
                  backgroundColor: tokens.colors.text.primary,
                  borderRadius: tokens.borderRadius.full,
                }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
