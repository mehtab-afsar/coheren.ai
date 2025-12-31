# Design System Usage Guide

## Quick Start

Import design tokens and components from the centralized design system:

```typescript
import { tokens, button, layout, text, input } from '@/design-system';
```

## Basic Usage Patterns

### 1. Using Tokens Directly

```typescript
// Colors
style={{ color: tokens.colors.text.primary }}
style={{ backgroundColor: tokens.colors.gray[50] }}

// Typography
style={{
  fontFamily: tokens.typography.fontFamily.primary,
  fontSize: tokens.typography.sizes.lg,
  fontWeight: tokens.typography.weights.light
}}

// Spacing
style={{
  padding: tokens.spacing.xl,
  gap: tokens.spacing.md
}}

// Border Radius
style={{ borderRadius: tokens.borderRadius.lg }}

// Transitions
style={{ transition: tokens.transitions.all }}
```

### 2. Using Pre-built Component Styles

#### Buttons

```typescript
// Primary button
<button style={button.primary}>
  Continue
</button>

// Secondary button
<button style={button.secondary}>
  Back
</button>

// Icon button
<button style={button.icon(40)}>
  <ChevronLeft size={20} />
</button>

// Disabled button
<button style={button.disabled} disabled>
  Continue
</button>
```

#### Layouts

```typescript
// Full page centered
<div style={layout.fullPageCentered}>
  <div style={layout.contentContainer('600px')}>
    {/* Content */}
  </div>
</div>

// Dashboard layout
<div style={layout.dashboardLayout}>
  {/* Content */}
</div>

// Header
<div style={layout.header}>
  {/* Header content */}
</div>
```

#### Text Styles

```typescript
<h1 style={text.display}>Welcome</h1>
<h2 style={text.h1}>Choose Your Goal</h2>
<p style={text.bodyLarge}>This is body text</p>
<span style={text.caption}>Helper text</span>
```

#### Inputs

```typescript
<input
  type="text"
  style={input.base}
  placeholder="Enter your name"
/>

<input
  type="time"
  style={input.timeRange}
/>
```

#### Cards

```typescript
// Standard card
<div style={card.standard}>
  {/* Content */}
</div>

// Interactive card (clickable)
<div
  style={card.interactive}
  {...hoverHandlers.cardHover}
>
  {/* Content */}
</div>

// Selection card (radio/checkbox option)
<div
  style={card.selection(isSelected)}
  onClick={handleSelect}
>
  {/* Content */}
</div>
```

### 3. Using Hover/Focus Handlers

```typescript
// Light background hover
<button
  style={button.secondary}
  {...hoverHandlers.lightBg}
>
  Click me
</button>

// Dark background hover
<button
  style={button.primary}
  {...hoverHandlers.darkBg}
>
  Submit
</button>

// Input focus
<input
  style={input.base}
  {...focusHandlers.input}
/>
```

### 4. Composing Styles

```typescript
// Combine multiple style objects
<div style={{
  ...layout.contentContainer('500px'),
  padding: tokens.spacing.xl,
}}>
  {/* Content */}
</div>

// Override specific properties
<button style={{
  ...button.primary,
  fontSize: tokens.typography.sizes.xl,
}}>
  Large Button
</button>
```

## Migration Example

### Before (hardcoded inline styles):

```typescript
<button
  onClick={handleContinue}
  style={{
    width: '100%',
    padding: '16px 32px',
    backgroundColor: 'black',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 400,
    cursor: 'pointer',
    transition: 'all 0.2s'
  }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'black'}
>
  Continue
</button>
```

### After (using design system):

```typescript
import { button, hoverHandlers } from '@/design-system';

<button
  onClick={handleContinue}
  style={button.primary}
  {...hoverHandlers.darkBg}
>
  Continue
</button>
```

**Benefits**:
- ✅ 90% less code
- ✅ Consistent styling across app
- ✅ Easy to update globally
- ✅ Type-safe
- ✅ Reusable

## Common Patterns

### Category Selection Card

```typescript
const categories = ['Fitness', 'Exam', 'Hobby'];
const [selected, setSelected] = useState<string | null>(null);

return (
  <div style={grid.buttonGrid}>
    {categories.map((category) => (
      <div
        key={category}
        style={card.selection(selected === category)}
        onClick={() => setSelected(category)}
      >
        <div style={text.bodyLarge}>{category}</div>
      </div>
    ))}
  </div>
);
```

### Dashboard Header

```typescript
<div style={layout.header}>
  <button
    style={button.icon(32)}
    {...hoverHandlers.lightBg}
    onClick={() => navigate('/settings')}
  >
    <Settings size={18} />
  </button>
  <h1 style={text.h2}>Dashboard</h1>
</div>
```

### Stats Grid

```typescript
<div style={grid.stats(2)}>
  <div style={card.stats}>
    <div style={text.statsValue}>23</div>
    <div style={text.statsLabel}>Day Streak</div>
  </div>
  <div style={card.stats}>
    <div style={text.statsValue}>87%</div>
    <div style={text.statsLabel}>Completion</div>
  </div>
</div>
```

### Progress Bar

```typescript
const progressPercentage = 65;

<div style={progress.container}>
  <div style={progress.fill(progressPercentage)} />
</div>
<div style={progress.labels}>
  <span style={text.caption}>Week 8 of 24</span>
  <span style={text.caption}>{progressPercentage}%</span>
</div>
```

### Question Screen Template

```typescript
function QuestionScreen() {
  return (
    <div style={layout.fullPageCentered}>
      <div style={layout.contentContainer('500px')}>
        <h1 style={text.h1}>Question Title</h1>
        <p style={text.bodyLarge}>Question description</p>

        <div style={{ marginTop: tokens.spacing['2xl'] }}>
          {/* Question content */}
        </div>

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

## Best Practices

### ✅ DO

- Import from `@/design-system` centrally
- Use tokens for all spacing, colors, typography
- Use pre-built component styles when available
- Compose styles when you need customization
- Use hover/focus handlers for interactive elements

### ❌ DON'T

- Hardcode color values (`#000000` → use `tokens.colors.primary`)
- Hardcode spacing (`16px` → use `tokens.spacing.lg`)
- Create duplicate style objects
- Use magic numbers
- Mix design system with non-system styles inconsistently

## Type Safety

All tokens and components are fully typed:

```typescript
import type { Colors, Typography, Spacing } from '@/design-system';

// TypeScript will autocomplete and validate
const myColor: string = tokens.colors.gray[50]; // ✅
const myColor: string = tokens.colors.gray[1000]; // ❌ Type error
```

## Customization

If you need a variant not covered by the design system:

1. **Extend existing component**:
```typescript
const myCustomButton = {
  ...button.primary,
  fontSize: tokens.typography.sizes['2xl'],
  borderRadius: tokens.borderRadius.full,
};
```

2. **Add to design system** (if reusable):
Edit `/src/design-system/components.ts` and add your variant:
```typescript
export const button = {
  primary: { /* ... */ },
  secondary: { /* ... */ },
  large: { /* ... */ }, // Your new variant
};
```

## Migration Checklist

When refactoring existing components:

- [ ] Replace hardcoded colors with `tokens.colors.*`
- [ ] Replace hardcoded spacing with `tokens.spacing.*`
- [ ] Replace hardcoded typography with `tokens.typography.*`
- [ ] Use pre-built button styles instead of custom
- [ ] Use pre-built layout patterns
- [ ] Use hover/focus handlers instead of inline handlers
- [ ] Remove duplicate style definitions
- [ ] Test hover/focus states
- [ ] Verify responsive behavior
- [ ] Check accessibility (focus states, color contrast)

---

**Remember**: The goal is consistency and maintainability. When in doubt, check DESIGN_SYSTEM.md for the philosophy and patterns.
