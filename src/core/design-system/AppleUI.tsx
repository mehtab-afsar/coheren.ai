import React from 'react';
import { ap } from './appleTokens';

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
