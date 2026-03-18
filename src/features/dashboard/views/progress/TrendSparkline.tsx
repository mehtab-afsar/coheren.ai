import { motion } from 'framer-motion';
import { tokens } from '@core/design-system';

export interface TrendDataPoint {
  week: number;
  percentage: number;
}

export interface TrendSparklineProps {
  data: TrendDataPoint[];
}

const SVG_W = 280;
const SVG_H = 80;
const PADDING_X = 28;
const PADDING_Y = 8;

function buildPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return '';
  return points.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');
}

export default function TrendSparkline({ data }: TrendSparklineProps) {
  const hasData = data.length >= 2;

  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const trendDelta = hasData ? last.percentage - prev.percentage : 0;
  const trendUp    = trendDelta > 2;
  const trendDown  = trendDelta < -2;
  const trendColor = trendUp ? '#4ade80' : trendDown ? '#f87171' : '#94a3b8';
  const trendLabel = trendUp ? '▲' : trendDown ? '▼' : '→';

  const innerW = SVG_W - PADDING_X * 2;
  const innerH = SVG_H - PADDING_Y * 2;

  const maxPct = Math.max(100, ...data.map(d => d.percentage));
  const minPct = Math.min(0, ...data.map(d => d.percentage));
  const range  = maxPct - minPct || 1;

  const points = data.map((d, i) => ({
    x: PADDING_X + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: PADDING_Y + innerH - ((d.percentage - minPct) / range) * innerH,
  }));

  const linePath = buildPath(points);

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${SVG_H} L ${points[0].x} ${SVG_H} Z`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.3 }}
      style={{
        background: tokens.colors.surface,
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: 20,
        padding: 20,
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: tokens.colors.text.primary }}>Weekly Trend</span>
        {hasData && (
          <span style={{ fontSize: 13, fontWeight: 600, color: trendColor }}>
            {trendLabel} {Math.abs(trendDelta)}%
          </span>
        )}
      </div>

      {/* SVG chart */}
      {data.length === 0 ? (
        <p style={{ fontSize: 12, color: tokens.colors.text.secondary, textAlign: 'center', margin: '12px 0' }}>
          Complete tasks to see your weekly trend.
        </p>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            width="100%"
            style={{ overflow: 'visible', display: 'block' }}
          >
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(124,58,237,0.25)" />
                <stop offset="100%" stopColor="rgba(124,58,237,0)" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[25, 50, 75, 100].map(pct => {
              const y = PADDING_Y + innerH - ((pct - minPct) / range) * innerH;
              return (
                <g key={pct}>
                  <line
                    x1={PADDING_X} y1={y} x2={SVG_W - 8} y2={y}
                    stroke="rgba(0,0,0,0.06)" strokeWidth={1}
                    strokeDasharray="4 3"
                  />
                  <text x={PADDING_X - 4} y={y + 3} textAnchor="end"
                    style={{ fontSize: 8, fill: '#94a3b8' }}>
                    {pct}%
                  </text>
                </g>
              );
            })}

            {/* Filled area */}
            {areaPath && (
              <path d={areaPath} fill="url(#trendGrad)" />
            )}

            {/* Stroke line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#7c3aed"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Dots */}
            {points.map((pt, i) => {
              const isLast = i === points.length - 1;
              return (
                <circle
                  key={i}
                  cx={pt.x}
                  cy={pt.y}
                  r={isLast ? 4 : 2}
                  fill={isLast ? '#a78bfa' : '#7c3aed'}
                />
              );
            })}
          </svg>

          {/* Week labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {data.map(d => (
              <span key={d.week} style={{ fontSize: 10, color: '#475569' }}>
                W{d.week}
              </span>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}
