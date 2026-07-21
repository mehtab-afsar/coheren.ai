import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';

export interface CoachSummaryProps {
  summary: string;
}

const PLACEHOLDER = 'Complete more tasks this week to unlock your personalized coach notes.';

export default function CoachSummary({ summary }: CoachSummaryProps) {
  const text = summary.trim() || PLACEHOLDER;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.4 }}
      style={{
        background: 'rgba(196, 85, 45,0.04)',
        border: `1px ${summary.trim() ? 'solid' : 'dashed'} rgba(196, 85, 45,0.15)`,
        borderRadius: 20,
        padding: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
      }}
    >
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 10,
        background: 'rgba(196, 85, 45,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Brain size={17} color="#C4552D" />
      </div>

      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: 10,
          color: '#C4552D',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          margin: '0 0 7px',
        }}>
          Weekly Coach Notes
        </p>
        <p style={{
          fontSize: 14,
          color: '#64748b',
          lineHeight: 1.6,
          margin: 0,
        }}>
          {text}
        </p>
      </div>
    </motion.div>
  );
}
