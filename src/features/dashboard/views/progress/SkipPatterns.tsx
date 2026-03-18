import { motion } from 'framer-motion';
import { Clock, Heart, AlertTriangle, ExternalLink } from 'lucide-react';

interface SkipPatternsProps {
  data: { reason: string; count: number }[];
}

const REASON_META: Record<string, { label: string; color: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  time:       { label: 'Not enough time',    color: '#f97316', Icon: Clock },
  health:     { label: 'Health / energy',     color: '#ef4444', Icon: Heart },
  difficulty: { label: 'Too difficult',       color: '#eab308', Icon: AlertTriangle },
  external:   { label: 'External factors',    color: '#6b7280', Icon: ExternalLink },
};

export default function SkipPatterns({ data }: SkipPatternsProps) {
  if (data.length === 0) return null;

  const totalSkips = data.reduce((s, d) => s + d.count, 0);

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
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
          Skip Reasons
        </p>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>{totalSkips} skipped</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.slice(0, 4).map((d, idx) => {
          const meta = REASON_META[d.reason] ?? { label: d.reason, color: '#9ca3af', Icon: AlertTriangle };
          const { Icon } = meta;
          const pct = totalSkips > 0 ? Math.round((d.count / totalSkips) * 100) : 0;

          return (
            <motion.div
              key={d.reason}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.08 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10 }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${meta.color}12`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={13} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{meta.label}</span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{d.count}x</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, background: '#f3f4f6', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    style={{ height: '100%', borderRadius: 2, background: meta.color }}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
