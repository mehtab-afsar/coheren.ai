import { Home, Map, User, TrendingUp, Play } from 'lucide-react';
import { tokens } from '@core/design-system';

type ViewType = 'today' | 'journey' | 'profile' | 'progress' | 'goals' | 'library';

interface BottomNavProps {
  activeTab: ViewType;
  onTabChange: (tab: ViewType) => void;
  onFocusTap: () => void;
}

const ACTIVE_COLOR = '#7c3aed';
const INACTIVE_COLOR = 'rgba(0,0,0,0.35)';

// New order: Today | Journey | [FAB] | Progress | Me
const LEFT_TABS = [
  { id: 'today'   as const, label: 'Today',   icon: Home },
  { id: 'journey' as const, label: 'Journey', icon: Map },
];

const RIGHT_TABS = [
  { id: 'progress' as const, label: 'Progress', icon: TrendingUp },
  { id: 'profile'  as const, label: 'Me',        icon: User },
];

type LucideIcon = React.ComponentType<{ size: number; strokeWidth: number; color: string; style?: React.CSSProperties }>;

function TabButton({
  id,
  label,
  icon: Icon,
  isActive,
  onTabChange,
}: {
  id: ViewType;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  onTabChange: (tab: ViewType) => void;
}) {
  return (
    <button
      onClick={() => onTabChange(id)}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        height: '60px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 4px',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <span style={{
          position: 'absolute',
          top: 6,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '4px',
          height: '4px',
          borderRadius: '99px',
          backgroundColor: ACTIVE_COLOR,
        }} />
      )}
      <Icon
        size={22}
        strokeWidth={isActive ? 2 : 1.5}
        color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
        style={{ transition: 'color 150ms ease' }}
      />
      {isActive && (
        <span style={{
          fontSize: '10px',
          fontWeight: tokens.typography.weights.medium,
          color: ACTIVE_COLOR,
          letterSpacing: '0.02em',
          lineHeight: 1,
        }}>
          {label}
        </span>
      )}
    </button>
  );
}

export default function BottomNav({ activeTab, onTabChange, onFocusTap }: BottomNavProps) {
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
        backgroundColor: tokens.colors.surface,
        borderTop: `1px solid ${tokens.colors.border}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
        boxShadow: '0 -1px 12px rgba(0,0,0,0.06)',
        overflow: 'visible',
      }}
    >
      {/* Left tabs: Today + Journey */}
      {LEFT_TABS.map(({ id, label, icon }) => (
        <TabButton
          key={id}
          id={id}
          label={label}
          icon={icon as LucideIcon}
          isActive={activeTab === id}
          onTabChange={onTabChange}
        />
      ))}

      {/* Center FAB — DO: instant task launcher, floats above the nav bar */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingBottom: '10px',
        overflow: 'visible',
      }}>
        <button
          onClick={onFocusTap}
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            border: `3px solid ${tokens.colors.surface}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(124,58,237,0.55), 0 2px 8px rgba(0,0,0,0.12)',
            transform: 'translateY(-14px)',
            WebkitTapHighlightColor: 'transparent',
            flexShrink: 0,
          }}
          aria-label="Start focus session"
        >
          <Play size={18} color="#fff" fill="#fff" />
        </button>
      </div>

      {/* Right tabs: Progress + Me */}
      {RIGHT_TABS.map(({ id, label, icon }) => (
        <TabButton
          key={id}
          id={id}
          label={label}
          icon={icon as LucideIcon}
          isActive={activeTab === id}
          onTabChange={onTabChange}
        />
      ))}
    </nav>
  );
}
