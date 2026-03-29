import React from 'react';
import { ap } from './appleTokens';

// Chip — tiny inline label
export function Chip({ label, color = ap.textSecondary, bg = ap.surfaceAlt, style }: {
  label: string; color?: string; bg?: string; style?: React.CSSProperties;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 6,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.01em',
      color, backgroundColor: bg, fontFamily: ap.font,
      ...style
    }}>{label}</span>
  );
}

// Bar — thin progress bar
export function Bar({ value, color = ap.accent, height = 4, style }: {
  value: number; color?: string; height?: number; style?: React.CSSProperties;
}) {
  return (
    <div style={{ height, borderRadius: height, backgroundColor: ap.surfaceAlt, overflow: 'hidden', ...style }}>
      <div style={{
        height: '100%', borderRadius: height,
        width: `${Math.min(100, Math.max(0, value))}%`,
        backgroundColor: color,
        transition: 'width 0.8s ease',
      }} />
    </div>
  );
}

// Label — section header row
export function Label({ left, right }: { left: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: ap.textSecondary, fontFamily: ap.font }}>{left}</span>
      {right && <span style={{ fontSize: 12, color: ap.textTertiary, fontFamily: ap.font }}>{right}</span>}
    </div>
  );
}

// Tile — card wrapper
export function Tile({ children, style, onClick, padding }: {
  children: React.ReactNode; style?: React.CSSProperties;
  onClick?: () => void; padding?: string | number;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: ap.surface,
        borderRadius: 14,
        border: `1px solid ${ap.border}`,
        boxShadow: ap.shadow,
        padding: padding ?? 0,
        cursor: onClick ? 'pointer' : undefined,
        overflow: 'hidden',
        ...style,
      }}
    >{children}</div>
  );
}

// Divider
export function Divider() {
  return <div style={{ height: 1, backgroundColor: ap.border, width: '100%' }} />;
}
