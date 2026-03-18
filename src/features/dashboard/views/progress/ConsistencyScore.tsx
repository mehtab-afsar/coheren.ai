import { motion } from 'framer-motion';

interface ConsistencyScoreProps {
  score: number; // 0–100
}

export default function ConsistencyScore({ score }: ConsistencyScoreProps) {
  const RING_SIZE = 80;
  const STROKE = 5;
  const RADIUS = (RING_SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const offset = CIRCUMFERENCE * (1 - score / 100);

  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f97316' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Good' : 'Building';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: '#fff',
        border: '1px solid #f3f4f6',
        borderRadius: 14,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      {/* Ring */}
      <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
        <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="#f3f4f6"
            strokeWidth={STROKE}
          />
          <motion.circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>
            {score}
          </span>
        </div>
      </div>

      {/* Text */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>
          Consistency
        </p>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#111', margin: '0 0 2px', letterSpacing: '-0.02em' }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
          {score}% of days you showed up
        </p>
      </div>
    </motion.div>
  );
}
