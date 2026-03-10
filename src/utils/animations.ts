/**
 * Animation System — shared transition constants and CSS animation helpers.
 *
 * These values are used directly in inline style objects throughout the app.
 * The `variants` shape is framer-motion compatible (for easy future migration),
 * but the primary usage is via `cssTransitions` in style props.
 */

// ── CSS transition strings ────────────────────────────────────────────────────

export const cssTransitions = {
  fast:   '120ms ease',
  normal: '200ms ease',
  slow:   '350ms cubic-bezier(0.4, 0, 0.2, 1)',
  spring: '420ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  fade:   '180ms ease',
} as const;

// ── Motion config (framer-motion compatible) ──────────────────────────────────

export const transitions = {
  spring:       { type: 'spring', stiffness: 300, damping: 30 },
  springBouncy: { type: 'spring', stiffness: 400, damping: 25 },
  ease:         { type: 'tween', duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  slow:         { type: 'tween', duration: 0.6 },
} as const;

export const variants = {
  fadeUp: {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
    exit:    { opacity: 0, y: -10 },
  },
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: { opacity: 1 },
    exit:    { opacity: 0 },
  },
  scaleIn: {
    hidden:  { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit:    { opacity: 0 },
  },
  slideUp: {
    hidden:  { y: '100%' },
    visible: { y: 0 },
    exit:    { y: '100%' },
  },
  stagger: {
    visible: { transition: { staggerChildren: 0.05 } },
  },
} as const;

// ── Keyframe injection helper ─────────────────────────────────────────────────
// Call once in a root component to register shared @keyframes.

export const globalKeyframes = `
  @keyframes anim-fade-up {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes anim-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes anim-scale-in {
    from { opacity: 0; transform: scale(0.96); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes anim-slide-up {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes anim-pulse-skeleton {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.45; }
  }
`;

// Convenience CSS animation values (use in style.animation)
export const cssAnimations = {
  fadeUp:          'anim-fade-up   0.22s ease both',
  fadeIn:          'anim-fade-in   0.18s ease both',
  scaleIn:         'anim-scale-in  0.2s  ease both',
  slideUp:         'anim-slide-up  0.28s ease both',
  pulseSkeleton:   'anim-pulse-skeleton 1.6s ease-in-out infinite',
} as const;
