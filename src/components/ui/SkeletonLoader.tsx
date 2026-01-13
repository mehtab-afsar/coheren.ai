import type { CSSProperties } from 'react';
import { tokens } from '../../design-system';

interface SkeletonLoaderProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  style?: CSSProperties;
}

export default function SkeletonLoader({
  width = '100%',
  height = '20px',
  borderRadius = tokens.borderRadius.md,
  style,
}: SkeletonLoaderProps) {
  return (
    <>
      <div
        style={{
          width,
          height,
          borderRadius,
          backgroundColor: tokens.colors.gray[100],
          animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          ...style,
        }}
      />
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </>
  );
}

// Preset skeleton components for common use cases
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.sm }}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height="16px"
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      style={{
        backgroundColor: tokens.colors.surface,
        padding: tokens.spacing['2xl'],
        borderRadius: tokens.borderRadius.lg,
        border: `1px solid ${tokens.colors.borderLight}`,
        boxShadow: tokens.shadows.sm,
      }}
    >
      <div style={{ display: 'flex', gap: tokens.spacing.xl }}>
        <SkeletonLoader
          width="28px"
          height="28px"
          borderRadius="50%"
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: tokens.spacing.md }}>
          <SkeletonLoader height="16px" width="40%" />
          <SkeletonLoader height="20px" width="80%" />
          <SkeletonLoader height="14px" width="60%" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTaskList({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xl }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
