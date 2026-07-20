/**
 * Coheren Design System Tokens
 * Single source of truth — mirrors the CSS custom properties in index.css.
 * Use `dt` (design tokens) in new components; legacy views continue using `ap` / `tokens`.
 */

export const dt = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  surfaceBg:      'var(--c-surface-bg)',
  surfaceElevated: 'var(--c-surface-elevated)',
  surfaceCard:    'var(--c-surface-card)',
  surfaceOverlay: 'var(--c-surface-overlay)',

  // ── Borders ───────────────────────────────────────────────────────────────
  borderSubtle: 'var(--c-border-subtle)',
  borderMedium: 'var(--c-border-medium)',

  // ── Text ──────────────────────────────────────────────────────────────────
  textPrimary:   'var(--c-text-primary)',
  textSecondary: 'var(--c-text-secondary)',
  textTertiary:  'var(--c-text-tertiary)',
  textAccent:    'var(--c-text-accent)',

  // ── Accent palette ────────────────────────────────────────────────────────
  accentPurple: 'var(--c-accent-purple)',
  accentBlue:   'var(--c-accent-blue)',
  accentGreen:  'var(--c-accent-green)',
  accentAmber:  'var(--c-accent-amber)',
  accentRed:    'var(--c-accent-red)',

  // ── Gradients ─────────────────────────────────────────────────────────────
  gradientPurple: 'var(--c-gradient-purple)',
  gradientBlue:   'var(--c-gradient-blue)',
  gradientGreen:  'var(--c-gradient-green)',
  gradientSoft:   'var(--c-gradient-soft)',

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadowXs:    'var(--c-shadow-xs)',
  shadowSm:    'var(--c-shadow-sm)',
  shadowMd:    'var(--c-shadow-md)',
  shadowLg:    'var(--c-shadow-lg)',
  shadowFocus: 'var(--c-shadow-focus)',

  // ── Spacing ───────────────────────────────────────────────────────────────
  spaceXs:  'var(--c-space-xs)',
  spaceSm:  'var(--c-space-sm)',
  spaceMd:  'var(--c-space-md)',
  spaceLg:  'var(--c-space-lg)',
  spaceXl:  'var(--c-space-xl)',
  space2xl: 'var(--c-space-2xl)',
  space3xl: 'var(--c-space-3xl)',
  space4xl: 'var(--c-space-4xl)',

  // ── Border radius ─────────────────────────────────────────────────────────
  radiusXs:   'var(--c-radius-xs)',
  radiusSm:   'var(--c-radius-sm)',
  radiusMd:   'var(--c-radius-md)',
  radiusLg:   'var(--c-radius-lg)',
  radiusXl:   'var(--c-radius-xl)',
  radiusFull: 'var(--c-radius-full)',

  // ── Typography ────────────────────────────────────────────────────────────
  fontDisplay: 'var(--c-font-display)',
  fontBody:    'var(--c-font-body)',

  // ── Easing ────────────────────────────────────────────────────────────────
  easeSpring: 'var(--c-ease-spring)',
  easeUi:     'var(--c-ease-ui)',
} as const;

// ── Resolved raw values (use where CSS variables aren't supported, e.g. Framer Motion) ──
export const dtRaw = {
  accentPurple: '#7c3aed',
  accentBlue:   '#4a90e2',
  accentGreen:  '#51cf66',
  accentAmber:  '#ffa94d',
  accentRed:    '#ff6b6b',
  textPrimary:  '#1a1a1a',
  textSecondary: '#666666',
  textTertiary: '#999999',
  surfaceBg:    '#ffffff',
  surfaceElevated: '#fafafa',
  surfaceCard:  '#f8f8f8',
  easeSpring:   [0.16, 1, 0.3, 1] as [number, number, number, number],
  easeUi:       [0.4, 0, 0.2, 1] as [number, number, number, number],
} as const;

// ── Type scale helpers ─────────────────────────────────────────────────────
export const typeScale = {
  display1: { fontSize: 56, lineHeight: 1.1, letterSpacing: '-0.02em', fontFamily: 'var(--c-font-display)' },
  display2: { fontSize: 48, lineHeight: 1.1, letterSpacing: '-0.02em', fontFamily: 'var(--c-font-display)' },
  h1:       { fontSize: 32, lineHeight: 1.2, letterSpacing: '-0.01em', fontFamily: 'var(--c-font-display)' },
  h2:       { fontSize: 24, lineHeight: 1.3, letterSpacing: '-0.01em', fontFamily: 'var(--c-font-display)' },
  h3:       { fontSize: 20, lineHeight: 1.4, fontFamily: 'var(--c-font-display)' },
  bodyLg:   { fontSize: 18, lineHeight: 1.6, fontFamily: 'var(--c-font-body)' },
  body:     { fontSize: 16, lineHeight: 1.6, fontFamily: 'var(--c-font-body)' },
  bodySm:   { fontSize: 14, lineHeight: 1.5, fontFamily: 'var(--c-font-body)' },
  label:    { fontSize: 12, lineHeight: 1.4, letterSpacing: '0.01em', textTransform: 'uppercase' as const, fontFamily: 'var(--c-font-body)' },
} as const;
