/**
 * Coheren Design System - Component Styles
 *
 * Reusable style objects for common components.
 * All styles follow the minimalist black/white aesthetic.
 */

import type { CSSProperties } from 'react';
import { tokens } from './tokens';

// ============================================
// CARD COMPONENTS
// ============================================

export const card = {
  // Standard card - Premium with ultra-subtle shadow
  standard: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing['2xl'],
    borderRadius: tokens.borderRadius.lg,
    border: `1px solid ${tokens.colors.borderLight}`,
    boxShadow: tokens.shadows.sm,
    transition: tokens.transitions.all,
  } as CSSProperties,

  // Elevated card - Slightly more prominent
  elevated: {
    backgroundColor: tokens.colors.surface,
    padding: tokens.spacing['2xl'],
    borderRadius: tokens.borderRadius.lg,
    border: `1px solid ${tokens.colors.borderLight}`,
    boxShadow: tokens.shadows.md,
  } as CSSProperties,

  // Interactive card (clickable) - Hover effect
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
// TEXT STYLES
// ============================================

export const text = {
  // Hero (landing pages - 64px, weight 200)
  hero: {
    fontSize: tokens.typography.sizes['5xl'],
    fontWeight: tokens.typography.weights.thin,
    letterSpacing: tokens.typography.letterSpacing.tight,
    lineHeight: tokens.typography.lineHeights.tight,
    color: tokens.colors.text.primary,
  } as CSSProperties,

  // Display (large hero text - 48px)
  display: {
    fontSize: tokens.typography.sizes['4xl'],
    fontWeight: tokens.typography.weights.thin,
    letterSpacing: tokens.typography.letterSpacing.tight,
    lineHeight: tokens.typography.lineHeights.tight,
    color: tokens.colors.text.primary,
  } as CSSProperties,

  // H1 (32px)
  h1: {
    fontSize: tokens.typography.sizes['3xl'],
    fontWeight: tokens.typography.weights.light,
    lineHeight: tokens.typography.lineHeights.snug,
    color: tokens.colors.text.primary,
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
