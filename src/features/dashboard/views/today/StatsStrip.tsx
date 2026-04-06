import { Flame } from 'lucide-react';

interface StatsStripProps {
  streak: number;
  energyPercent: number;
  onStreakTap?: () => void;
}

function getStatusLabel(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: 'On Track',   color: '#22c55e' };
  if (pct >= 50) return { label: 'In Progress', color: '#f59e0b' };
  return { label: 'Getting there', color: '#888888' };
}

export default function StatsStrip({ streak, energyPercent, onStreakTap }: StatsStripProps) {
  const status = getStatusLabel(energyPercent);

  const pillStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '7px 12px',
    backgroundColor: 'var(--c-surface-elevated)',
    border: '1px solid var(--c-border-subtle)',
    borderRadius: 20,
    fontFamily: 'var(--c-font-body)',
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 24,
      flexWrap: 'wrap',
    }}>
      {/* Streak pill — tappable */}
      <button
        onClick={onStreakTap}
        style={{
          ...pillStyle,
          cursor: onStreakTap ? 'pointer' : 'default',
          border: streak > 0 ? '1px solid rgba(34, 197, 94, 0.20)' : '1px solid var(--c-border-subtle)',
          backgroundColor: streak > 0 ? 'rgba(34, 197, 94, 0.05)' : 'var(--c-surface-elevated)',
          background: 'none',
          transition: 'background-color 0.12s ease',
        }}
        onMouseEnter={e => { if (onStreakTap) e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.09)'; }}
        onMouseLeave={e => { if (onStreakTap) e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.05)'; }}
      >
        <Flame size={13} strokeWidth={2} color={streak > 0 ? 'var(--c-accent-green)' : 'var(--c-text-quaternary)'} />
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: streak > 0 ? 'var(--c-accent-green)' : 'var(--c-text-tertiary)',
        }}>
          {streak}
        </span>
        <span style={{ fontSize: 12, color: 'var(--c-text-tertiary)' }}>
          {streak === 1 ? 'day' : 'days'}
        </span>
      </button>

      {/* Divider dot */}
      <span style={{ color: 'var(--c-border-medium)', fontSize: 12, userSelect: 'none' }}>·</span>

      {/* Weekly completion */}
      <div style={pillStyle}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-primary)' }}>
          {energyPercent}%
        </span>
        <span style={{ fontSize: 12, color: 'var(--c-text-tertiary)' }}>this week</span>
      </div>

      {/* Divider dot */}
      <span style={{ color: 'var(--c-border-medium)', fontSize: 12, userSelect: 'none' }}>·</span>

      {/* Status chip */}
      <div style={{
        ...pillStyle,
        borderColor: `${status.color}30`,
        backgroundColor: `${status.color}08`,
      }}>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: status.color,
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: status.color }}>
          {status.label}
        </span>
      </div>
    </div>
  );
}
