import { Flame, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsStripProps {
  streak: number;
  energyPercent: number;
}

export default function StatsStrip({ streak, energyPercent }: StatsStripProps) {
  const energyColor =
    energyPercent >= 80 ? '#22c55e' : energyPercent >= 50 ? '#eab308' : '#ef4444';

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
      {/* Streak pill */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: '#fff',
        border: '1px solid #f3f4f6',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <Flame
          size={15}
          strokeWidth={2}
          color={streak > 0 ? '#f97316' : '#d1d5db'}
        />
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#111' }}>
          {streak}
        </span>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>day streak</span>
      </div>

      {/* Completion pill */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: '#fff',
        border: '1px solid #f3f4f6',
        borderRadius: '12px',
        padding: '10px 14px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <Zap size={15} strokeWidth={2} color={energyColor} />
        <span style={{ fontWeight: 700, fontSize: '14px', color: '#111' }}>
          {energyPercent}%
        </span>
        <span style={{ fontSize: '12px', color: '#9ca3af' }}>done</span>
        {/* Animated progress bar */}
        <div style={{
          flex: 1,
          height: '4px',
          background: '#f3f4f6',
          borderRadius: '99px',
          marginLeft: '2px',
          overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${energyPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              height: '100%',
              backgroundColor: energyColor,
              borderRadius: '99px',
            }}
          />
        </div>
      </div>
    </div>
  );
}
