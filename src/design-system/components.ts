/**
 * CONSIST Design System - Component Styles
 *
 * Reusable style objects for common components.
 * All styles follow the minimalist black/white aesthetic.
 */

import type { CSSProperties } from 'react';
import { tokens } from './tokens';

// ============================================
// LAYOUT COMPONENTS
// ============================================

export const layout = {
  // Full-page centered container
  fullPageCentered: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.background,
    padding: `${tokens.spacing['3xl']} ${tokens.spacing.xl}`,
  } as CSSProperties,

  // Content container with max-width
  contentContainer: (maxWidth: string = '500px') => ({
    maxWidth,
    width: '100%',
  } as CSSProperties),

  // Dashboard layout
  dashboardLayout: {
    minHeight: '100vh',
    backgroundColor: tokens.colors.gray[50],
    paddingBottom: '80px',
  } as CSSProperties,

  // Header with border
  header: {
    backgroundColor: tokens.colors.background,
    borderBottom: `1px solid ${tokens.colors.gray[200]}`,
    padding: `20px ${tokens.spacing.xl}`,
  } as CSSProperties,
};

// ============================================
// BUTTON COMPONENTS
// ============================================

export const button = {
  // Primary CTA button
  primary: {
    padding: `${tokens.spacing.lg} ${tokens.spacing['2xl']}`,
    backgroundColor: tokens.colors.primary,
    color: tokens.colors.text.inverse,
    border: 'none',
    borderRadius: tokens.borderRadius.lg,
    fontSize: tokens.typography.sizes.lg,
    fontWeight: tokens.typography.weights.regular,
    cursor: 'pointer',
    transition: tokens.transitions.all,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
  } as CSSProperties,

  // Secondary button
  secondary: {
    padding: `${tokens.spacing.md} 20px`,
    backgroundColor: tokens.colors.background,
    color: tokens.colors.primary,
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.lg,
    fontSize: tokens.typography.sizes.md,
    fontWeight: tokens.typography.weights.light,
    cursor: 'pointer',
    transition: tokens.transitions.all,
  } as CSSProperties,

  // Icon button (circular)
  icon: (size: number = 40) => ({
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: tokens.colors.gray[50],
    border: 'none',
    borderRadius: tokens.borderRadius.full,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: tokens.transitions.colors,
  } as CSSProperties),

  // Disabled state
  disabled: {
    backgroundColor: tokens.colors.state.disabled,
    color: tokens.colors.text.tertiary,
    cursor: 'not-allowed',
  } as CSSProperties,
};

// ============================================
// INPUT COMPONENTS
// ============================================

export const input = {
  // Base input style
  base: {
    width: '100%',
    padding: tokens.spacing.lg,
    fontSize: tokens.typography.sizes.lg,
    fontWeight: tokens.typography.weights.light,
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.lg,
    outline: 'none',
    transition: 'border-color 0.2s',
  } as CSSProperties,

  // Time range container
  timeRange: {
    display: 'flex',
    gap: tokens.spacing.md,
    alignItems: 'center',
  } as CSSProperties,

  // Separator text
  separator: {
    color: tokens.colors.text.tertiary,
    fontWeight: tokens.typography.weights.light,
  } as CSSProperties,
};

// ============================================
// CARD COMPONENTS
// ============================================

export const card = {
  // Standard card
  standard: {
    backgroundColor: tokens.colors.background,
    padding: '20px',
    borderRadius: tokens.borderRadius.lg,
    border: `1px solid ${tokens.colors.gray[200]}`,
  } as CSSProperties,

  // Interactive card (clickable)
  interactive: {
    padding: tokens.spacing.xl,
    backgroundColor: tokens.colors.background,
    border: `1px solid ${tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.xl,
    cursor: 'pointer',
    transition: 'all 0.3s',
    textAlign: 'left' as const,
    width: '100%',
  } as CSSProperties,

  // Selection card (active state)
  selection: (isSelected: boolean) => ({
    padding: tokens.spacing.lg,
    backgroundColor: isSelected ? tokens.colors.primary : tokens.colors.background,
    color: isSelected ? tokens.colors.text.inverse : tokens.colors.primary,
    border: `1px solid ${isSelected ? tokens.colors.primary : tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.lg,
    cursor: 'pointer',
    transition: tokens.transitions.all,
  } as CSSProperties),

  // Stats card
  stats: {
    backgroundColor: tokens.colors.background,
    padding: tokens.spacing.lg,
    borderRadius: tokens.borderRadius.lg,
    border: `1px solid ${tokens.colors.gray[200]}`,
  } as CSSProperties,
};

// ============================================
// PROGRESS INDICATORS
// ============================================

export const progress = {
  // Progress bar container
  container: {
    height: '2px',
    backgroundColor: tokens.colors.gray[100],
    borderRadius: '1px',
    overflow: 'hidden' as const,
  } as CSSProperties,

  // Progress bar fill
  fill: (percentage: number) => ({
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: tokens.colors.primary,
    transition: 'width 0.3s',
  } as CSSProperties),

  // Progress text container
  textContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
  } as CSSProperties,

  // Progress label
  label: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: tokens.typography.weights.light,
    color: tokens.colors.text.tertiary,
  } as CSSProperties,
};

// ============================================
// CHECKBOX COMPONENTS
// ============================================

export const checkbox = {
  // Square checkbox (multi-select)
  square: (isSelected: boolean) => ({
    width: '20px',
    height: '20px',
    border: `2px solid ${isSelected ? tokens.colors.text.inverse : tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.sm,
    backgroundColor: isSelected ? tokens.colors.text.inverse : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as CSSProperties),

  // Square checkbox inner (when selected)
  squareInner: {
    width: '10px',
    height: '10px',
    backgroundColor: tokens.colors.primary,
    borderRadius: '2px',
  } as CSSProperties,

  // Circle checkbox (task completion)
  circle: (isCompleted: boolean) => ({
    width: '24px',
    height: '24px',
    backgroundColor: isCompleted ? tokens.colors.primary : tokens.colors.background,
    border: `2px solid ${isCompleted ? tokens.colors.primary : tokens.colors.gray[300]}`,
    borderRadius: tokens.borderRadius.full,
    cursor: isCompleted ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: tokens.transitions.all,
    flexShrink: 0,
  } as CSSProperties),
};

// ============================================
// BADGE COMPONENTS
// ============================================

export const badge = {
  // Standard badge
  standard: {
    fontSize: tokens.typography.sizes.xs,
    fontWeight: tokens.typography.weights.regular,
    color: tokens.colors.primary,
    backgroundColor: tokens.colors.gray[200],
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    borderRadius: tokens.borderRadius.md,
    display: 'inline-block' as const,
  } as CSSProperties,

  // Status badge container
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  } as CSSProperties,
};

// ============================================
// GRID LAYOUTS
// ============================================

export const grid = {
  // 3-column stats grid
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: tokens.spacing.md,
  } as CSSProperties,

  // Responsive auto-fit grid
  autoFit: (minWidth: string = '300px') => ({
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
    gap: tokens.spacing.lg,
  } as CSSProperties),

  // Small button grid
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: tokens.spacing.md,
  } as CSSProperties,
};

// ============================================
// FLEX LAYOUTS
// ============================================

export const flex = {
  // Horizontal with gap
  row: (gap: string = tokens.spacing.md) => ({
    display: 'flex',
    gap,
  } as CSSProperties),

  // Vertical stack
  column: (gap: string = tokens.spacing.md) => ({
    display: 'flex',
    flexDirection: 'column' as const,
    gap,
  } as CSSProperties),

  // Space between
  spaceBetween: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as CSSProperties,

  // Centered
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  // Icon + text pattern
  iconText: (gap: string = tokens.spacing.sm) => ({
    display: 'flex',
    alignItems: 'center',
    gap,
  } as CSSProperties),
};

// ============================================
// TEXT STYLES
// ============================================

export const text = {
  // Display (large hero text)
  display: {
    fontSize: tokens.typography.sizes['4xl'],
    fontWeight: tokens.typography.weights.light,
    letterSpacing: tokens.typography.letterSpacing.tight,
    lineHeight: tokens.typography.lineHeights.tight,
  } as CSSProperties,

  // H1
  h1: {
    fontSize: tokens.typography.sizes['3xl'],
    fontWeight: tokens.typography.weights.light,
    lineHeight: tokens.typography.lineHeights.normal,
  } as CSSProperties,

  // H2
  h2: {
    fontSize: tokens.typography.sizes['2xl'],
    fontWeight: tokens.typography.weights.light,
    lineHeight: tokens.typography.lineHeights.normal,
  } as CSSProperties,

  // H3
  h3: {
    fontSize: tokens.typography.sizes.xl,
    fontWeight: tokens.typography.weights.light,
    lineHeight: tokens.typography.lineHeights.normal,
  } as CSSProperties,

  // H4
  h4: {
    fontSize: tokens.typography.sizes.lg,
    fontWeight: tokens.typography.weights.regular,
    lineHeight: tokens.typography.lineHeights.normal,
  } as CSSProperties,

  // Body large
  bodyLarge: {
    fontSize: tokens.typography.sizes.lg,
    fontWeight: tokens.typography.weights.light,
    lineHeight: tokens.typography.lineHeights.loose,
  } as CSSProperties,

  // Body
  body: {
    fontSize: tokens.typography.sizes.base,
    fontWeight: tokens.typography.weights.light,
    lineHeight: tokens.typography.lineHeights.loose,
  } as CSSProperties,

  // Body small
  bodySmall: {
    fontSize: tokens.typography.sizes.md,
    fontWeight: tokens.typography.weights.light,
    lineHeight: tokens.typography.lineHeights.loose,
  } as CSSProperties,

  // Caption
  caption: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: tokens.typography.weights.light,
    lineHeight: tokens.typography.lineHeights.relaxed,
  } as CSSProperties,

  // Label
  label: {
    fontSize: tokens.typography.sizes.sm,
    fontWeight: tokens.typography.weights.regular,
    lineHeight: tokens.typography.lineHeights.relaxed,
  } as CSSProperties,

  // Micro
  micro: {
    fontSize: tokens.typography.sizes.xs,
    fontWeight: tokens.typography.weights.light,
    lineHeight: tokens.typography.lineHeights.relaxed,
  } as CSSProperties,

  // Section header (uppercase)
  sectionHeader: {
    fontSize: tokens.typography.sizes.md,
    fontWeight: tokens.typography.weights.regular,
    color: tokens.colors.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: tokens.typography.letterSpacing.wide,
    marginBottom: tokens.spacing.lg,
  } as CSSProperties,
};

// ============================================
// HOVER STATE HELPERS
// ============================================

export const hoverHandlers = {
  // Light background hover (for white buttons)
  lightBg: {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = tokens.colors.state.hover;
      e.currentTarget.style.borderColor = tokens.colors.primary;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = tokens.colors.background;
      e.currentTarget.style.borderColor = tokens.colors.gray[300];
    },
  },

  // Dark button hover
  darkBg: {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = tokens.colors.state.hoverDark;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.backgroundColor = tokens.colors.primary;
    },
  },

  // Card hover with shadow
  cardHover: {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.borderColor = tokens.colors.primary;
      e.currentTarget.style.boxShadow = tokens.shadows.lg;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.borderColor = tokens.colors.gray[300];
      e.currentTarget.style.boxShadow = tokens.shadows.none;
    },
  },
};

// ============================================
// FOCUS STATE HELPERS
// ============================================

export const focusHandlers = {
  // Input focus
  input: {
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = tokens.colors.primary;
    },
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
      e.currentTarget.style.borderColor = tokens.colors.gray[300];
    },
  },
};
