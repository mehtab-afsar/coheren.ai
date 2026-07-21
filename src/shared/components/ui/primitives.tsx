/**
 * Design-system primitives — the single component vocabulary for the redesign.
 *
 * Every surface composes these instead of hand-rolling inline styles. They consume
 * the unified `--c-*` CSS variables + the `clay` (terracotta) brand scale, so the
 * look changes in one place. Fraunces = moments; Inter = interaction.
 */
import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from 'react';

const FR = "'Fraunces', serif";

// ── Button ────────────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BTN_SIZES: Record<ButtonSize, CSSProperties> = {
  sm: { padding: '8px 14px', fontSize: 13, minHeight: 36, borderRadius: 10 },
  md: { padding: '12px 18px', fontSize: 15, minHeight: 44, borderRadius: 12 },
  lg: { padding: '15px 22px', fontSize: 16, minHeight: 52, borderRadius: 14 },
};

const BTN_VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary:   { background: 'var(--c-accent-purple)', color: '#fff', border: '1px solid transparent' },
  secondary: { background: 'var(--c-surface-card)', color: 'var(--c-text-primary)', border: '1px solid var(--c-border-medium)' },
  ghost:     { background: 'transparent', color: 'var(--c-text-secondary)', border: '1px solid transparent' },
  danger:    { background: 'transparent', color: 'var(--c-accent-red)', border: '1px solid var(--c-accent-red)' },
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', full, loading, disabled, children, style, ...rest }: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        ...BTN_SIZES[size],
        ...BTN_VARIANTS[variant],
        width: full ? '100%' : undefined,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'transform 120ms var(--c-ease-ui, ease), opacity 120ms ease, background 120ms ease',
        fontFamily: 'inherit',
        ...style,
      }}
      {...rest}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode;
  variant?: 'flat' | 'interactive' | 'accent';
  style?: CSSProperties;
  onClick?: () => void;
}
export function Card({ children, variant = 'flat', style, onClick }: CardProps) {
  const base: CSSProperties = {
    background: variant === 'accent' ? 'var(--c-accent-purple-soft)' : 'var(--c-surface-card)',
    border: `1px solid ${variant === 'accent' ? 'var(--c-accent-purple-border)' : 'var(--c-border-subtle)'}`,
    borderRadius: 16,
    padding: 20,
    boxShadow: 'var(--c-shadow-sm)',
    cursor: onClick ? 'pointer' : undefined,
  };
  return <div onClick={onClick} style={{ ...base, ...style }}>{children}</div>;
}

// ── Chip / Tag ──────────────────────────────────────────────────────────────────
type ChipTone = 'neutral' | 'accent' | 'positive' | 'caution' | 'danger';
const CHIP_TONES: Record<ChipTone, CSSProperties> = {
  neutral:  { background: 'var(--c-surface-elevated)', color: 'var(--c-text-secondary)' },
  accent:   { background: 'var(--c-accent-purple-soft)', color: 'var(--c-accent-purple)' },
  positive: { background: 'rgba(45,164,78,.10)', color: 'var(--c-accent-green)' },
  caution:  { background: 'rgba(212,136,15,.12)', color: 'var(--c-accent-amber)' },
  danger:   { background: 'rgba(178,58,46,.10)', color: 'var(--c-accent-red)' },
};
export function Chip({ tone = 'neutral', children, style }: { tone?: ChipTone; children: ReactNode; style?: CSSProperties }) {
  return (
    <span style={{
      ...CHIP_TONES[tone],
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
      ...style,
    }}>{children}</span>
  );
}

// ── Stat (the only sanctioned metric tile) ──────────────────────────────────────
export function Stat({ value, label, tone }: { value: ReactNode; label: string; tone?: 'accent' | 'default' }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontFamily: FR, fontSize: 28, fontWeight: 500, lineHeight: 1.1,
        color: tone === 'accent' ? 'var(--c-accent-purple)' : 'var(--c-text-primary)',
        fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--c-text-tertiary)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── ProgressRing ────────────────────────────────────────────────────────────────
export function ProgressRing({ pct, size = 72, stroke = 6, children }: { pct: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-border-subtle)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-accent-purple)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (clamped / 100) * c}
          style={{ transition: 'stroke-dashoffset 500ms var(--c-ease-spring, ease)' }} />
      </svg>
      {children && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
      )}
    </div>
  );
}

// ── EmptyState ──────────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {icon && <div style={{ color: 'var(--c-text-tertiary)', marginBottom: 4 }}>{icon}</div>}
      <div style={{ fontFamily: FR, fontSize: 20, fontWeight: 500, color: 'var(--c-text-primary)' }}>{title}</div>
      {body && <div style={{ fontSize: 14, color: 'var(--c-text-secondary)', maxWidth: 320, lineHeight: 1.5 }}>{body}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

// ── SegmentBar (the 30-30-40 preview) ────────────────────────────────────────────
export function SegmentBar({ segments }: { segments: { label: string; minutes: number }[] }) {
  const total = segments.reduce((s, x) => s + x.minutes, 0) || 1;
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {segments.map((s, i) => (
        <div key={i} style={{ flex: s.minutes / total, minWidth: 0 }}>
          <div style={{ height: 6, borderRadius: 3, background: i === 1 ? 'var(--c-accent-purple)' : 'var(--c-accent-purple-soft)' }} />
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--c-text-tertiary)', marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {s.label} · {s.minutes}m
          </div>
        </div>
      ))}
    </div>
  );
}
