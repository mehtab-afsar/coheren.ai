# Design System Migration Examples

This document shows before/after examples of refactoring components to use the CONSIST design system.

## Example 1: Welcome.tsx ✅ COMPLETED

### Before (100 lines, hardcoded values)

```typescript
<div style={{
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'white',
  padding: '24px'
}}>
  <div style={{ maxWidth: '448px', width: '100%', textAlign: 'center' }}>
    <h1 style={{
      fontSize: '60px',
      fontWeight: 300,
      letterSpacing: '-0.02em',
      color: 'black',
      marginBottom: '12px'
    }}>
      CONSIST
    </h1>

    <p style={{
      fontSize: '20px',
      fontWeight: 300,
      color: '#666',
      marginBottom: '32px'
    }}>
      Your everyday ally for building consistency
    </p>

    <button
      onClick={() => setStep(1)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '16px 32px',
        backgroundColor: 'black',
        color: 'white',
        border: 'none',
        borderRadius: '9999px',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: 300,
        letterSpacing: '0.05em',
        transition: 'background-color 0.3s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'black'}
    >
      Get Started
    </button>
  </div>
</div>
```

### After (68 lines, using design system)

```typescript
import { tokens, layout, text, button, hoverHandlers } from '../design-system';

<div style={layout.fullPageCentered}>
  <div style={{
    ...layout.contentContainer('448px'),
    textAlign: 'center'
  }}>
    <h1 style={text.display}>
      CONSIST
    </h1>

    <p style={{
      ...text.h2,
      color: tokens.colors.text.secondary,
      marginBottom: tokens.spacing['2xl']
    }}>
      Your everyday ally for building consistency
    </p>

    <button
      onClick={() => setStep(1)}
      style={{
        ...button.primary,
        borderRadius: tokens.borderRadius.full,
        letterSpacing: '0.05em',
      }}
      {...hoverHandlers.darkBg}
    >
      Get Started
    </button>
  </div>
</div>
```

**Benefits**:
- ✅ 32% less code
- ✅ No hardcoded values
- ✅ Consistent with design system
- ✅ Easier to maintain
- ✅ Reusable patterns

---

## Example 2: Dashboard.tsx (To Do)

### Current Pattern

```typescript
<div style={{
  backgroundColor: '#fafafa',
  borderRadius: '12px',
  padding: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
}}>
  <div>
    <div style={{ fontSize: '32px', fontWeight: 300, color: 'black' }}>23</div>
    <div style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>Days</div>
  </div>
</div>
```

### Should Become

```typescript
import { card, text, tokens } from '../design-system';

<div style={card.stats}>
  <div>
    <div style={text.statsValue}>23</div>
    <div style={text.statsLabel}>Days</div>
  </div>
</div>
```

---

## Example 3: Settings.tsx (To Do)

### Current Pattern

```typescript
<button
  onClick={() => setStep(7)}
  style={{
    width: '32px',
    height: '32px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s'
  }}
  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
>
  <ChevronLeft size={20} />
</button>
```

### Should Become

```typescript
import { button, hoverHandlers } from '../design-system';

<button
  onClick={() => setStep(7)}
  style={button.icon(32)}
  {...hoverHandlers.lightBg}
>
  <ChevronLeft size={20} />
</button>
```

---

## Example 4: GoalSelection.tsx (To Do)

### Current Pattern

```typescript
categories.map((cat) => (
  <button
    key={cat.id}
    onClick={() => handleSelect(cat.id)}
    style={{
      padding: '20px',
      backgroundColor: 'white',
      border: selectedCategory === cat.id ? '2px solid black' : '1px solid #e5e5e5',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px'
    }}
    onMouseEnter={(e) => {
      if (selectedCategory !== cat.id) {
        e.currentTarget.style.borderColor = 'black';
        e.currentTarget.style.backgroundColor = '#fafafa';
      }
    }}
    onMouseLeave={(e) => {
      if (selectedCategory !== cat.id) {
        e.currentTarget.style.borderColor = '#e5e5e5';
        e.currentTarget.style.backgroundColor = 'white';
      }
    }}
  >
    <div style={{ fontSize: '32px' }}>{cat.icon}</div>
    <div style={{ fontSize: '15px', fontWeight: 300 }}>{cat.name}</div>
  </button>
))
```

### Should Become

```typescript
import { card, text, hoverHandlers } from '../design-system';

categories.map((cat) => (
  <div
    key={cat.id}
    onClick={() => handleSelect(cat.id)}
    style={card.selection(selectedCategory === cat.id)}
    {...(selectedCategory !== cat.id ? hoverHandlers.cardHover : {})}
  >
    <div style={{ fontSize: '32px' }}>{cat.icon}</div>
    <div style={text.bodyLarge}>{cat.name}</div>
  </div>
))
```

---

## Example 5: Input Fields (Universal/Category Questions)

### Current Pattern

```typescript
<input
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Your name"
  style={{
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    fontWeight: 300,
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s'
  }}
  onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
  onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
/>
```

### Should Become

```typescript
import { input, focusHandlers } from '../design-system';

<input
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  placeholder="Your name"
  style={input.base}
  {...focusHandlers.input}
/>
```

---

## Example 6: Progress Bars (RoadmapGeneration)

### Current Pattern

```typescript
<div style={{
  width: '100%',
  height: '6px',
  backgroundColor: '#f0f0f0',
  borderRadius: '9999px',
  overflow: 'hidden',
  marginTop: '24px'
}}>
  <div style={{
    height: '100%',
    width: `${progress}%`,
    backgroundColor: 'black',
    transition: 'width 0.3s ease-out'
  }} />
</div>
```

### Should Become

```typescript
import { progress } from '../design-system';

<div style={progress.container}>
  <div style={progress.fill(progressValue)} />
</div>
```

---

## Example 7: Grid Layouts

### Current Pattern

```typescript
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '16px',
  marginTop: '24px'
}}>
  {stats.map(stat => (
    <div key={stat.id}>{/* stat content */}</div>
  ))}
</div>
```

### Should Become

```typescript
import { grid, tokens } from '../design-system';

<div style={{
  ...grid.stats(2),
  marginTop: tokens.spacing.xl
}}>
  {stats.map(stat => (
    <div key={stat.id}>{/* stat content */}</div>
  ))}
</div>
```

---

## Common Refactoring Patterns

### Pattern 1: Replace Color Literals

```typescript
// Before
color: '#666'
backgroundColor: 'black'
borderColor: '#e5e5e5'

// After
color: tokens.colors.text.secondary
backgroundColor: tokens.colors.primary
borderColor: tokens.colors.gray[300]
```

### Pattern 2: Replace Spacing Values

```typescript
// Before
padding: '16px'
gap: '24px'
marginBottom: '32px'

// After
padding: tokens.spacing.lg
gap: tokens.spacing.xl
marginBottom: tokens.spacing['2xl']
```

### Pattern 3: Replace Typography

```typescript
// Before
fontSize: '15px'
fontWeight: 300
lineHeight: 1.5

// After
...text.body
// OR
fontSize: tokens.typography.sizes.base
fontWeight: tokens.typography.weights.light
lineHeight: tokens.typography.lineHeights.relaxed
```

### Pattern 4: Replace Transitions

```typescript
// Before
transition: 'all 0.2s ease-out'
transition: 'background-color 0.2s'

// After
transition: tokens.transitions.all
```

### Pattern 5: Replace Border Radius

```typescript
// Before
borderRadius: '12px'
borderRadius: '9999px'

// After
borderRadius: tokens.borderRadius.lg
borderRadius: tokens.borderRadius.full
```

---

## Migration Checklist (Per Component)

- [ ] Import design system: `import { tokens, button, layout, ... } from '../design-system'`
- [ ] Replace hardcoded colors with `tokens.colors.*`
- [ ] Replace hardcoded spacing with `tokens.spacing.*`
- [ ] Replace hardcoded typography with `tokens.typography.*` or `text.*`
- [ ] Replace hardcoded transitions with `tokens.transitions.*`
- [ ] Replace hardcoded border radius with `tokens.borderRadius.*`
- [ ] Use pre-built component styles (button, card, input, etc.)
- [ ] Replace inline hover handlers with `hoverHandlers.*`
- [ ] Replace inline focus handlers with `focusHandlers.*`
- [ ] Test component visually
- [ ] Test hover/focus states
- [ ] Verify no visual regressions

---

## Files to Migrate (Priority Order)

### High Priority (User-facing screens)
1. ✅ [Welcome.tsx](../pages/Welcome.tsx) - COMPLETED
2. [ ] [GoalSelection.tsx](../pages/GoalSelection.tsx)
3. [ ] [SpecificGoal.tsx](../pages/SpecificGoal.tsx)
4. [ ] [Dashboard.tsx](../pages/Dashboard.tsx)
5. [ ] [Settings.tsx](../pages/Settings.tsx)

### Medium Priority (Question flows)
6. [ ] [UniversalQuestions.tsx](../pages/UniversalQuestions.tsx)
7. [ ] [CategoryQuestions.tsx](../pages/CategoryQuestions.tsx)
8. [ ] [CheckInSetup.tsx](../pages/CheckInSetup.tsx)

### Low Priority (Special screens)
9. [ ] [RoadmapGeneration.tsx](../pages/RoadmapGeneration.tsx)

---

## Expected Results After Full Migration

- **Code Reduction**: ~30-40% less code
- **Consistency**: 100% adherence to design system
- **Maintainability**: Change design globally by editing design-system files
- **Type Safety**: TypeScript autocomplete for all tokens
- **Performance**: No change (same inline styles approach)
- **Developer Experience**: Faster development with pre-built components

---

## Testing After Migration

Run these checks for each refactored component:

1. **Visual Parity**: Component looks identical to before
2. **Hover States**: Buttons/cards have correct hover effects
3. **Focus States**: Inputs show focus borders correctly
4. **Transitions**: Animations are smooth (0.2s standard)
5. **Responsive**: Works on mobile and desktop
6. **Type Safety**: No TypeScript errors
7. **Build**: `npm run build` succeeds

---

**Start with Welcome.tsx (✅ done), then move to GoalSelection.tsx next!**
