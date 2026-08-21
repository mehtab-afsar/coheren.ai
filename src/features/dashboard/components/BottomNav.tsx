import { Home, Map, MessageSquare, BarChart2, BookMarked, User } from 'lucide-react';
import type { ViewType } from '../hooks/useDashboardNav';
import { useCoachMessages } from '../hooks/useCoachMessages';

interface BottomNavProps {
  activeTab: ViewType;
  onTabChange: (tab: ViewType) => void;
}

const TABS: {
  id: ViewType;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
}[] = [
  { id: 'today',    label: 'Today',    icon: Home },
  { id: 'roadmap',  label: 'Journey',  icon: Map },
  { id: 'coach',    label: 'Coach',    icon: MessageSquare },
  { id: 'insights', label: 'Progress', icon: BarChart2 },
  { id: 'library',  label: 'Library',  icon: BookMarked },
  { id: 'you',      label: 'You',      icon: User },
];

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { getMessages } = useCoachMessages();
  const unreadCoach = getMessages().filter(m => !m.read).length;

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'stretch',
        backgroundColor: '#ffffff',
        borderTop: '1px solid var(--c-border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -1px 0 rgba(0,0,0,0.06)',
      }}
    >
      {TABS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        const showBadge = id === 'coach' && unreadCoach > 0 && !active;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              height: 56,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 2px',
              position: 'relative',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
          >
            {/* Active indicator — top bar */}
            {active && (
              <span style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 24,
                height: 2,
                borderRadius: '0 0 2px 2px',
                backgroundColor: 'var(--c-accent-purple)',
              }} />
            )}

            <div style={{ position: 'relative' }}>
              <Icon
                size={20}
                strokeWidth={active ? 2.2 : 1.5}
                color={active ? 'var(--c-accent-purple)' : 'var(--c-text-tertiary)'}
              />
              {showBadge && (
                <span style={{
                  position: 'absolute',
                  top: -3,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: 'var(--c-accent-red)',
                  border: '1.5px solid #fff',
                }} />
              )}
            </div>

            <span style={{
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--c-accent-purple)' : 'var(--c-text-tertiary)',
              letterSpacing: '0.01em',
              lineHeight: 1,
              fontFamily: 'var(--c-font-body)',
              transition: 'color 0.12s ease',
            }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
