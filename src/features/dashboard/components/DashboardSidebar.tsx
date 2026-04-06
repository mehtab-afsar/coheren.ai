import { Home, Map, BarChart2, BookMarked, User, MessageSquare, Settings, Flame, ArrowUpRight } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { useCoachMessages } from '../hooks/useCoachMessages';
import type { ViewType } from '../hooks/useDashboardNav';

interface DashboardSidebarProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onCoachOpen?: () => void;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
}

const MICRO_LABEL: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--c-text-quaternary)',
  padding: '0 12px',
  marginTop: 20,
  marginBottom: 2,
  fontFamily: 'var(--c-font-body)',
};

function NavItem({
  id: _id,
  icon: Icon,
  label,
  badge,
  active,
  onClick,
}: {
  id: ViewType;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  label: string;
  badge?: string | number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        height: 36,
        padding: '0 10px',
        borderRadius: 8,
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontFamily: 'var(--c-font-body)',
        fontSize: 14,
        fontWeight: active ? 600 : 450,
        color: active ? 'var(--c-accent-purple)' : 'var(--c-text-secondary)',
        backgroundColor: active ? 'var(--c-accent-purple-soft)' : 'transparent',
        transition: 'all 0.12s ease',
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)';
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <Icon
        size={15}
        strokeWidth={active ? 2.2 : 1.7}
        color={active ? 'var(--c-accent-purple)' : 'var(--c-text-tertiary)'}
      />
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && (
        <span style={{
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: active ? 'var(--c-accent-purple)' : 'var(--c-text-quaternary)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 4px',
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function DashboardSidebar({ currentView, onViewChange }: DashboardSidebarProps) {
  const { universalProfile, currentGoal, roadmap, streak, tasks, currentDay } = useStore();
  const { getMessages } = useCoachMessages();

  const userName = universalProfile?.name ?? '';
  const firstName = userName.split(' ')[0] || 'You';
  const initials = userName ? userName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'U';

  const goalText = currentGoal?.specificGoal ?? roadmap?.title ?? '';
  const weekNum = Math.ceil((currentDay || 1) / 7);

  const todaysTasks = tasks.filter(t => t.day === currentDay && !t.skipped);
  const completedToday = todaysTasks.filter(t => t.completed).length;
  const todayBadge = todaysTasks.length > 0
    ? `${completedToday}/${todaysTasks.length}`
    : undefined;

  const unreadCoach = getMessages().filter(m => !m.read).length;

  const setStep = useStore(s => s.setStep);

  return (
    <div style={{
      width: 220,
      minWidth: 220,
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      backgroundColor: '#ffffff',
      borderRight: '1px solid var(--c-border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--c-font-body)',
      zIndex: 40,
    }}>

      {/* ── Logo row ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 16px 16px',
      }}>
        <button
          onClick={() => { setStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, textAlign: 'left',
          }}
        >
          <span style={{
            fontFamily: 'var(--c-font-display)',
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--c-text-primary)',
          }}>
            coheren<span style={{ color: 'var(--c-accent-purple)' }}>.</span>
          </span>
        </button>
        <button
          onClick={() => onViewChange('you')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--c-text-quaternary)',
            display: 'flex', alignItems: 'center',
            padding: 4, borderRadius: 6,
            transition: 'color 0.12s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-text-secondary)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--c-text-quaternary)'; }}
          title="Settings / Profile"
        >
          <Settings size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Context block: Day + Goal ── */}
      {goalText && (
        <div style={{
          margin: '0 12px 4px',
          padding: '8px 10px',
          backgroundColor: 'var(--c-accent-purple-soft)',
          border: '1px solid var(--c-accent-purple-border)',
          borderRadius: 8,
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--c-accent-purple)',
            marginBottom: 2,
            fontFamily: 'var(--c-font-body)',
          }}>
            Day {currentDay ?? 1} · Week {weekNum}
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--c-text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {goalText}
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav style={{ padding: '4px 8px', flex: 1 }}>

        <div style={MICRO_LABEL}>Today</div>
        <NavItem
          id="today"
          icon={Home}
          label="Today"
          badge={todayBadge}
          active={currentView === 'today'}
          onClick={() => onViewChange('today')}
        />

        <div style={MICRO_LABEL}>Journey</div>
        <NavItem
          id="roadmap"
          icon={Map}
          label="My Roadmap"
          active={currentView === 'roadmap'}
          onClick={() => onViewChange('roadmap')}
        />

        <div style={MICRO_LABEL}>Insights</div>
        <NavItem
          id="insights"
          icon={BarChart2}
          label="Progress"
          active={currentView === 'insights'}
          onClick={() => onViewChange('insights')}
        />
        <NavItem
          id="coach"
          icon={MessageSquare}
          label="Coach"
          badge={unreadCoach > 0 ? unreadCoach : undefined}
          active={currentView === 'coach'}
          onClick={() => onViewChange('coach')}
        />

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'var(--c-border-subtle)', margin: '12px 4px' }} />

        <NavItem
          id="library"
          icon={BookMarked}
          label="Library"
          active={currentView === 'library'}
          onClick={() => onViewChange('library')}
        />
      </nav>

      {/* ── Streak footer ── */}
      {streak > 0 && (
        <button
          onClick={() => onViewChange('insights')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            margin: '0 12px 8px',
            padding: '7px 10px',
            backgroundColor: 'rgba(34, 197, 94, 0.06)',
            border: '1px solid rgba(34, 197, 94, 0.15)',
            borderRadius: 8,
            cursor: 'pointer',
            width: 'calc(100% - 24px)',
            textAlign: 'left',
            transition: 'background-color 0.12s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.10)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.06)'; }}
        >
          <Flame size={13} strokeWidth={2} color="var(--c-accent-green)" />
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--c-accent-green)',
            flex: 1,
          }}>
            {streak}-day streak
          </span>
          <ArrowUpRight size={11} color="var(--c-accent-green)" strokeWidth={2} />
        </button>
      )}

      {/* ── User row ── */}
      <button
        onClick={() => onViewChange('you')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          margin: '0 12px 16px',
          padding: '8px 10px',
          borderRadius: 8,
          border: '1px solid var(--c-border-subtle)',
          backgroundColor: 'var(--c-surface-elevated)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background-color 0.12s ease',
          width: 'calc(100% - 24px)',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--c-surface-card)'; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'var(--c-surface-elevated)'; }}
      >
        {/* Avatar */}
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--c-gradient-purple)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--c-text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}>
            {firstName}
          </div>
          <div style={{
            fontSize: 10,
            color: 'var(--c-text-quaternary)',
            lineHeight: 1.2,
          }}>
            Profile & settings
          </div>
        </div>
        <User size={12} strokeWidth={1.5} color="var(--c-text-quaternary)" />
      </button>
    </div>
  );
}
