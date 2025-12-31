# CONSIST Design System & Philosophy
## Complete UI/UX Reference Guide

> **Purpose**: This document serves as the definitive design system reference for CONSIST and all future projects following the same philosophy.

---

## 🎯 Core Philosophy

### "Stop planning. Start doing."

**Guiding Principles:**
1. **Minimize Cognitive Load** - Users spend energy doing, not planning
2. **Progressive Disclosure** - Information revealed gradually, one step at a time
3. **Zero Friction** - Minimal questions (8-14 total), smart defaults everywhere
4. **Behavioral Intelligence** - Infer 80% from behavior, ask only 20%
5. **Atomic Actions** - Each task = one clear action, time-bound
6. **Personalization Over Templates** - No generic advice, everything tailored
7. **Elegant Minimalism** - Black/white aesthetic, thin typography, generous spacing
8. **Immediate Value** - 5-minute onboarding → instant personalized roadmap

---

## 🎨 Visual Design System

### Color Palette

```javascript
const colors = {
  // Primary
  black: '#000000',        // CTAs, headers, selected states
  white: '#ffffff',        // Backgrounds, default state

  // Grays (Light to Dark)
  gray50: '#fafafa',       // Secondary backgrounds, disabled states
  gray100: '#f5f5f5',      // Icon backgrounds, progress bars
  gray200: '#f0f0f0',      // Borders, dividers
  gray300: '#e5e5e5',      // Input borders, unselected states
  gray600: '#666666',      // Secondary text
  gray700: '#999999',      // Tertiary/helper text
  gray800: '#cccccc',      // Subtle text
  gray900: '#e0e0e0',      // Very subtle text

  // Semantic
  red: '#ef5350',          // Destructive actions
  redBg: '#ffebee',        // Destructive backgrounds
  orange: '#ff6b35',       // Streak indicator (fire icon)

  // Interactive
  hoverBg: '#fafafa',      // Hover background for light elements
  hoverDark: '#333333',    // Hover for dark buttons
}
```

### Typography

**Font Family:**
```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

**Font Weights:**
- `300` - Light (default for most text)
- `400` - Regular (emphasis, buttons, labels)
- `500` - Medium (rare, only for strong emphasis)

**Type Scale:**
```javascript
const typography = {
  // Display
  display: {
    fontSize: '60px',
    fontWeight: 300,
    letterSpacing: '-0.02em',
    lineHeight: 1.2
  },

  // Headings
  h1: { fontSize: '32px', fontWeight: 300, lineHeight: 1.3 },
  h2: { fontSize: '28px', fontWeight: 300, lineHeight: 1.3 },
  h3: { fontSize: '20px', fontWeight: 300, lineHeight: 1.3 },
  h4: { fontSize: '18px', fontWeight: 400, lineHeight: 1.3 },
  h5: { fontSize: '16px', fontWeight: 400, lineHeight: 1.3 },

  // Body
  bodyLarge: { fontSize: '16px', fontWeight: 300, lineHeight: 1.6 },
  body: { fontSize: '15px', fontWeight: 300, lineHeight: 1.6 },
  bodySmall: { fontSize: '14px', fontWeight: 300, lineHeight: 1.6 },

  // Supporting
  caption: { fontSize: '13px', fontWeight: 300, lineHeight: 1.5 },
  label: { fontSize: '12px', fontWeight: 400, lineHeight: 1.4 },
  micro: { fontSize: '11px', fontWeight: 300, lineHeight: 1.4 },
}
```

### Spacing System

**Base Unit:** 4px

```javascript
const spacing = {
  xs: '4px',    // 1 unit - tight spacing
  sm: '8px',    // 2 units - icon gaps, small margins
  md: '12px',   // 3 units - default gap, card spacing
  lg: '16px',   // 4 units - section spacing
  xl: '24px',   // 6 units - large section spacing
  '2xl': '32px', // 8 units - major section breaks
  '3xl': '48px', // 12 units - page padding
}
```

**Common Patterns:**
- Icon + Text gap: `8-12px`
- Button padding: `12-16px vertical, 20-32px horizontal`
- Card padding: `16-24px`
- Section margins: `24-48px`
- Page padding: `48px vertical, 24px horizontal`

### Border Radius

```javascript
const borderRadius = {
  none: '0',
  sm: '4px',     // Small elements (checkboxes)
  md: '6px',     // Badges, pills
  lg: '12px',    // Default for most components
  xl: '16px',    // Large cards
  full: '9999px', // Circular buttons, pills
}
```

### Shadows

```javascript
const shadows = {
  none: 'none',
  sm: '0 2px 8px rgba(0, 0, 0, 0.05)',
  md: '0 4px 16px rgba(0, 0, 0, 0.08)',
  lg: '0 10px 40px rgba(0, 0, 0, 0.1)',  // Card hover
  xl: '0 20px 60px rgba(0, 0, 0, 0.15)',
}
```

### Transitions

```javascript
const transitions = {
  fast: '0.2s',      // Quick interactions (hover, focus)
  medium: '0.3s',    // Standard transitions
  slow: '0.5s',      // Smooth animations (progress bars)

  // Common patterns
  all: 'all 0.2s ease-out',
  colors: 'background-color 0.2s, color 0.2s, border-color 0.2s',
  transform: 'transform 0.3s ease-out',
}
```

---

## 🧩 Component Library

### Buttons

#### Primary Button (CTA)
```jsx
<button style={{
  padding: '16px 32px',
  backgroundColor: 'black',
  color: 'white',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: 400,
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
}}>
  Continue
  <ArrowRight size={20} />
</button>

// Hover: backgroundColor = '#333'
```

#### Secondary Button
```jsx
<button style={{
  padding: '12px 20px',
  backgroundColor: 'white',
  color: 'black',
  border: '1px solid #e5e5e5',
  borderRadius: '12px',
  fontSize: '14px',
  fontWeight: 300,
  cursor: 'pointer',
  transition: 'all 0.2s'
}}>
  Back
</button>

// Hover: backgroundColor = '#fafafa', borderColor = 'black'
```

#### Icon Button
```jsx
<button style={{
  width: '40px',
  height: '40px',
  backgroundColor: '#fafafa',
  border: 'none',
  borderRadius: '50%',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s'
}}>
  <Settings size={20} color="#666" />
</button>

// Hover: backgroundColor = '#f0f0f0'
```

#### Disabled State
```jsx
<button disabled style={{
  backgroundColor: '#e5e5e5',
  color: '#999',
  cursor: 'not-allowed'
}}>
  Continue
</button>
```

### Input Fields

#### Text Input
```jsx
<input
  type="text"
  placeholder="Your name"
  style={{
    width: '100%',
    padding: '16px',
    fontSize: '16px',
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

#### Time Input
```jsx
<input
  type="time"
  style={{
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: 300,
    border: '1px solid #e5e5e5',
    borderRadius: '12px',
    outline: 'none',
    transition: 'border-color 0.2s'
  }}
/>
```

#### Time Range
```jsx
<div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
  <input type="time" style={{ flex: 1, /* ...input styles */ }} />
  <span style={{ color: '#999', fontWeight: 300 }}>to</span>
  <input type="time" style={{ flex: 1, /* ...input styles */ }} />
</div>
```

### Cards

#### Standard Card
```jsx
<div style={{
  backgroundColor: 'white',
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid #f0f0f0'
}}>
  {/* Content */}
</div>
```

#### Interactive Card (Hover)
```jsx
<button style={{
  padding: '24px',
  backgroundColor: 'white',
  border: '1px solid #e5e5e5',
  borderRadius: '16px',
  cursor: 'pointer',
  transition: 'all 0.3s',
  textAlign: 'left',
  width: '100%'
}}
onMouseEnter={(e) => {
  e.currentTarget.style.borderColor = 'black';
  e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.1)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.borderColor = '#e5e5e5';
  e.currentTarget.style.boxShadow = 'none';
}}>
  {/* Card content */}
</button>
```

#### Selection Card (Active State)
```jsx
<button style={{
  padding: '16px',
  backgroundColor: isSelected ? 'black' : 'white',
  color: isSelected ? 'white' : 'black',
  border: `1px solid ${isSelected ? 'black' : '#e5e5e5'}`,
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s'
}}>
  {/* Content */}
</button>
```

### Progress Indicators

#### Progress Bar
```jsx
<div style={{
  height: '2px',
  backgroundColor: '#f5f5f5',
  borderRadius: '1px',
  overflow: 'hidden'
}}>
  <div style={{
    height: '100%',
    width: '65%', // Dynamic percentage
    backgroundColor: 'black',
    transition: 'width 0.3s'
  }} />
</div>
```

#### Progress Text
```jsx
<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px'
}}>
  <span style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
    Question 3 of 5
  </span>
  <span style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
    60%
  </span>
</div>
```

### Checkboxes

#### Square Checkbox (Multi-select)
```jsx
<button style={{
  width: '20px',
  height: '20px',
  border: `2px solid ${isSelected ? 'white' : '#e5e5e5'}`,
  borderRadius: '4px',
  backgroundColor: isSelected ? 'white' : 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
}}>
  {isSelected && (
    <div style={{
      width: '10px',
      height: '10px',
      backgroundColor: 'black',
      borderRadius: '2px'
    }} />
  )}
</button>
```

#### Circle Checkbox (Task completion)
```jsx
<button
  onClick={() => completeTask(taskId)}
  disabled={task.completed}
  style={{
    width: '24px',
    height: '24px',
    backgroundColor: task.completed ? 'black' : 'white',
    border: `2px solid ${task.completed ? 'black' : '#e5e5e5'}`,
    borderRadius: '50%',
    cursor: task.completed ? 'default' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s'
  }}
>
  {task.completed && <CheckCircle2 size={16} color="white" />}
</button>
```

### Badges & Pills

#### Label Badge
```jsx
<div style={{
  fontSize: '11px',
  fontWeight: 400,
  color: 'black',
  backgroundColor: '#f0f0f0',
  padding: '4px 8px',
  borderRadius: '6px',
  display: 'inline-block'
}}>
  Recommended
</div>
```

#### Status Badge (Streak)
```jsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
}}>
  <Flame size={16} color={streak > 0 ? '#ff6b35' : '#ccc'} />
  <span style={{ fontSize: '24px', fontWeight: 300, color: 'black' }}>
    {streak}
  </span>
</div>
```

### Icons

**Icon Sizing:**
- Micro: 12-14px (inline with small text)
- Small: 16-18px (default inline)
- Medium: 20-24px (standalone, buttons)
- Large: 32-40px (feature icons)
- XLarge: 48px+ (hero sections)

**Icon + Text Pattern:**
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
  <Clock size={14} color="#999" />
  <span style={{ fontSize: '13px', fontWeight: 300, color: '#666' }}>
    15 minutes
  </span>
</div>
```

---

## 📐 Layout Patterns

### Full-Page Modal/Screen
```jsx
<div style={{
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'white',
  padding: '48px 24px'
}}>
  <div style={{ maxWidth: '500px', width: '100%' }}>
    {/* Content */}
  </div>
</div>
```

### Dashboard Layout
```jsx
<div style={{ minHeight: '100vh', backgroundColor: '#fafafa', paddingBottom: '80px' }}>
  {/* Header */}
  <div style={{
    backgroundColor: 'white',
    borderBottom: '1px solid #f0f0f0',
    padding: '20px 24px'
  }}>
    {/* Header content */}
  </div>

  {/* Main content */}
  <div style={{ padding: '24px' }}>
    {/* Sections */}
  </div>
</div>
```

### Grid Layouts
```jsx
// 3-column stats
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '12px'
}}>
  {/* Stat cards */}
</div>

// Responsive category cards
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '16px'
}}>
  {/* Category cards */}
</div>

// Small button grid
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '12px'
}}>
  {/* Small buttons */}
</div>
```

### Flex Patterns
```jsx
// Horizontal with gap
<div style={{ display: 'flex', gap: '12px' }}>
  {/* Items */}
</div>

// Vertical stack
<div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
  {/* Items */}
</div>

// Space between
<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
  <div>Left content</div>
  <div>Right content</div>
</div>

// Centered
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
  {/* Centered content */}
</div>
```

---

## 🎭 Interaction Patterns

### Hover States

**Standard Pattern:**
```javascript
// Default state in style object
// Hover/Leave handlers modify specific properties

onMouseEnter={(e) => {
  e.currentTarget.style.backgroundColor = '#fafafa';
  e.currentTarget.style.borderColor = 'black';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.backgroundColor = 'white';
  e.currentTarget.style.borderColor = '#e5e5e5';
}}
```

**Dark Button Hover:**
```javascript
onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333'}
onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'black'}
```

### Focus States

**Input Fields:**
```javascript
onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
```

### Keyboard Support

**Enter to Continue:**
```javascript
onKeyDown={(e) => {
  if (e.key === 'Enter' && isValid()) handleNext();
}}
```

### Auto-Advance Pattern

**Choice Selection:**
```javascript
onClick={() => {
  setAnswer(option);
  setTimeout(handleNext, 200); // Delay for visual feedback
}}
```

---

## 🎬 Animation Patterns

### CSS Animations
```jsx
<style>{`
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`}</style>

<div style={{ animation: 'pulse 2s infinite' }}>
  <Sparkles size={40} color="black" />
</div>
```

### Loading States
```jsx
const [loading, setLoading] = useState(true);
const [progress, setProgress] = useState(0);

useEffect(() => {
  const steps = ['Step 1...', 'Step 2...', 'Step 3...'];
  let current = 0;

  const interval = setInterval(() => {
    current++;
    setProgress((current / steps.length) * 100);

    if (current >= steps.length) {
      clearInterval(interval);
      setTimeout(() => setLoading(false), 500);
    }
  }, 800);

  return () => clearInterval(interval);
}, []);
```

---

## 📱 Responsive Design

### Container Max-Widths
- **Forms/Questions**: 448-500px
- **Category Selection**: 600px
- **Roadmap Display**: 600px
- **Settings**: 100% with 24px padding

### Mobile-First Approach
```jsx
// Base: Mobile (full width with padding)
<div style={{
  width: '100%',
  padding: '24px',
  maxWidth: '500px',
  margin: '0 auto'
}}>
  {/* Content */}
</div>

// Auto-responsive grids (no media queries needed)
<div style={{
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px'
}}>
  {/* Cards adapt automatically */}
</div>
```

---

## 🧠 UX Patterns

### Progressive Disclosure

**Single Question Per Page:**
- Show one question at a time
- Progress indicator always visible
- Clear "X of Y" labeling
- Back button for navigation

**Information Hierarchy:**
```jsx
// Primary info (always visible)
<h2>What's your name?</h2>

// Secondary context (subtle, below)
<p style={{ color: '#999', fontSize: '14px' }}>
  We'll use this to personalize your experience
</p>

// Tertiary details (even more subtle)
<span style={{ color: '#ccc', fontSize: '11px' }}>
  You can change this later in settings
</span>
```

### Validation Feedback

**Visual Only (No Error Messages):**
- Disabled button when incomplete
- Border color changes on focus
- Completion triggers button activation

```jsx
const isValid = () => answer && answer.trim();

<button
  disabled={!isValid()}
  style={{
    backgroundColor: isValid() ? 'black' : '#e5e5e5',
    color: isValid() ? 'white' : '#999',
    cursor: isValid() ? 'pointer' : 'not-allowed'
  }}
>
  Continue
</button>
```

### Empty States
```jsx
{tasks.length === 0 && (
  <div style={{
    backgroundColor: 'white',
    padding: '32px',
    borderRadius: '12px',
    border: '1px solid #f0f0f0',
    textAlign: 'center'
  }}>
    <p style={{ fontSize: '14px', fontWeight: 300, color: '#999' }}>
      No tasks for today. Check back tomorrow!
    </p>
  </div>
)}
```

### Success States
```jsx
{allTasksComplete && (
  <div style={{
    backgroundColor: 'black',
    color: 'white',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
    <div style={{ fontSize: '18px', fontWeight: 300, marginBottom: '4px' }}>
      All done for today!
    </div>
    <div style={{ fontSize: '14px', fontWeight: 300, color: '#ccc' }}>
      Great work. See you tomorrow!
    </div>
  </div>
)}
```

---

## 🎯 Content Patterns

### Microcopy Guidelines

**Tone:**
- Warm but not overly casual
- Encouraging without being patronizing
- Direct and clear
- Personal (use "you", "your")

**Examples:**
- ✅ "What's your name?" (personal, conversational)
- ❌ "Please enter your full name below" (formal, verbose)

- ✅ "Great work. See you tomorrow!" (encouraging, brief)
- ❌ "Congratulations! You have successfully completed all tasks for today!" (verbose)

**Question Formatting:**
- Use contractions ("What's" not "What is")
- End with question marks
- Keep under 10 words when possible
- No periods in short questions

**Button Text:**
- Action-oriented verbs
- "Continue" (not "Next" for final steps)
- "Start Tomorrow" (specific, not generic)
- "Back" (not "Go Back" or "Previous")

### Placeholder Text
```jsx
// Specific, helpful examples
placeholder="e.g., Boxing"
placeholder="Your name"
placeholder="e.g., old knee injury, or type 'none'"

// Not generic
placeholder="Enter text here" // ❌
```

---

## 🔧 Technical Patterns

### State Management (Zustand)

**Store Setup:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create()(
  persist(
    (set) => ({
      // State
      step: 0,
      data: {},

      // Actions
      setStep: (step) => set({ step }),
      updateData: (data) =>
        set((state) => ({
          data: { ...state.data, ...data }
        })),
    }),
    {
      name: 'app-storage',
    }
  )
);
```

**Usage in Components:**
```typescript
const { step, setStep, data, updateData } = useStore();
```

### TypeScript Patterns

**Interface Naming:**
- Descriptive, not prefixed with "I"
- Use `type` for unions, `interface` for objects
- Export from centralized `types/index.ts`

**Import Pattern:**
```typescript
import type { GoalCategory } from '../types/index.js';
// Note: .js extension for Vite compatibility
```

### File Organization

**Pages:**
- One component per file
- PascalCase naming
- Default export
- Co-locate types if page-specific

**Store:**
- Single store file for small apps
- Split by domain for larger apps
- Keep actions close to state

**Types:**
- Centralized in `types/index.ts`
- Export all types
- Use descriptive names

---

## ✅ Best Practices Checklist

### Every Button Should Have:
- [ ] Clear hover state
- [ ] Disabled state (if applicable)
- [ ] Proper cursor (pointer vs not-allowed)
- [ ] Transition animation (0.2-0.3s)
- [ ] Accessible contrast ratio
- [ ] Focus state for keyboard nav

### Every Input Should Have:
- [ ] Border color change on focus
- [ ] Consistent padding (16px)
- [ ] Placeholder text
- [ ] Auto-focus on appropriate screens
- [ ] Enter key support (where applicable)
- [ ] Proper input type (text, time, date, etc.)

### Every Page Should Have:
- [ ] Centered layout with max-width
- [ ] Consistent padding (48px vertical, 24px horizontal)
- [ ] Back navigation (except first screen)
- [ ] Clear primary action
- [ ] Loading state (if data fetching)
- [ ] Empty state (if applicable)

### Every Card Should Have:
- [ ] Border radius (12px standard)
- [ ] Subtle border (1px solid #f0f0f0 or #e5e5e5)
- [ ] Consistent padding (16-24px)
- [ ] Hover effect (if interactive)
- [ ] Proper background color

---

## 🎨 Design Tokens Reference

```javascript
// Use these values consistently across the app
export const tokens = {
  colors: {
    primary: '#000000',
    background: '#ffffff',
    surface: '#fafafa',
    border: '#e5e5e5',
    text: {
      primary: '#000000',
      secondary: '#666666',
      tertiary: '#999999',
      disabled: '#cccccc',
    },
    state: {
      hover: '#fafafa',
      hoverDark: '#333333',
      disabled: '#e5e5e5',
      error: '#ef5350',
      success: '#000000',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
  },

  borderRadius: {
    sm: 4,
    md: 12,
    lg: 16,
    full: 9999,
  },

  typography: {
    sizes: {
      xs: 11,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      '2xl': 28,
      '3xl': 60,
    },
    weights: {
      light: 300,
      regular: 400,
      medium: 500,
    },
  },

  transitions: {
    fast: '0.2s',
    medium: '0.3s',
    slow: '0.5s',
  },
};
```

---

## 📚 Component Examples

### Complete Page Template
```jsx
export default function ExamplePage() {
  const { setStep } = useStore();
  const [answer, setAnswer] = useState('');

  const handleContinue = () => {
    // Save data
    setStep(nextStep);
  };

  const isValid = () => answer && answer.trim();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'white',
      padding: '48px 24px'
    }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        {/* Progress */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
              Question 1 of 5
            </span>
            <span style={{ fontSize: '12px', fontWeight: 300, color: '#999' }}>
              20%
            </span>
          </div>
          <div style={{
            height: '2px',
            backgroundColor: '#f5f5f5',
            borderRadius: '1px',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: '20%',
              backgroundColor: 'black',
              transition: 'width 0.3s'
            }} />
          </div>
        </div>

        {/* Question */}
        <div style={{ marginBottom: '32px' }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 300,
            color: 'black',
            marginBottom: '32px',
            lineHeight: 1.3
          }}>
            What's your question?
          </h2>

          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isValid()) handleContinue();
            }}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: 300,
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              outline: 'none',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'black'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e5e5'}
          />
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setStep(previousStep)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: 'white',
              color: 'black',
              border: '1px solid #e5e5e5',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 300,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          <button
            onClick={handleContinue}
            disabled={!isValid()}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: isValid() ? 'black' : '#e5e5e5',
              color: isValid() ? 'white' : '#999',
              border: 'none',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 300,
              cursor: isValid() ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (isValid()) e.currentTarget.style.backgroundColor = '#333';
            }}
            onMouseLeave={(e) => {
              if (isValid()) e.currentTarget.style.backgroundColor = 'black';
            }}
          >
            Continue
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 Quick Reference

### Common CSS Patterns (Copy-Paste Ready)

**Centered Container:**
```css
minHeight: 100vh
display: flex
alignItems: center
justifyContent: center
padding: 48px 24px
```

**Standard Button:**
```css
padding: 16px 32px
backgroundColor: black
color: white
border: none
borderRadius: 12px
fontSize: 16px
fontWeight: 400
cursor: pointer
transition: all 0.2s
```

**Input Field:**
```css
width: 100%
padding: 16px
fontSize: 16px
fontWeight: 300
border: 1px solid #e5e5e5
borderRadius: 12px
outline: none
```

**Card:**
```css
backgroundColor: white
padding: 20px
borderRadius: 12px
border: 1px solid #f0f0f0
```

**Progress Bar:**
```css
height: 2px
backgroundColor: #f5f5f5
borderRadius: 1px
overflow: hidden
```

---

**Document Version:** 1.0.0
**Last Updated:** December 2025
**Project:** CONSIST
**Philosophy:** "Stop planning. Start doing."
