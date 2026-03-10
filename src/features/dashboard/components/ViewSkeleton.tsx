import { tokens } from '@core/design-system';

interface Props {
  type: 'today' | 'progress' | 'journey' | 'me' | 'generic';
}

const PULSE = 'anim-pulse-skeleton 1.6s ease-in-out infinite';

const bar = (w: string, h: number, radius = 8, delay = '0ms'): React.CSSProperties => ({
  width: w,
  height: h,
  borderRadius: radius,
  backgroundColor: tokens.colors.gray[100],
  animation: PULSE,
  animationDelay: delay,
  flexShrink: 0,
});

export function ViewSkeleton({ type }: Props) {
  return (
    <div>
      <style>{`
        @keyframes anim-pulse-skeleton {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      {/* Header row — shared across all types */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: tokens.spacing.xl }}>
        <div style={bar('140px', 26, 6)} />
        <div style={bar('60px', 22, 99, '80ms')} />
      </div>

      {type === 'today' && <TodaySkeleton />}
      {type === 'progress' && <ProgressSkeleton />}
      {type === 'journey' && <JourneySkeleton />}
      {type === 'me' && <MeSkeleton />}
      {type === 'generic' && <GenericSkeleton />}
    </div>
  );
}

function TodaySkeleton() {
  return (
    <>
      {/* Hero card */}
      <div style={{
        backgroundColor: tokens.colors.gray[50],
        border: `1px solid ${tokens.colors.borderLight}`,
        borderRadius: tokens.borderRadius.xl,
        padding: tokens.spacing['2xl'],
        marginBottom: tokens.spacing.xl,
      }}>
        {/* Week dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: tokens.spacing.lg }}>
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} style={{ ...bar('28px', 28, 99, `${i * 40}ms`), width: 28 }} />
          ))}
        </div>
        {/* Title */}
        <div style={{ ...bar('60%', 32, 8, '100ms'), marginBottom: tokens.spacing.md }} />
        <div style={bar('40%', 18, 6, '140ms')} />
      </div>

      {/* Task cards */}
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.xl,
          marginBottom: tokens.spacing.md,
          display: 'flex',
          gap: tokens.spacing.lg,
          alignItems: 'flex-start',
        }}>
          <div style={{ ...bar('44px', 44, 99, `${i * 60}ms`), width: 44 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...bar('70%', 18, 6, `${i * 60 + 30}ms`), marginBottom: 10 }} />
            <div style={bar('45%', 14, 4, `${i * 60 + 60}ms`)} />
          </div>
        </div>
      ))}
    </>
  );
}

function ProgressSkeleton() {
  return (
    <>
      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: tokens.spacing.md, marginBottom: tokens.spacing.xl }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{
            backgroundColor: tokens.colors.surface,
            border: `1px solid ${tokens.colors.borderLight}`,
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing.xl,
          }}>
            <div style={{ ...bar('32px', 32, 99, `${i * 50}ms`), marginBottom: tokens.spacing.md }} />
            <div style={{ ...bar('50%', 36, 6, `${i * 50 + 30}ms`), marginBottom: 8 }} />
            <div style={bar('70%', 14, 4, `${i * 50 + 60}ms`)} />
          </div>
        ))}
      </div>
      {/* Chart placeholder */}
      <div style={{
        height: 120,
        borderRadius: tokens.borderRadius.lg,
        backgroundColor: tokens.colors.gray[50],
        animation: PULSE,
        marginBottom: tokens.spacing.xl,
      }} />
    </>
  );
}

function JourneySkeleton() {
  return (
    <>
      {/* Hero card */}
      <div style={{
        backgroundColor: tokens.colors.gray[50],
        borderRadius: tokens.borderRadius.xl,
        padding: tokens.spacing['2xl'],
        marginBottom: tokens.spacing.xl,
        height: 160,
        animation: PULSE,
      }} />
      {/* Phase cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: tokens.spacing.xs, marginBottom: tokens.spacing.xl }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{
            backgroundColor: tokens.colors.gray[50],
            borderRadius: tokens.borderRadius.md,
            padding: tokens.spacing.md,
            height: 80,
            animation: PULSE,
            animationDelay: `${i * 60}ms`,
          }} />
        ))}
      </div>
      {/* Month rows */}
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.xl,
          marginBottom: tokens.spacing.md,
          height: 72,
          animation: PULSE,
          animationDelay: `${i * 80}ms`,
        }} />
      ))}
    </>
  );
}

function MeSkeleton() {
  return (
    <>
      {/* Hero card */}
      <div style={{
        backgroundColor: tokens.colors.gray[50],
        borderRadius: tokens.borderRadius.xl,
        padding: tokens.spacing['2xl'],
        marginBottom: tokens.spacing.xl,
        height: 140,
        animation: PULSE,
      }} />
      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: tokens.spacing.md, marginBottom: tokens.spacing.xl }}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} style={{
            backgroundColor: tokens.colors.surface,
            border: `1px solid ${tokens.colors.borderLight}`,
            borderRadius: tokens.borderRadius.lg,
            padding: tokens.spacing.xl,
            height: 80,
            animation: PULSE,
            animationDelay: `${i * 60}ms`,
          }} />
        ))}
      </div>
    </>
  );
}

function GenericSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} style={{
          backgroundColor: tokens.colors.surface,
          border: `1px solid ${tokens.colors.borderLight}`,
          borderRadius: tokens.borderRadius.lg,
          padding: tokens.spacing.xl,
          marginBottom: tokens.spacing.md,
          height: i === 0 ? 120 : 72,
          animation: PULSE,
          animationDelay: `${i * 70}ms`,
        }} />
      ))}
    </>
  );
}

// Allow usage without import React in every file (React 17+ JSX transform)
import type React from 'react';
