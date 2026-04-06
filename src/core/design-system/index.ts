/**
 * CONSIST Design System
 *
 * Complete design system export for consistent styling.
 * Import from here to get all design tokens and components.
 *
 * @example
 * import { tokens, button, layout, text } from '@/design-system';
 */

export { tokens } from './tokens';
export { button, card, progress, text, hoverHandlers } from './components';

// Re-export types
export type { Colors, Typography, Spacing, BorderRadius, Shadows, Transitions } from './tokens';

// Apple design system
export { ap } from './appleTokens';
export { Chip, Bar, Label, Tile, Divider } from './AppleUI';

// Coheren Design System (new spec)
export { dt, dtRaw, typeScale } from './designTokens';
