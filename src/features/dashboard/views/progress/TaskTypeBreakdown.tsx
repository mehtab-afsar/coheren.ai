import { motion } from 'framer-motion';
import { Target, BookOpen, MessageCircle } from 'lucide-react';

interface TaskTypeBreakdownProps {
  data: { type: string; count: number; completed: number }[];
}

const TYPE_STYLES: Record<string, { color: string; bg: string; Icon: React.ComponentType<{ size?: number; color?: string }> }> = {
  practice:   { color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', Icon: Target },
  learning:   { color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', Icon: BookOpen },
  reflection: { color: '#f97316', bg: 'rgba(249,115,22,0.08)', Icon: MessageCircle },
};

export default function TaskTypeBreakdown({ data }: TaskTypeBreakdownProps) {
  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.count, 0);

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
      <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 12px' }}>
        Task Types
      </p>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2, marginBottom: 14 }}>
        {data.map(d => {
          const pct = total > 0 ? (d.count / total) * 100 : 0;
          const style = TYPE_STYLES[d.type] ?? { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', Icon: Target };
          return (
            <motion.div
              key={d.type}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: style.color,
                borderRadius: 4,
                minWidth: pct > 0 ? 4 : 0,
              }}
            />
          );
        })}
      </div>

      {/* Legend rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map(d => {
          const style = TYPE_STYLES[d.type] ?? { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', Icon: Target };
          const { Icon } = style;
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          const completionPct = d.count > 0 ? Math.round((d.completed / d.count) * 100) : 0;

          return (
            <div key={d.type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: style.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={13} color={style.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151', textTransform: 'capitalize' }}>
                    {d.type}
                  </span>
                  <span style={{ fontSize: 12, color: '#9ca3af' }}>{pct}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{d.completed}/{d.count} done</span>
                  <span style={{ fontSize: 10, color: style.color, fontWeight: 600 }}>({completionPct}%)</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
