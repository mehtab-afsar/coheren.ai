# CONSIST Design System

A complete, type-safe design system for the CONSIST app implementing the philosophy of **minimalism, consistency, and cognitive load reduction**.

## 📁 Structure

```
design-system/
├── tokens.ts          # Core design tokens (colors, typography, spacing, etc.)
├── components.ts      # Pre-built component style objects
├── index.ts           # Main exports
├── README.md          # This file
├── USAGE.md           # Usage guide with examples
└── MIGRATION.md       # Migration guide for refactoring existing components
```

## 🚀 Quick Start

```typescript
import { tokens, button, layout, text, hoverHandlers } from '@/design-system';

function MyComponent() {
  return (
    <div style={layout.fullPageCentered}>
      <div style={layout.contentContainer('500px')}>
        <h1 style={text.h1}>Hello CONSIST</h1>
        <button
          style={button.primary}
          {...hoverHandlers.darkBg}
        >
          Click me
        </button>
      </div>
    </div>
  );
}
```

## 📦 What's Included

### Design Tokens (`tokens.ts`)

- **Colors**: Primary, grays (50-900), semantic colors, state colors, text colors
- **Typography**: Font family, weights (300, 400, 500), sizes (xs to 4xl), line heights
- **Spacing**: 4px-based scale (xs: 4px → 3xl: 48px)
- **Border Radius**: none to full (0 → 9999px)
- **Shadows**: Subtle elevation shadows
- **Transitions**: Consistent timing (0.2s standard)

### Component Styles (`components.ts`)

#### Layouts
- `layout.fullPageCentered` - Full viewport centered container
- `layout.contentContainer(maxWidth)` - Constrained content area
- `layout.dashboardLayout` - Main app layout
- `layout.header` - Page headers

#### Buttons
- `button.primary` - Black filled button
- `button.secondary` - White outlined button
- `button.icon(size)` - Icon-only button
- `button.disabled` - Disabled state

#### Inputs
- `input.base` - Standard text input
- `input.timeRange` - Time picker input
- `input.separator` - Time range separator

#### Cards
- `card.standard` - Basic card container
- `card.interactive` - Clickable card
- `card.selection(isSelected)` - Selection card (radio/checkbox style)
- `card.stats` - Stats display card

#### Progress
- `progress.container` - Progress bar container
- `progress.fill(percentage)` - Progress bar fill
- `progress.labels` - Progress labels

#### Other Components
- `checkbox.square` / `checkbox.circle` - Checkbox styles
- `badge.default` / `badge.success` / `badge.warning` - Badge variants
- `grid.*` - Grid layouts (stats, autoFit, buttonGrid)
- `flex.*` - Flex layouts (row, column, spaceBetween, centered, iconText)
- `text.*` - Text styles (display, h1-h4, body variants, caption, label, etc.)

#### Interaction Handlers
- `hoverHandlers.lightBg` - Light background hover effect
- `hoverHandlers.darkBg` - Dark background hover effect
- `hoverHandlers.cardHover` - Card hover effect
- `focusHandlers.input` - Input focus effect

## 🎨 Design Philosophy

### Core Principles

1. **Minimalism**: Black and white palette, 300 font weight default
2. **Consistency**: All spacing uses 4px base unit
3. **Cognitive Load Reduction**: Pre-built components reduce decision-making
4. **Type Safety**: Full TypeScript support with autocomplete
5. **Zero Dependencies**: Pure inline styles, no CSS-in-JS libraries
6. **Progressive Disclosure**: Components reveal complexity only when needed

### Visual Language

- **Colors**: Black (#000) for primary actions, white (#fff) backgrounds, grays for hierarchy
- **Typography**: Inter font at 300 weight (light) for elegance, 400 for emphasis
- **Spacing**: Consistent 4px grid (4, 8, 12, 16, 24, 32, 48)
- **Borders**: 12px radius standard, full radius for pills
- **Transitions**: 0.2s for all interactions (fast and responsive)

## 📖 Documentation

### [USAGE.md](./USAGE.md)
Complete usage guide with:
- Import examples
- Component usage patterns
- Composing styles
- Common patterns (question screens, stats grids, etc.)
- Best practices

### [MIGRATION.md](./MIGRATION.md)
Migration guide with:
- Before/after refactoring examples
- Common refactoring patterns
- Migration checklist
- Testing guidelines

### [../../DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md)
Comprehensive reference with:
- Complete design philosophy
- Visual design system details
- All component patterns with screenshots
- Interaction patterns
- Code conventions

## ✅ Benefits

### For Developers
- ✅ **Faster Development**: Pre-built components eliminate repetitive styling
- ✅ **Type Safety**: TypeScript autocomplete for all tokens
- ✅ **Consistency**: No more guessing spacing or color values
- ✅ **Maintainability**: Change design globally by editing token files
- ✅ **Code Reduction**: 30-40% less code per component

### For Users
- ✅ **Consistent Experience**: Every screen feels cohesive
- ✅ **Familiar Patterns**: Learned interactions transfer across app
- ✅ **Performance**: No CSS bundle overhead (inline styles)
- ✅ **Accessibility**: Proper focus states and color contrast

## 🔧 Customization

### Extending Components

Create custom variants by composing existing styles:

```typescript
const myCustomButton = {
  ...button.primary,
  fontSize: tokens.typography.sizes.xl,
  borderRadius: tokens.borderRadius.full,
};
```

### Adding New Tokens

Edit `tokens.ts` to add new values:

```typescript
export const tokens = {
  colors: {
    // ... existing colors
    brand: {
      purple: '#6B46C1',
      blue: '#2B6CB0',
    },
  },
  // ...
};
```

### Adding New Components

Edit `components.ts` to add new component styles:

```typescript
export const myNewComponent = {
  base: {
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.gray[50],
    borderRadius: tokens.borderRadius.md,
  } as CSSProperties,
};
```

Then export from `index.ts`:

```typescript
export { myNewComponent } from './components';
```

## 🧪 Usage in Components

### Simple Example

```typescript
import { tokens, text } from '../design-system';

<p style={text.body}>
  This uses the design system!
</p>
```

### Composed Example

```typescript
import { tokens, card, text, flex } from '../design-system';

<div style={{
  ...card.standard,
  padding: tokens.spacing.xl,
}}>
  <div style={flex.iconText}>
    <CheckCircle size={20} />
    <span style={text.bodyLarge}>Task completed</span>
  </div>
</div>
```

### Full Component Example

```typescript
import { tokens, layout, button, text, hoverHandlers } from '../design-system';

function QuestionScreen() {
  return (
    <div style={layout.fullPageCentered}>
      <div style={layout.contentContainer('500px')}>
        <h1 style={text.h1}>What's your name?</h1>

        <p style={{
          ...text.body,
          marginTop: tokens.spacing.md,
          marginBottom: tokens.spacing.xl,
        }}>
          We'll use this to personalize your experience.
        </p>

        <button
          style={button.primary}
          {...hoverHandlers.darkBg}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
```

## 📋 Migration Status

Current migration progress:

- ✅ Design system implemented
- ✅ Welcome.tsx migrated
- ⏳ GoalSelection.tsx (next)
- ⏳ SpecificGoal.tsx
- ⏳ UniversalQuestions.tsx
- ⏳ CategoryQuestions.tsx
- ⏳ RoadmapGeneration.tsx
- ⏳ CheckInSetup.tsx
- ⏳ Dashboard.tsx
- ⏳ Settings.tsx

See [MIGRATION.md](./MIGRATION.md) for detailed migration guide.

## 🎯 Design System Goals

### Achieved ✅
- [x] Centralized design tokens
- [x] Type-safe token system
- [x] Pre-built component styles
- [x] Reusable hover/focus handlers
- [x] Comprehensive documentation
- [x] Migration guide
- [x] First component refactored (Welcome.tsx)

### Future Enhancements 🚀
- [ ] Dark mode support (tokens structure ready)
- [ ] Animation variants (entrance, exit, loading)
- [ ] Responsive breakpoint helpers
- [ ] Accessibility utilities (focus rings, screen reader text)
- [ ] Component composition helpers
- [ ] Storybook integration (component preview)

## 💡 Tips

1. **Always import from `@/design-system`** - Single source of truth
2. **Use tokens for all values** - No hardcoded colors/spacing
3. **Compose when needed** - Combine styles with spread operator
4. **Prefer pre-built components** - Use `button.primary` over custom styles
5. **Check USAGE.md first** - Examples for common patterns
6. **Maintain consistency** - Follow existing patterns

## 🤝 Contributing

When adding new components or tokens:

1. Follow existing naming conventions
2. Use TypeScript types (`CSSProperties`)
3. Add documentation to USAGE.md
4. Add migration examples to MIGRATION.md
5. Test across all browsers
6. Ensure accessibility (focus states, contrast)

## 📞 Support

- See [USAGE.md](./USAGE.md) for usage examples
- See [MIGRATION.md](./MIGRATION.md) for refactoring help
- See [../../DESIGN_SYSTEM.md](../../DESIGN_SYSTEM.md) for design philosophy

---

**Built with the CONSIST philosophy: Stop planning. Start doing.**

Version: 1.0.0 (MVP Design System)
