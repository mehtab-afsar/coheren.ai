/**
 * CONSIST Design System - Design Tokens
 *
 * Centralized design tokens for consistent styling across the application.
 * Based on the minimalist black/white aesthetic with Inter font.
 *
 * Philosophy: "Stop planning. Start doing."
 */

export const tokens = {
  // ============================================
  // COLORS
  // ============================================
  colors: {
    // Primary
    primary: '#000000',
    background: '#ffffff',

    // Grays (Light to Dark)
    gray: {
      50: '#fafafa',   // Secondary backgrounds, disabled states
      100: '#f5f5f5',  // Icon backgrounds, progress bars
      200: '#f0f0f0',  // Borders, dividers
      300: '#e5e5e5',  // Input borders, unselected states
      600: '#666666',  // Secondary text
      700: '#999999',  // Tertiary/helper text
      800: '#cccccc',  // Subtle text
      900: '#e0e0e0',  // Very subtle text
    },

    // Semantic
    semantic: {
      error: '#ef5350',
      errorBg: '#ffebee',
      success: '#000000',
      warning: '#ff6b35',  // Streak indicator
    },

    // Interactive states
    state: {
      hover: '#fafafa',
      hoverDark: '#333333',
      disabled: '#e5e5e5',
      focus: '#000000',
    },

    // Text
    text: {
      primary: '#000000',
      secondary: '#666666',
      tertiary: '#999999',
      disabled: '#cccccc',
      inverse: '#ffffff',
    },
  },

  // ============================================
  // TYPOGRAPHY
  // ============================================
  typography: {
    fontFamily: {
      primary: "'Inter', system-ui, -apple-system, sans-serif",
    },

    weights: {
      light: 300,    // Default for most text
      regular: 400,  // Emphasis, buttons, labels
      medium: 500,   // Strong emphasis (rare)
    },

    sizes: {
      xs: '11px',
      sm: '12px',
      md: '14px',
      base: '15px',
      lg: '16px',
      xl: '20px',
      '2xl': '28px',
      '3xl': '32px',
      '4xl': '60px',
    },

    lineHeights: {
      tight: 1.2,
      normal: 1.3,
      relaxed: 1.5,
      loose: 1.6,
    },

    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.5px',
    },
  },

  // ============================================
  // SPACING
  // ============================================
  spacing: {
    xs: '4px',    // 1 unit
    sm: '8px',    // 2 units
    md: '12px',   // 3 units
    lg: '16px',   // 4 units
    xl: '24px',   // 6 units
    '2xl': '32px', // 8 units
    '3xl': '48px', // 12 units
  },

  // ============================================
  // BORDER RADIUS
  // ============================================
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '6px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
  },

  // ============================================
  // SHADOWS
  // ============================================
  shadows: {
    none: 'none',
    sm: '0 2px 8px rgba(0, 0, 0, 0.05)',
    md: '0 4px 16px rgba(0, 0, 0, 0.08)',
    lg: '0 10px 40px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 60px rgba(0, 0, 0, 0.15)',
  },

  // ============================================
  // TRANSITIONS
  // ============================================
  transitions: {
    fast: '0.2s',
    medium: '0.3s',
    slow: '0.5s',

    // Common patterns
    all: 'all 0.2s ease-out',
    colors: 'background-color 0.2s, color 0.2s, border-color 0.2s',
    transform: 'transform 0.3s ease-out',
  },

  // ============================================
  // BREAKPOINTS
  // ============================================
  breakpoints: {
    sm: '448px',   // Small forms/modals
    md: '500px',   // Default forms
    lg: '600px',   // Category grids
    xl: '672px',   // Large grids
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
