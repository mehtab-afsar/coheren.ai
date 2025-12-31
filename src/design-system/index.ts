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
export { button, card, input, layout, progress, checkbox, badge, grid, flex, text, hoverHandlers, focusHandlers } from './components';

// Re-export types
export type { Colors, Typography, Spacing, BorderRadius, Shadows, Transitions } from './tokens';
