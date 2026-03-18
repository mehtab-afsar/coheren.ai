import { motion } from 'framer-motion';
import { Flame, Trophy, CheckCircle, Clock } from 'lucide-react';
import { tokens } from '@core/design-system';

export interface PersonalRecordsProps {
  longestStreak: number;
  totalTasksDone: number;
  totalMinutes: number;
  bestWeekNumber: number;
  bestWeekPercent: number;
}

function formatHours(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}


export default function PersonalRecords({
  longestStreak,
  totalTasksDone,
  totalMinutes,
  bestWeekNumber,
  bestWeekPercent,
}: PersonalRecordsProps) {
  const cards = [
    {
      icon: Flame,
      iconColor: '#fb923c',
      value: `${longestStreak} days`,
      label: 'Longest Streak',
    },
    {
      icon: Trophy,
      iconColor: '#fbbf24',
      value: `Wk ${bestWeekNumber} · ${bestWeekPercent}%`,
      label: 'Best Week',
    },
    {
      icon: CheckCircle,
      iconColor: '#4ade80',
      value: String(totalTasksDone),
      label: 'Tasks Done',
    },
    {
      icon: Clock,
      iconColor: '#c084fc',
      value: formatHours(totalMinutes),
      label: 'Time Invested',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.2 }}
    >
      <div style={{
        background: '#fff',
        border: '1px solid #f3f4f6',
        borderRadius: 16,
        overflow: 'hidden',
      }}>
        {cards.map(({ icon: Icon, iconColor, value, label }, idx) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px',
            borderBottom: idx < cards.length - 1 ? '1px solid #f9fafb' : 'none',
            borderLeft: `3px solid ${iconColor}`,
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: `${iconColor}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Icon size={15} strokeWidth={2} color={iconColor} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 1px' }}>{label}</p>
              <p style={{
                fontSize: 15,
                fontWeight: 600,
                color: tokens.colors.text.primary,
                margin: 0,
                letterSpacing: '-0.02em',
              }}>
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
