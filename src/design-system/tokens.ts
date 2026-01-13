/**
 * CONSIST Design System - Design Tokens
 *
 * Premium "Focused Clarity" Design System
 * Philosophy: Effortless clarity meets intelligent luxury
 *
 * Key principles:
 * - Warm, breathable backgrounds (not pure white)
 * - Muted, sophisticated primary colors
 * - Ultra-subtle shadows and borders
 * - Generous whitespace
 */

export const tokens = {
  // ============================================
  // COLORS - "Focused Clarity" Palette
  // ============================================
  colors: {
    // Primary - Muted Indigo (Focus, calm determination)
    primary: '#6366F1',
    primaryHover: '#4F46E5',
    primaryLight: '#818CF8',
    primarySubtle: '#EEF2FF',

    // Backgrounds - Warm, not pure white
    background: '#FFFCF9',      // Warm white
    surface: '#FFFFFF',         // Card surfaces
    surfaceHover: '#FAFBFC',    // Hover state for cards
    elevated: '#F8FAFC',        // Elevated surfaces

    // Borders & Dividers - Ultra-subtle
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    divider: '#F8FAFC',

    // Grays - Cool slate tones
    gray: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      300: '#CBD5E1',
      400: '#94A3B8',
      500: '#64748B',
      600: '#475569',
      700: '#334155',
      800: '#1E293B',
      900: '#0F172A',
    },

    // Semantic - Sophisticated, not aggressive
    success: '#10B981',         // Emerald (achievement without aggression)
    successBg: '#D1FAE5',
    warning: '#F59E0B',         // Amber (not red for overdue!)
    warningBg: '#FEF3C7',
    error: '#EF4444',           // Only for actual errors
    errorBg: '#FEE2E2',

    // Interactive States
    state: {
      hover: '#F8FAFC',
      hoverScale: 1.01,         // Subtle scale on hover
      disabled: '#E2E8F0',
      focus: '#6366F1',
      focusRing: 'rgba(99, 102, 241, 0.1)',
    },

    // Text Hierarchy
    text: {
      primary: '#0F172A',       // Deep slate (not black)
      secondary: '#64748B',     // Medium slate
      tertiary: '#94A3B8',      // Light slate
      disabled: '#CBD5E1',
      inverse: '#FFFFFF',
      onPrimary: '#FFFFFF',
    },
  },

  // ============================================
  // TYPOGRAPHY - Premium Scale
  // ============================================
  typography: {
    fontFamily: {
      primary: "'Inter', system-ui, -apple-system, sans-serif",
      accent: "'Fraunces', serif",  // For emotional moments, achievements
    },

    weights: {
      thin: 200,     // Hero text (landing, large headings)
      light: 300,    // Body text, most content
      regular: 400,  // Emphasis, buttons, labels
      medium: 500,   // Strong emphasis (use sparingly)
      semibold: 600, // Rare, only for critical CTAs
    },

    sizes: {
      xs: '11px',    // Tiny labels
      sm: '12px',    // Small labels, metadata
      md: '13px',    // Microcopy
      base: '15px',  // Body text (primary reading size)
      lg: '16px',    // Subheadings
      xl: '20px',    // Section headings
      '2xl': '28px', // Page titles
      '3xl': '32px', // Large titles
      '4xl': '48px', // Feature headings
      '5xl': '64px', // Hero text (landing pages)
    },

    lineHeights: {
      tight: 1.2,    // Large headings
      snug: 1.3,     // Subheadings
      normal: 1.5,   // Body text
      relaxed: 1.6,  // Long-form reading
      loose: 1.8,    // Very spacious
    },

    letterSpacing: {
      tighter: '-0.03em',  // -3% for very large text
      tight: '-0.02em',    // -2% for large text (hero)
      normal: '0',          // Default
      wide: '0.02em',      // Uppercase labels
      wider: '0.05em',     // Spaced caps
    },
  },

  // ============================================
  // SPACING - Premium 8px Scale
  // ============================================
  spacing: {
    xs: '4px',     // 0.5 unit
    sm: '8px',     // 1 unit (base)
    md: '12px',    // 1.5 units
    lg: '16px',    // 2 units
    xl: '24px',    // 3 units
    '2xl': '32px', // 4 units
    '3xl': '48px', // 6 units (section padding)
    '4xl': '64px', // 8 units (premium content padding)
    '5xl': '96px', // 12 units (hero sections)
  },

  // ============================================
  // BORDER RADIUS - Modern, Not Playful
  // ============================================
  borderRadius: {
    none: '0',
    sm: '4px',     // Tight elements
    md: '8px',     // Buttons, inputs
    lg: '12px',    // Cards (premium feel)
    xl: '16px',    // Large surfaces
    '2xl': '20px', // Modals, sheets
    full: '9999px', // Circles, pills
  },

  // ============================================
  // SHADOWS - Ultra-Subtle (Max 0.05 Opacity)
  // ============================================
  shadows: {
    none: 'none',
    xs: '0 1px 2px rgba(0, 0, 0, 0.02)',          // Barely visible
    sm: '0 1px 3px rgba(0, 0, 0, 0.05)',          // Cards at rest
    md: '0 4px 6px rgba(0, 0, 0, 0.05)',          // Elevated cards
    lg: '0 10px 15px rgba(0, 0, 0, 0.05)',        // Modals
    xl: '0 20px 25px rgba(0, 0, 0, 0.05)',        // Floating elements
    inner: 'inset 0 2px 4px rgba(0, 0, 0, 0.03)', // Recessed inputs
  },

  // ============================================
  // TRANSITIONS - Cubic Bezier Premium Feel
  // ============================================
  transitions: {
    // Durations
    fast: '150ms',
    base: '200ms',
    medium: '300ms',
    slow: '500ms',

    // Easing functions
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Premium feel
      in: 'cubic-bezier(0.4, 0, 1, 1)',             // Entering
      out: 'cubic-bezier(0, 0, 0.2, 1)',            // Exiting
      inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',        // Both
    },

    // Common patterns
    all: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    colors: 'background-color 200ms, color 200ms, border-color 200ms',
    transform: 'transform 200ms cubic-bezier(0.4, 0, 0.2, 1)',
    opacity: 'opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  },

  // ============================================
  // BREAKPOINTS
  // ============================================
  breakpoints: {
    sm: '448px',   // Small forms/modals
    md: '500px',   // Default forms
    lg: '600px',   // Category grids
    xl: '672px',   // Large grids
    mobile: '768px', // Mobile breakpoint
  },

  // ============================================
  // PAGE WIDTHS
  // ============================================
  pageWidths: {
    narrow: '448px',      // Welcome screens
    standard: '500px',    // Most onboarding forms
    comfortable: '600px', // Content-heavy pages
    wide: '672px',        // Grid selection pages
    full: '100%',         // Dashboard, Settings
  },

  // ============================================
  // SIDEBAR WIDTHS
  // ============================================
  sidebar: {
    expanded: '240px',
    collapsed: '60px',
  },

  // ============================================
  // Z-INDEX LAYERS
  // ============================================
  zIndex: {
    sidebar: 100,
    mobileNav: 200,
    modal: 1000,
    modalBackdrop: 999,
  },
};

// ============================================
// TYPE-SAFE EXPORTS
// ============================================
export type Colors = typeof tokens.colors;
export type Typography = typeof tokens.typography;
export type Spacing = typeof tokens.spacing;
export type BorderRadius = typeof tokens.borderRadius;
export type Shadows = typeof tokens.shadows;
export type Transitions = typeof tokens.transitions;
