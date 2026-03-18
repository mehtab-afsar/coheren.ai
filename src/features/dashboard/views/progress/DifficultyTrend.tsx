import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DifficultyTrendProps {
  data: { week: number; avg: number }[];
}

export default function DifficultyTrend({ data }: DifficultyTrendProps) {
  if (data.length < 2) return null;

  const latest = data[data.length - 1].avg;
  const prev = data[data.length - 2].avg;
  const delta = Math.round((latest - prev) * 10) / 10;
  const trending = delta > 0.3 ? 'up' : delta < -0.3 ? 'down' : 'stable';

  const maxVal = Math.max(...data.map(d => d.avg), 5);
  const SVG_W = 200;
  const SVG_H = 48;
  const PAD_X = 8;
  const PAD_Y = 6;

  const points = data.map((d, i) => {
    const x = PAD_X + (i / (data.length - 1)) * (SVG_W - PAD_X * 2);
    const y = PAD_Y + (1 - d.avg / maxVal) * (SVG_H - PAD_Y * 2);
    return `${x},${y}`;
  }).join(' ');

  const TrendIcon = trending === 'up' ? TrendingUp : trending === 'down' ? TrendingDown : Minus;
  const trendColor = trending === 'up' ? '#f97316' : trending === 'down' ? '#22c55e' : '#9ca3af';
  const trendLabel = trending === 'up' ? 'Getting harder' : trending === 'down' ? 'Getting easier' : 'Stable';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: '#fff',
        border: '1px solid #f3f4f6',
        borderRadius: 14,
        padding: '16px 16px 12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            Difficulty Trend
          </p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#111', margin: '2px 0 0', letterSpacing: '-0.02em' }}>
            {latest.toFixed(1)}<span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>/5</span>
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: `${trendColor}12` }}>
          <TrendIcon size={12} color={trendColor} />
          <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>{trendLabel}</span>
        </div>
      </div>

      <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ display: 'block' }}>
        <polyline
          points={points}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const x = PAD_X + (i / (data.length - 1)) * (SVG_W - PAD_X * 2);
          const y = PAD_Y + (1 - d.avg / maxVal) * (SVG_H - PAD_Y * 2);
          return <circle key={i} cx={x} cy={y} r={2.5} fill={i === data.length - 1 ? '#7c3aed' : '#c4b5fd'} />;
        })}
      </svg>
    </motion.div>
  );
}
