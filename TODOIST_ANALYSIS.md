# Todoist UI/UX Analysis & Implementation for Coheren

## Executive Summary

This document analyzes Todoist's design patterns, animation system, and UX philosophy, and details how we've adapted these learnings for Coheren's task management system.

---

## 1. Todoist's Animation Philosophy

### Core Principles

**Subtlety Over Spectacle**
- Individual task completions use minimal, fast animations (200-300ms)
- Checkboxes have subtle transitions with light haptic feedback
- Reserved elaborate celebrations for major milestones (streak achievements, level-ups)

**Material Design Foundation**
- Built on Material Design 2, upgraded to Material 3
- Won Material Design Award 2021 (large screen category)
- Uses standardized easing curves and timing

### Animation Timing Standards

**Optimal Durations** (from Material Design + Todoist observations):
```
- Checkbox interactions: 200-300ms
- Task fade/slide: 235ms (opacity) + 500ms (position)
- Drag-and-drop: Continuous with smooth easing
- Celebrations: 800-1200ms (reserved for milestones)
```

**Easing Curves**:
```css
/* Material Design Standard Curve (most common) */
cubic-bezier(.4, 0, .2, 1)

/* Deceleration (recommended for most UI) */
/* Fast start, slow end - feels responsive */
cubic-bezier(0, 0, .2, 1)

/* Acceleration (elements leaving) */
cubic-bezier(.4, 0, 1, 1)
```

**Key Insight**: Ease-out (deceleration) is Todoist's default - starts quickly for responsiveness, slows at the end for natural feel.

---

## 2. Task Completion Patterns

### Todoist's Approach

**Checkbox Animation**:
- Subtle scale effect (0.9 → 1.0) on press
- Border width increases on hover (1.5px → 2px)
- Background color transition (200ms)
- SVG checkmark draws using stroke-dashoffset (800ms)
- Semantic `input + label` markup for accessibility

**Visual Feedback Flow**:
```
1. Hover: Border darkens, width increases
2. Click: Checkbox scales slightly
3. Complete: Checkmark draws in, background fills
4. Result: Task fades out or strikes through
```

**Implementation Pattern**:
```css
.checkbox {
  transition: all 200ms cubic-bezier(.4,0,.2,1);
  border: 1.5px solid var(--border);
}

.checkbox:hover {
  border: 2px solid var(--primary);
}

.checkbox.completed {
  animation: checkmark 0.8s ease-out;
  background: var(--primary);
}
```

### Coheren's Enhanced Approach

**What We Kept from Todoist**:
- Fast, responsive timing (200-400ms base)
- Material Design easing curves
- Subtle hover states

**What We Enhanced**:
- Added particle celebration system (stars flow to progress card)
- Magic vanish animation for completed tasks
- Progress card pulse effect
- More elaborate but still tasteful

**Why the Difference**:
- Coheren focuses on daily habit building (motivation matters more)
- Todoist is productivity tool (speed matters more)
- Our users complete 3-5 tasks/day vs Todoist's 10-30+
- More celebration per task is appropriate for our use case

---

## 3. Task Rescheduling UX

### Todoist's Patterns

**Drag-and-Drop Interface**:
- 6-dot grip pattern creates "grabbable" affordance
- Continuous smooth scrolling during drag
- Clear drop targets with hover states
- Haptic feedback on drag start (mobile)
- Visual placeholder shows where task will land

**Date Picker + Quick Actions**:
- Three-dot menu for task editing
- Date picker with preset options (Today, Tomorrow, Next Week)
- Natural language processing ("every Monday", "every weekend")
- Recurring pattern interface (simple + advanced)

**Visual Affordances**:
```
[•• Task Name ················ Tomorrow ×]
 ↑                              ↑        ↑
Grip                          Date     Quick
                              Chip    Remove
```

### Coheren's Implementation

**Skip + AI Rescheduling**:
We took a different approach optimized for daily habits:

```typescript
// Instead of manual drag, we offer intelligent skip
<button onClick={handleSkipTask}>
  <SkipForward /> Not Today
</button>
```

**AI Adjustment Logic**:
```typescript
// Analyze skip pattern
const skipRate = recentSkips / recentTasks.length;

// Adjust tomorrow's task
if (skipRate > 0.3) {
  // High skip rate → make easier
  duration = duration * 0.7;
  adjustedDifficulty = 'easier';
} else if (skipRate < 0.1 && completionRate > 80) {
  // Crushing it → keep same
  adjustedDifficulty = 'same';
}
```

**User Feedback**:
```
✨ Adjusted for today - made easier based on yesterday
```

**Why Different from Todoist**:
- Todoist users manually plan their week
- Coheren users follow AI-generated daily plan
- Skip + adjust is more aligned with "AI does the thinking"
- Reduces decision fatigue (no calendar dragging needed)

---

## 4. Micro-Interactions & Affordances

### Todoist's Mastery of Affordances

**Visual Cues**:
1. **Addition Sign + Faded Text** - "Copy affordance" signals where to add tasks
2. **6-Dot Grip Pattern** - Creates illusion of physical texture for dragging
3. **Hover-Revealed Actions** - X icons appear on hover for quick removal
4. **Chevron Buttons** - Collapse/expand affordance for sub-tasks
5. **Sticky Elements** - Task name stays visible during scroll

**Progressive Disclosure**:
- Not all actions visible at once
- Hover reveals contextual actions
- Click reveals detail view
- Reduces cognitive load

**Keyboard-First Design**:
```
Q         - Quick Add (global, works when minimized)
⌘/Ctrl+K  - Command menu (central hub)
K/J       - Previous/Next task
```

Saves 2 seconds/minute vs. mouse clicking (Todoist's own research)

### Coheren's Adaptations

**What We Implemented**:
- Hover states on task cards (scale + shadow change)
- Skip button appears inline (always visible for discoverability)
- Adjustment badges show AI changes
- Material Design easing for all interactions

**What We Should Add** (future):
- Keyboard shortcuts (especially for task completion)
- Command menu (⌘K pattern)
- Drag handles if we add manual reordering

---

## 5. Design System Architecture

### Todoist's Living Design System

**Component Structure** (Android example):
```
app-ui/          # Non-design system components
app-ui-system/   # Design system components
ui/              # Shared tokens (colors, typography)
```

**Strict Rules**:
- Component names must exactly match Figma definitions
- No magic values - all resources passed resolved
- Mandatory kdoc documentation
- Multiple preview states in development
- Paparazzi snapshot tests for regression

**Design Maintenance**:
- Dedicated "Design Hero" role for polishing
- Regular cross-platform QA sessions
- Continuous refinement (not "done and forget")

### Coheren's Design System

**Current Structure**:
```
design-system/
  tokens.ts      # Colors, spacing, typography
  index.ts       # Exported styles (text, card)
components/
  views/         # Page-level components
  ...
```

**Similarities to Todoist**:
- Centralized tokens
- Consistent naming
- Inline styles with token references

**Differences**:
- Less formal component catalog
- More flexible (faster iteration)
- Smaller team (don't need strict Figma matching)

---

## 6. New Task View Insights (2025)

Todoist recently redesigned their task detail view with these principles:

### Two-Column Layout
```
┌─────────────────────────┬──────────────┐
│ Task Details            │ Sidebar      │
│ - Sub-tasks            │ - Due date   │
│ - Description          │ - Priority   │
│ - Comments             │ - Labels     │
│ - Attachments          │ - Reminders  │
└─────────────────────────┴──────────────┘
```

**Benefits**:
- Everything visible (no tabs)
- Independent collapsible sections
- Keyboard-first navigation
- Mobile: Scrollable attribute chips

### Progressive Disclosure
- Sub-tasks collapse independently from comments
- "Show/Hide completed" toggle
- Minimize cognitive load

### Coheren Application

We could apply this to task detail modal:
```
┌─────────────────────────┬──────────────┐
│ Task Content            │ Metadata     │
│ - Title                │ - Type       │
│ - Description          │ - Duration   │
│ - Why this task? (AI)  │ - Phase      │
│ - Tips/Resources       │ - Day        │
└─────────────────────────┴──────────────┘
```

**Future Enhancement**: Expand task cards to show more detail without modal.

---

## 7. Technical Implementation

### CSS Animation Patterns

**Material Design Standard** (from actual MD CSS):
```css
.animatable {
  opacity: 0;
  position: relative;
  top: 16px;
  transition:
    opacity 235ms cubic-bezier(.4,0,.2,1),
    top 500ms cubic-bezier(.4,0,.2,1);
}
```

**Checkbox Animation** (industry pattern):
```css
.checkbox {
  appearance: none;
  border: 1.5px solid var(--border);
  transition: all 200ms cubic-bezier(.4,0,.2,1);
}

.checkbox::before {
  content: '';
  /* Checkmark drawn with SVG or pseudo-element */
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  animation: drawCheckmark 0.8s ease-out forwards;
}

@keyframes drawCheckmark {
  to { stroke-dashoffset: 0; }
}
```

### React/TypeScript Patterns

**State Management for Animations**:
```typescript
const [isAnimating, setIsAnimating] = useState(false);

const handleAction = () => {
  setIsAnimating(true);

  setTimeout(() => {
    // Perform actual action
    completeTask(id);
    setIsAnimating(false);
  }, 300); // Match animation duration
};
```

**Accessibility Considerations**:
```typescript
// Honor user's motion preferences
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
);

const animationDuration = prefersReducedMotion.matches
  ? 0
  : 300;
```

### Coheren's Implementation

**Skip Task Animation**:
```typescript
const handleSkipTask = (taskId: string, event: React.MouseEvent) => {
  event.stopPropagation();
  setSkippingTaskId(taskId);

  // Todoist-style timing: 300ms with ease-out
  setTimeout(() => {
    skipTask(taskId, 'User skipped');
    setSkippingTaskId(null);
    setShowSkipMessage(true);

    // Auto-hide toast after 3s
    setTimeout(() => setShowSkipMessage(false), 3000);
  }, 300);
};
```

**Toast Notification**:
```typescript
<div style={{
  animation: 'slideDown 300ms cubic-bezier(.4,0,.2,1)',
  // Material Design standard curve
}}>
  Task skipped. Tomorrow's task will be adjusted accordingly.
</div>

// CSS
@keyframes slideDown {
  0% {
    opacity: 0;
    transform: translateY(-16px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 8. Comparative Analysis

### Where Coheren Matches Todoist

✅ **Timing**: 200-300ms for primary interactions
✅ **Easing**: Material Design curves (cubic-bezier)
✅ **Hover States**: Subtle border/shadow changes
✅ **Feedback**: Clear confirmation of actions
✅ **Accessibility**: Semantic markup, keyboard support (planned)

### Where Coheren Enhances Todoist

⭐ **Celebration**: More elaborate task completion (particle effects)
⭐ **AI Adaptation**: Smart rescheduling vs. manual dragging
⭐ **Visual Polish**: Premium feel with animations
⭐ **Motivation**: Designed for consistency building
⭐ **Simplicity**: Fewer options (by design)

### Where Todoist Leads

🔹 **Keyboard Shortcuts**: Extensive global shortcuts
🔹 **Drag-and-Drop**: Full calendar integration
🔹 **Natural Language**: Advanced date parsing
🔹 **Quick Add**: Global shortcut even when minimized
🔹 **Cross-Platform**: Identical experience everywhere

### Strategic Positioning

**Todoist** = Professional productivity tool
- Many tasks per day (10-30+)
- Manual planning and scheduling
- Speed and efficiency paramount
- Power user features (keyboard, shortcuts)

**Coheren** = AI-powered habit coach
- Few tasks per day (3-5)
- AI handles planning
- Motivation and consistency paramount
- Simplicity and beauty

**Our Advantage**: We don't need to match Todoist feature-for-feature. Different use case, different priorities.

---

## 9. Recommendations for Coheren

### Immediate Wins (Already Implemented)

✅ Skip/reschedule with AI adjustment
✅ Todoist-style timing (300ms with ease-out)
✅ Toast notifications for feedback
✅ Adjustment badges showing AI changes
✅ Hover states with proper easing

### Next Priority (Within 2 Weeks)

**1. Keyboard Shortcuts**
```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === 'c' && !e.metaKey) {
      // Complete currently focused task
      completeTask(focusedTaskId);
    }
    if (e.key === 's' && !e.metaKey) {
      // Skip currently focused task
      skipTask(focusedTaskId);
    }
  };

  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, [focusedTaskId]);
```

**2. Reduced Motion Support**
```typescript
const useReducedMotion = () => {
  const [prefersReduced, setPrefersReduced] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReduced(mediaQuery.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
};

// Usage
const animationDuration = useReducedMotion() ? 0 : 300;
```

**3. Loading States**
Add skeleton screens during data fetch (Todoist pattern):
```typescript
{isLoading ? (
  <div style={{
    animation: 'pulse 1.5s ease-in-out infinite',
    backgroundColor: tokens.colors.gray[100],
    borderRadius: tokens.borderRadius.md,
  }} />
) : (
  <TaskCard {...task} />
)}
```

### Medium-Term (1-2 Months)

**1. Command Menu (⌘K)**
- Central hub for all actions
- Keyboard-first navigation
- Search tasks, navigate views

**2. Drag-and-Drop (Optional)**
- Only if users request manual reordering
- Use Todoist's 6-dot grip pattern
- Haptic feedback on mobile

**3. Task Detail Expansion**
- Two-column layout (Todoist 2025 pattern)
- "Why this task?" explanation
- Tips and resources
- Collapsible sections

### Long-Term (3-6 Months)

**1. Mobile Gestures**
- Swipe right to complete
- Swipe left to skip
- Todoist uses this extensively

**2. Natural Language**
- "Skip until next week"
- "Make this easier"
- AI interprets intent

**3. Performance Metrics**
- Show time saved vs. planning manually
- Todoist shows "2 seconds saved per minute"
- We could show "10 decisions avoided today"

---

## 10. Code Examples

### Skip Task Implementation

**Store (useStore.ts)**:
```typescript
interface Task {
  // ... existing fields
  skipped: boolean;
  skippedAt?: string;
  skipReason?: string;
  rescheduledFrom?: number;
  adjustedDifficulty?: 'easier' | 'same' | 'harder';
}

skipTask: (taskId, reason) =>
  set((state) => {
    const skippedTask = state.tasks.find(t => t.id === taskId);
    if (!skippedTask) return state;

    // Mark as skipped
    const tasks = state.tasks.map(task =>
      task.id === taskId
        ? { ...task, skipped: true, skippedAt: new Date().toISOString(), skipReason: reason }
        : task
    );

    // Calculate skip pattern
    const recentTasks = state.tasks.filter(
      t => t.day >= state.currentDay - 3 && t.day <= state.currentDay
    ).slice(-10);
    const skipCount = recentTasks.filter(t => t.skipped).length;
    const skipRate = skipCount / recentTasks.length;

    // Adjust difficulty
    let adjustmentLevel: 'easier' | 'same' | 'harder' = 'easier';
    if (skipRate > 0.3) {
      adjustmentLevel = 'easier'; // High skip rate
    } else if (skipRate < 0.1 && state.completionRate > 80) {
      adjustmentLevel = 'same'; // Doing great
    }

    // Adjust tomorrow's tasks
    const tomorrowDay = state.currentDay + 1;
    const adjustedTasks = tasks.map(task => {
      if (task.day === tomorrowDay && task.type === skippedTask.type) {
        const durationMultiplier = adjustmentLevel === 'easier' ? 0.7 : 1.0;
        return {
          ...task,
          duration: Math.max(10, Math.round(task.duration * durationMultiplier)),
          adjustedDifficulty: adjustmentLevel,
          rescheduledFrom: state.currentDay
        };
      }
      return task;
    });

    return { tasks: adjustedTasks };
  })
```

**Component (TodayView.tsx)**:
```typescript
const [skippingTaskId, setSkippingTaskId] = useState<string | null>(null);
const [showSkipMessage, setShowSkipMessage] = useState(false);

const handleSkipTask = (taskId: string, event: React.MouseEvent) => {
  event.stopPropagation();
  setSkippingTaskId(taskId);

  setTimeout(() => {
    skipTask(taskId, 'User skipped');
    setSkippingTaskId(null);
    setShowSkipMessage(true);

    setTimeout(() => setShowSkipMessage(false), 3000);
  }, 300); // Todoist timing
};

// UI
<button
  onClick={(e) => handleSkipTask(task.id, e)}
  disabled={skippingTaskId === task.id}
  style={{
    transition: 'all 200ms cubic-bezier(.4,0,.2,1)', // Todoist easing
    opacity: skippingTaskId === task.id ? 0.5 : 1,
  }}
>
  <SkipForward size={14} />
  <span>Not Today</span>
</button>

{/* Adjustment Badge */}
{task.adjustedDifficulty === 'easier' && (
  <div style={{
    backgroundColor: tokens.colors.primary + '10',
    color: tokens.colors.primary,
  }}>
    ✨ Adjusted for today - made easier based on yesterday
  </div>
)}
```

---

## 11. Measurement & Success Metrics

### What Todoist Tracks

- Task completion velocity
- Keyboard shortcut usage (shows 2s/min savings)
- Karma points (gamification)
- Streak maintenance

### What Coheren Should Track

**Engagement Metrics**:
- Skip rate per user (target: <30%)
- Adjustment acceptance (do users complete adjusted tasks?)
- Skip → return rate (do they come back tomorrow?)

**Behavioral Metrics**:
- Completion rate: skipped days vs. completed days
- Streak: with skips vs. without skips
- Task difficulty evolution over time

**User Satisfaction**:
- Do users feel guilt when skipping? (survey)
- Is AI adjustment helpful? (thumbs up/down)
- Would they prefer manual rescheduling? (A/B test)

---

## 12. Conclusion

### Key Learnings from Todoist

1. **Subtlety Wins** - Fast, responsive animations (200-300ms) feel professional
2. **Material Design Works** - Use standard curves, don't reinvent
3. **Affordances Matter** - Visual cues reduce cognitive load
4. **Keyboard > Mouse** - Power users love shortcuts
5. **Progressive Disclosure** - Don't show everything at once
6. **Consistency Across Platforms** - Same experience everywhere

### How Coheren Differs (By Design)

1. **More Celebration** - Our use case justifies it (3-5 tasks vs 10-30+)
2. **AI-Powered** - Smart adjustment vs. manual planning
3. **Simplicity First** - Fewer options, less complexity
4. **Habit-Focused** - Designed for consistency, not velocity
5. **Premium Feel** - Animation quality signals care

### Implementation Summary

**What We Built**:
✅ Skip task with "Not Today" button
✅ AI-powered difficulty adjustment
✅ Todoist-style timing (300ms, ease-out)
✅ Toast notifications for feedback
✅ Adjustment badges showing changes
✅ Proper easing curves throughout

**Impact**:
- Prevents churn when life gets busy
- Shows AI intelligence (adapts to user)
- Builds trust (system works WITH you)
- Maintains Todoist-level polish
- Adds Coheren-specific enhancements

**Next Steps**:
1. Add keyboard shortcuts (c to complete, s to skip)
2. Implement reduced motion support
3. Add loading states (skeleton screens)
4. Consider command menu (⌘K) for power users
5. Monitor skip rates and adjustment effectiveness

---

## Resources

**Todoist Resources**:
- [Living Design System](https://www.doist.dev/android_component_catalog/)
- [Developer Documentation](https://developer.todoist.com/guides/)
- [GitHub - Doist](https://github.com/Doist)

**Material Design**:
- [Motion - Easing and Duration](https://m3.material.io/styles/motion/easing-and-duration)
- [Material Design Animation](https://m2.material.io/develop/web/supporting/animation)

**Research Sources**:
- Case studies on Todoist redesigns
- UI/UX critiques and analyses
- Animation timing research (NN/g, web.dev)

---

**Final Thought**: Todoist is the gold standard for productivity apps. We don't need to copy them exactly - we need to learn their principles and apply them to our unique use case. Focus on what makes Coheren special: AI-powered personalization with a premium, motivational experience.
