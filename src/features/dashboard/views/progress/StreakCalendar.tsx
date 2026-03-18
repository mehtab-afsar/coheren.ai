import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';
import { tokens } from '@core/design-system';

export interface CalendarDay {
  dayNumber: number;
  date: string;
  status: 'completed' | 'partial' | 'missed' | 'rest' | 'today' | 'future';
}

export interface StreakCalendarProps {
  days: CalendarDay[];
  currentStreak: number;
  longestStreak: number;
}

const STATUS_COLORS: Record<CalendarDay['status'], string> = {
  completed: '#7c3aed',
  partial:   'rgba(124,58,237,0.35)',
  missed:    'rgba(239,68,68,0.2)',
  rest:      'rgba(0,0,0,0.05)',
  today:     '#a78bfa',
  future:    'rgba(0,0,0,0.04)',
};

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function StreakCalendar({ days, currentStreak, longestStreak }: StreakCalendarProps) {
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!styleRef.current) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes scPulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(167,139,250,0.4); }
          50%       { box-shadow: 0 0 0 4px rgba(167,139,250,0.15); }
        }
        .sc-today-cell {
          animation: scPulse 2s ease-in-out infinite;
        }
      `;
      document.head.appendChild(style);
      styleRef.current = style;
    }
    return () => {
      if (styleRef.current) {
        styleRef.current.remove();
        styleRef.current = null;
      }
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: tokens.colors.text.primary }}>Activity</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 12, color: tokens.colors.text.secondary }}>Current streak</span>
          <Flame size={13} strokeWidth={2} color="#fb923c" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#fb923c' }}>{currentStreak}</span>
        </div>
      </div>

      {/* Day labels */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
        marginBottom: 4,
      }}>
        {DAY_LABELS.map((d, i) => (
          <span
            key={i}
            style={{ fontSize: 10, color: tokens.colors.text.tertiary, textAlign: 'center', display: 'block' }}
          >
            {d}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 4,
      }}>
        {days.map(({ date, status }) => {
          const isToday = status === 'today';
          const isRest  = status === 'rest';
          return (
            <div
              key={date}
              title={`${date} — ${status}`}
              className={isToday ? 'sc-today-cell' : undefined}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                backgroundColor: STATUS_COLORS[status],
                border: isRest ? '1px solid rgba(0,0,0,0.08)' : 'none',
                boxShadow: isToday ? '0 0 0 2px rgba(167,139,250,0.4)'
                  : status === 'completed' ? 'inset 0 1px 2px rgba(0,0,0,0.1)'
                  : 'none',
                transition: 'opacity 0.15s',
              }}
            />
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 14,
        paddingTop: 12,
        borderTop: `1px solid ${tokens.colors.borderLight}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: tokens.colors.text.secondary }}>Longest streak</span>
        <span style={{ fontSize: 12, fontWeight: 500, color: tokens.colors.text.secondary }}>{longestStreak} day{longestStreak !== 1 ? 's' : ''}</span>
      </div>
    </motion.div>
  );
}
