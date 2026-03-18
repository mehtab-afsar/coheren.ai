import { Home, Map, User, BarChart2, BookMarked } from 'lucide-react';
import type { ViewType } from '../hooks/useDashboardNav';

interface BottomNavProps {
  activeTab: ViewType;
  onTabChange: (tab: ViewType) => void;
}

const ACTIVE_COLOR = '#7c3aed';
const INACTIVE_COLOR = 'rgba(255,255,255,0.35)';

const TABS: { id: ViewType; label: string; icon: React.ComponentType<{ size: number; strokeWidth: number; color: string; style?: React.CSSProperties }> }[] = [
  { id: 'today',    label: 'Today',    icon: Home },
  { id: 'roadmap',  label: 'Journey',  icon: Map },
  { id: 'library',  label: 'Library',  icon: BookMarked },
  { id: 'insights', label: 'Progress', icon: BarChart2 },
  { id: 'you',      label: 'You',      icon: User },
];

function TabButton({
  id,
  label,
  icon: Icon,
  isActive,
  onTabChange,
}: {
  id: ViewType;
  label: string;
  icon: typeof TABS[0]['icon'];
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
        gap: '3px',
        height: '56px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '6px 2px',
        position: 'relative',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
    >
      {isActive && (
        <span style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '28px',
          height: '2px',
          borderRadius: '0 0 3px 3px',
          backgroundColor: ACTIVE_COLOR,
          boxShadow: `0 0 8px ${ACTIVE_COLOR}80`,
        }} />
      )}
      <Icon
        size={20}
        strokeWidth={isActive ? 2 : 1.5}
        color={isActive ? ACTIVE_COLOR : INACTIVE_COLOR}
        style={{ transition: 'color 150ms ease' }}
      />
      <span style={{
        fontSize: '10px',
        fontWeight: isActive ? 600 : 400,
        color: isActive ? ACTIVE_COLOR : INACTIVE_COLOR,
        letterSpacing: '0.02em',
        lineHeight: 1,
        transition: 'color 150ms ease',
      }}>
        {label}
      </span>
    </button>
  );
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
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
        background: 'linear-gradient(180deg, rgba(8,8,15,0.95) 0%, rgba(8,8,15,1) 100%)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.25)',
      }}
    >
      {TABS.map(({ id, label, icon }) => (
        <TabButton
          key={id}
          id={id}
          label={label}
          icon={icon}
          isActive={activeTab === id}
          onTabChange={onTabChange}
        />
      ))}
    </nav>
  );
}
