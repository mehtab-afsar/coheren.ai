# Adaptive Curriculum System (Agent 5)

## Overview

Coheren now has a **rolling curriculum** that adapts based on user performance. Instead of generating all 90 days upfront, the system:

1. Generates a **high-level roadmap** (phases and weeks) for 90 days
2. Creates **granular tasks** for the next 14 days
3. At Day 14, 28, 42, etc., triggers **Agent 5 (Re-calibrator)** to analyze performance
4. Adjusts the **next 14-day sprint** based on struggles, mastery, and feedback

This makes the curriculum truly personalized and responsive to each user's learning journey.

---

## How It Works

### 1. Task Feedback Collection

When users complete a task on the [Today](src/pages/Today.tsx) page, they now see a **feedback modal** that collects:

- **Difficulty Rating** (1-5 stars): How hard was the task?
- **Actual Time Taken** (minutes): How long did it really take?
- **Optional Comment**: What did they struggle with?

This data is stored in the Task object:
```typescript
interface Task {
  // ... existing fields
  difficultyRating?: number; // 1-5 scale
  actualDuration?: number; // actual minutes taken
  userComment?: string; // struggle notes
}
```

### 2. Checkpoint Triggers

Every 14 days, the system checks if a checkpoint should trigger:

```typescript
import { shouldTriggerCheckpoint } from './agents';

if (shouldTriggerCheckpoint(currentDay, 14)) {
  // Run checkpoint analysis
}
```

### 3. Agent 5: Checkpoint Analysis

[Agent 5](src/agents/agent5-recalibrator.ts) analyzes the last 14 days of performance data and determines:

- **Overall Mastery**: `'struggling'`, `'on-track'`, or `'excelling'`
- **Struggling Areas**: Specific topics/skills causing difficulty
- **Mastering Areas**: Topics/skills the user excels at
- **Pace Adjustment**: `'slow-down'`, `'maintain'`, or `'accelerate'`
- **Recommendations**: Specific changes to make

**Decision Framework:**

| Mastery Level | Avg Difficulty | Completion Rate | Action |
|--------------|----------------|-----------------|--------|
| **Excelling** | < 2.5 | > 85% | Accelerate: Skip redundant practice, introduce advanced concepts |
| **On-Track** | 2.5 - 3.5 | 70-85% | Maintain: Keep pace, add variation |
| **Struggling** | > 3.5 | < 70% | Slow down: Add remedial days, reduce intensity |

### 4. Adapted Sprint Generation

After analysis, [Agent 4](src/agents/agent4-task-generator.ts) generates the next 14 days of tasks with the checkpoint context:

- **Rest Days**: Added if user is struggling physically
- **Review Days**: Added if user is struggling conceptually
- **Difficulty Adjustments**: Tasks are easier/harder based on feedback
- **Focus Shifts**: Emphasis on struggling areas

---

## Using the System

### For Users (Frontend Flow)

1. **Complete a task** on the Today page
2. **Rate the difficulty** (1-5 stars) in the feedback modal
3. **Enter actual time** spent (optional adjustment from planned time)
4. **Add comments** about struggles (optional but valuable)
5. At **Day 14, 28, 42...**, see a **checkpoint message**:
   - *"Let's see how you did. Reviewing your foundation..."*
   - System generates next 14 days based on performance

### For Developers (Integration)

#### Running a Checkpoint

```typescript
import { handleCheckpoint, shouldTriggerCheckpoint } from '../agents';

// Check if checkpoint should trigger
if (shouldTriggerCheckpoint(currentDay, 14)) {
  const { analysis, adaptedTasks } = await handleCheckpoint(
    goal,
    timeline,
    dailyTime,
    roadmap, // from Agent 3
    stoneAnswers, // from Agent 2
    completedTasks, // last 14 days of tasks
    currentDay
  );

  // Show user the checkpoint message
  showCheckpointMessage(analysis.checkpointAnalysis.personalizedMessage);

  // Replace upcoming tasks with adapted tasks
  replaceTasks(currentDay + 1, adaptedTasks);
}
```

#### Manual Recalibration (After Task Skips)

```typescript
import { recalibrateCurriculum } from '../agents';

// If user skips multiple tasks due to difficulty
if (recentSkipRate > 0.3) {
  const recalibration = await recalibrateCurriculum({
    context: { userId, goal, timeline, dailyTimeAvailable },
    roadmap: currentRoadmap,
    stoneAnswers,
    completedTasks: recentTasks,
    currentDay
  });

  // Generate easier alternatives
  const easierTasks = await generateAdaptedSprint(
    recalibration,
    roadmapOutput,
    stoneAnswers,
    dailyTimeAvailable
  );
}
```

---

## Database Schema (for Supabase Integration)

To support the rolling curriculum, you'll need these tables:

### `checkpoints` Table

Stores checkpoint analysis results:

```sql
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roadmap_id UUID REFERENCES roadmaps(id),
  checkpoint_day INTEGER NOT NULL,
  overall_mastery TEXT CHECK (overall_mastery IN ('struggling', 'on-track', 'excelling')),
  struggling_areas TEXT[],
  mastering_areas TEXT[],
  pace_adjustment TEXT CHECK (pace_adjustment IN ('slow-down', 'maintain', 'accelerate')),
  recommendations TEXT[],
  next_sprint_focus TEXT,
  personalized_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Updated `daily_tasks` Table

Add feedback columns:

```sql
ALTER TABLE daily_tasks
ADD COLUMN difficulty_rating INTEGER CHECK (difficulty_rating BETWEEN 1 AND 5),
ADD COLUMN actual_duration INTEGER,
ADD COLUMN user_comment TEXT;
```

### `sprints` Table (Optional)

Track each 14-day sprint:

```sql
CREATE TABLE sprints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  roadmap_id UUID REFERENCES roadmaps(id),
  sprint_number INTEGER NOT NULL,
  start_day INTEGER NOT NULL,
  end_day INTEGER NOT NULL,
  checkpoint_id UUID REFERENCES checkpoints(id),
  modifications JSONB, -- Array of task modifications
  pedagogical_changes JSONB, -- rest/review days, difficulty adjustments
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Agent 5 Prompt Strategy

The [Agent 5 system prompt](src/agents/agent5-recalibrator.ts#L48) uses pedagogical principles:

### Physical Skills (Boxing, Guitar, Dance)
- High difficulty → Need physical adaptation (muscle memory, stamina)
- **Solution**: More rest days, reduced intensity, focus on form over quantity

### Cognitive Skills (UPSC, Programming)
- High difficulty → Conceptual gaps
- **Solution**: Review days, more scaffolding, break concepts into smaller chunks

### Habit Formation (Meditation, Journaling)
- High skip rates → Motivation issues
- **Solution**: Reduce session length, add variety, connect to intrinsic motivation

---

## UI Components

### Feedback Modal ([Today.tsx](src/pages/Today.tsx#L490))

- **Star Rating**: Visual difficulty selector (1-5 stars)
- **Time Input**: Number input with "minutes" label
- **Comment Textarea**: Optional struggle notes
- **Smooth Animations**: Framer Motion for modal appearance

### Checkpoint Card ([Journey.tsx](src/pages/Journey.tsx) - Future Enhancement)

Add a checkpoint indicator on Day 14, 28, 42, 60, 90:

```typescript
{day.dayNumber % 14 === 0 && (
  <div className="checkpoint-marker">
    🎯 Checkpoint Day
  </div>
)}
```

---

## Key Files Modified/Created

| File | Purpose | Changes |
|------|---------|---------|
| [src/agents/agent5-recalibrator.ts](src/agents/agent5-recalibrator.ts) | New Agent 5 | Complete checkpoint analysis logic |
| [src/agents/orchestrator.ts](src/agents/orchestrator.ts) | Orchestrator | Added `handleCheckpoint`, `generateAdaptedSprint` |
| [src/agents/index.ts](src/agents/index.ts) | Exports | Exported Agent 5 functions and types |
| [src/types/agents.ts](src/types/agents.ts) | Types | Added Agent 5 interfaces |
| [src/store/useStore.ts](src/store/useStore.ts) | State | Added feedback fields to Task interface |
| [src/pages/Today.tsx](src/pages/Today.tsx) | UI | Added feedback modal on task completion |
| [src/utils/taskGenerator.ts](src/utils/taskGenerator.ts) | Tasks | Updated Task interface to match store |

---

## Example Flow

### Day 1-14: Foundation Sprint

User completes tasks and rates them:
- Day 1: "Learn C Major Scale" → ⭐⭐⭐ (Medium)
- Day 5: "F Chord Transitions" → ⭐⭐⭐⭐⭐ (Very Hard) + Comment: "Can't get fingers to stretch"
- Day 10: "Basic Strumming" → ⭐⭐ (Easy)

### Day 14: Checkpoint Triggered

Agent 5 analyzes:
```json
{
  "overallMastery": "on-track",
  "strugglingAreas": ["F-chord transitions", "Finger flexibility"],
  "masteringAreas": ["Basic strumming", "C Major scale"],
  "paceAdjustment": "maintain",
  "nextSprintFocus": "Build finger strength & flexibility before advancing"
}
```

### Day 15-28: Adapted Sprint

Generated tasks adjust:
- **Day 15-17**: Added finger stretching exercises (remedial)
- **Day 18**: Rest day (physical recovery)
- **Day 19-21**: F-chord focus with scaffolding (easier variations first)
- **Day 22-28**: Gradually introduce new chords

---

## Future Enhancements

1. **Real-Time Adjustments**: Don't wait for Day 14 if user struggles 3+ days in a row
2. **Predictive Analysis**: Use ML to predict struggles before they happen
3. **Peer Comparison**: "Users with similar backgrounds found this helpful..."
4. **Motivational Nudges**: Send encouragement when difficulty ratings are high
5. **Visual Progress**: Show mastery curves on Journey page

---

## Testing Agent 5

To test the checkpoint system locally:

```typescript
// In ChatOnboarding or a test file
import { handleCheckpoint, convertToFeedback } from '../agents';

const mockCompletedTasks = [
  {
    day: 1,
    title: "Task 1",
    difficultyRating: 3,
    completionTime: 30,
    skipped: false
  },
  // ... 13 more days
];

const { analysis, adaptedTasks } = await handleCheckpoint(
  "Learn Guitar",
  90,
  30,
  roadmap,
  stoneAnswers,
  mockCompletedTasks,
  14
);

console.log("Analysis:", analysis.checkpointAnalysis);
console.log("Next Sprint:", adaptedTasks.length, "tasks");
```

---

## Summary

✅ **Agent 5 (Re-calibrator)** is fully implemented and integrated
✅ **Feedback collection** is built into the Today page
✅ **Checkpoint orchestration** functions are ready
✅ **Database schema** is designed for Supabase integration
✅ **Build passes** with no TypeScript errors

The adaptive curriculum system is **ready for testing** with real user goals. Next steps:
1. Test with a real 14-day journey
2. Integrate with Supabase to persist checkpoints
3. Add checkpoint UI on Journey page
4. Build analytics to track adaptation effectiveness
