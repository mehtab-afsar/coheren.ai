/**
 * Coheren Design System
 *
 * Complete design system export for consistent styling.
 * Import from here to get all design tokens and components.
 *
 * @example
 * import { tokens, card, text } from '@/design-system';
 */

export { tokens } from './tokens';
export { card, text } from './components';

// Re-export types
export type { Colors, Typography, Spacing, BorderRadius, Shadows, Transitions } from './tokens';

// Apple design system
export { ap } from './appleTokens';
export { Label, Tile } from './AppleUI';
