# Coheren.ai Backend Architecture

## Overview

This document outlines the backend system for tracking user progress over multi-month journeys (e.g., 3-month plans with 84+ days of tasks).

---

## 1. Data Models

### User
```typescript
interface User {
  id: string;                    // UUID
  email: string;
  name: string;
  createdAt: Date;
  timezone: string;              // "Asia/Kolkata" - critical for day calculations
  preferences: {
    energyPattern: 'morning' | 'afternoon' | 'evening' | 'night';
    dailyReminderTime: string;   // "07:00"
    weekendMode: 'same' | 'lighter' | 'off';
  };
}
```

### Journey (the 3-month plan)
```typescript
interface Journey {
  id: string;
  userId: string;
  title: string;                 // "Learn Boxing"
  category: GoalCategory;

  // Timeline
  startDate: Date;               // When user started
  targetEndDate: Date;           // Planned completion
  actualEndDate?: Date;          // When actually completed (if finished)

  // Configuration
  totalDays: number;             // 84 for 3 months
  dailyTimeMinutes: number;      // 120 for "2 hours"
  skillLevel: 'beginner' | 'intermediate' | 'advanced';

  // AI-generated plan
  strategicPlan: {
    totalWeeks: number;
    weekTemplates: WeekTemplate[];
  };

  // Status
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  pausedAt?: Date;
  pauseReason?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

### DayRecord (one entry per calendar day)
```typescript
interface DayRecord {
  id: string;
  journeyId: string;
  userId: string;

  // Day identification
  dayNumber: number;             // 1, 2, 3... 84
  calendarDate: Date;            // "2026-01-12"
  weekNumber: number;            // 1-12

  // Tasks for this day
  tasks: Task[];

  // Completion tracking
  status: 'pending' | 'partial' | 'completed' | 'missed' | 'skip_allowed';
  completedAt?: Date;

  // Time tracking
  plannedMinutes: number;        // 120
  actualMinutes: number;         // How long user actually spent

  // Streak tracking
  contributesToStreak: boolean;  // false if missed

  // User notes
  reflection?: string;
  mood?: 1 | 2 | 3 | 4 | 5;      // How they felt
  difficulty?: 1 | 2 | 3 | 4 | 5; // How hard it was

  createdAt: Date;
  updatedAt: Date;
}
```

### Task
```typescript
interface Task {
  id: string;
  dayRecordId: string;

  // Task details
  title: string;
  description: string;
  type: 'practice' | 'learning' | 'reflection';
  durationMinutes: number;

  // Completion
  completed: boolean;
  completedAt?: Date;

  // Quality tracking
  quality?: 'struggled' | 'okay' | 'good' | 'excellent';
  notes?: string;

  // For adaptive difficulty
  wasSkipped: boolean;
  skipReason?: string;

  order: number;                 // Display order
}
```

### StreakRecord
```typescript
interface StreakRecord {
  id: string;
  userId: string;
  journeyId: string;

  currentStreak: number;         // Days in a row
  longestStreak: number;         // Best ever
  lastActiveDate: Date;          // Last day they completed

  // Grace period tracking
  graceDaysUsed: number;         // How many "skip days" used
  graceDaysAllowed: number;      // Usually 1-2 per week
}
```

---

## 2. Progress Calculation Logic

### Daily Progress
```typescript
function calculateDayProgress(dayRecord: DayRecord): number {
  const totalTasks = dayRecord.tasks.length;
  const completedTasks = dayRecord.tasks.filter(t => t.completed).length;

  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}
```

### Weekly Progress
```typescript
function calculateWeekProgress(weekNumber: number, dayRecords: DayRecord[]): WeekProgress {
  const weekDays = dayRecords.filter(d => d.weekNumber === weekNumber);

  const totalTasks = weekDays.reduce((sum, d) => sum + d.tasks.length, 0);
  const completedTasks = weekDays.reduce((sum, d) =>
    sum + d.tasks.filter(t => t.completed).length, 0);

  const completedDays = weekDays.filter(d => d.status === 'completed').length;
  const missedDays = weekDays.filter(d => d.status === 'missed').length;

  return {
    weekNumber,
    taskCompletion: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
    daysCompleted: completedDays,
    daysMissed: missedDays,
    totalDays: weekDays.length,
    status: missedDays > 2 ? 'struggling' : completedDays === 7 ? 'perfect' : 'on_track'
  };
}
```

### Overall Journey Progress
```typescript
function calculateJourneyProgress(journey: Journey, dayRecords: DayRecord[]): JourneyProgress {
  const today = new Date();
  const daysSinceStart = differenceInDays(today, journey.startDate) + 1;
  const expectedDay = Math.min(daysSinceStart, journey.totalDays);

  // Days that should have been completed by now
  const pastDays = dayRecords.filter(d => d.dayNumber <= expectedDay);

  const completedDays = pastDays.filter(d => d.status === 'completed').length;
  const missedDays = pastDays.filter(d => d.status === 'missed').length;
  const partialDays = pastDays.filter(d => d.status === 'partial').length;

  // Task-level completion
  const allTasks = pastDays.flatMap(d => d.tasks);
  const completedTasks = allTasks.filter(t => t.completed).length;

  // Time tracking
  const plannedMinutes = pastDays.reduce((sum, d) => sum + d.plannedMinutes, 0);
  const actualMinutes = pastDays.reduce((sum, d) => sum + d.actualMinutes, 0);

  return {
    // Timeline progress
    currentDay: expectedDay,
    totalDays: journey.totalDays,
    daysRemaining: journey.totalDays - expectedDay,
    percentComplete: (expectedDay / journey.totalDays) * 100,

    // Completion quality
    completedDays,
    missedDays,
    partialDays,
    completionRate: pastDays.length > 0 ? (completedDays / pastDays.length) * 100 : 0,

    // Task stats
    totalTasks: allTasks.length,
    completedTasks,
    taskCompletionRate: allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : 0,

    // Time stats
    plannedMinutes,
    actualMinutes,
    timeEfficiency: plannedMinutes > 0 ? (actualMinutes / plannedMinutes) * 100 : 0,

    // Streak
    currentStreak: calculateCurrentStreak(dayRecords),

    // Health indicators
    isOnTrack: missedDays <= Math.floor(expectedDay * 0.15), // Allow 15% missed
    needsIntervention: missedDays > Math.floor(expectedDay * 0.3), // Flag if >30% missed
  };
}
```

---

## 3. Handling Missed Days

### End-of-Day Cron Job
```typescript
// Runs at 11:59 PM in user's timezone
async function processEndOfDay(userId: string) {
  const user = await getUser(userId);
  const journey = await getActiveJourney(userId);
  if (!journey) return;

  const today = getTodayInTimezone(user.timezone);
  const dayRecord = await getDayRecord(journey.id, today);

  if (!dayRecord) {
    // Day was never started
    await createMissedDayRecord(journey, today);
    await updateStreak(journey.id, false); // Break streak
    await sendMissedDayNotification(user);
  } else if (dayRecord.status === 'pending' || dayRecord.status === 'partial') {
    // Day started but not completed
    const progress = calculateDayProgress(dayRecord);

    if (progress < 50) {
      dayRecord.status = 'missed';
      await updateStreak(journey.id, false);
    } else {
      dayRecord.status = 'partial';
      // Partial counts as streak if >50% done
      await updateStreak(journey.id, true);
    }

    await saveDayRecord(dayRecord);
  }

  // Generate tomorrow's tasks
  await generateNextDayTasks(journey);
}
```

### Grace Days / Skip Days
```typescript
async function useGraceDay(journeyId: string, date: Date, reason: string) {
  const streak = await getStreakRecord(journeyId);

  if (streak.graceDaysUsed >= streak.graceDaysAllowed) {
    throw new Error('No grace days remaining this week');
  }

  // Mark day as skip_allowed (doesn't break streak)
  await updateDayRecord(journeyId, date, {
    status: 'skip_allowed',
    skipReason: reason,
    contributesToStreak: true // Doesn't break streak
  });

  streak.graceDaysUsed++;
  await saveStreakRecord(streak);
}

// Reset grace days weekly
async function resetWeeklyGraceDays(journeyId: string) {
  const streak = await getStreakRecord(journeyId);
  streak.graceDaysUsed = 0;
  await saveStreakRecord(streak);
}
```

### Catch-Up Mechanism
```typescript
async function allowCatchUp(journeyId: string, missedDate: Date) {
  const dayRecord = await getDayRecord(journeyId, missedDate);

  // Only allow catch-up within 48 hours
  const hoursSinceMissed = differenceInHours(new Date(), missedDate);
  if (hoursSinceMissed > 48) {
    throw new Error('Catch-up window expired');
  }

  // Reduce task requirements for catch-up (focus on essentials)
  const reducedTasks = dayRecord.tasks.filter(t => t.type === 'practice');

  return {
    ...dayRecord,
    tasks: reducedTasks,
    isCatchUp: true,
    originalTaskCount: dayRecord.tasks.length
  };
}
```

---

## 4. Adaptive Difficulty

### Weekly Performance Analysis
```typescript
async function analyzeWeekAndAdjust(journeyId: string, weekNumber: number) {
  const weekProgress = await calculateWeekProgress(weekNumber, await getDayRecords(journeyId));

  let adjustment: 'easier' | 'same' | 'harder' = 'same';

  if (weekProgress.taskCompletion < 60) {
    adjustment = 'easier';
  } else if (weekProgress.taskCompletion > 90 && weekProgress.daysMissed === 0) {
    adjustment = 'harder';
  }

  // Get struggling task types
  const taskTypeStats = await getTaskTypeCompletion(journeyId, weekNumber);
  const strugglingTypes = Object.entries(taskTypeStats)
    .filter(([type, rate]) => rate < 50)
    .map(([type]) => type);

  return {
    adjustment,
    strugglingTypes,
    recommendation: generateRecommendation(adjustment, strugglingTypes)
  };
}

function applyDifficultyAdjustment(
  tasks: Task[],
  adjustment: 'easier' | 'same' | 'harder'
): Task[] {
  const multiplier = adjustment === 'easier' ? 0.8 : adjustment === 'harder' ? 1.2 : 1.0;

  return tasks.map(task => ({
    ...task,
    durationMinutes: Math.round(task.durationMinutes * multiplier)
  }));
}
```

---

## 5. API Endpoints

### Journey Management
```
POST   /api/journeys                    # Create new journey
GET    /api/journeys/:id                # Get journey details
GET    /api/journeys/:id/progress       # Get comprehensive progress
PATCH  /api/journeys/:id/pause          # Pause journey
PATCH  /api/journeys/:id/resume         # Resume journey
DELETE /api/journeys/:id                # Abandon journey
```

### Daily Operations
```
GET    /api/journeys/:id/today          # Get today's tasks
POST   /api/journeys/:id/days/:day/complete-task    # Complete a task
POST   /api/journeys/:id/days/:day/complete         # Complete entire day
POST   /api/journeys/:id/days/:day/reflection       # Add daily reflection
GET    /api/journeys/:id/days/:day                  # Get specific day
```

### Progress & Analytics
```
GET    /api/journeys/:id/weeks/:week    # Weekly breakdown
GET    /api/journeys/:id/streak         # Current streak info
GET    /api/journeys/:id/analytics      # Full analytics dashboard
GET    /api/journeys/:id/heatmap        # Calendar heatmap data
```

### Catch-up & Grace
```
POST   /api/journeys/:id/grace-day      # Use a grace day
POST   /api/journeys/:id/catch-up/:day  # Attempt catch-up
```

---

## 6. Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journeys table
CREATE TABLE journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  target_end_date DATE NOT NULL,
  actual_end_date DATE,
  total_days INTEGER NOT NULL,
  daily_time_minutes INTEGER NOT NULL,
  skill_level VARCHAR(20) NOT NULL,
  strategic_plan JSONB,
  status VARCHAR(20) DEFAULT 'active',
  paused_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Day records table
CREATE TABLE day_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  calendar_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  planned_minutes INTEGER NOT NULL,
  actual_minutes INTEGER DEFAULT 0,
  contributes_to_streak BOOLEAN DEFAULT true,
  reflection TEXT,
  mood INTEGER,
  difficulty INTEGER,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(journey_id, day_number)
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_record_id UUID REFERENCES day_records(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  duration_minutes INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  quality VARCHAR(20),
  notes TEXT,
  was_skipped BOOLEAN DEFAULT false,
  skip_reason TEXT,
  task_order INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Streak records table
CREATE TABLE streak_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES journeys(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  grace_days_used INTEGER DEFAULT 0,
  grace_days_allowed INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(journey_id)
);

-- Indexes for performance
CREATE INDEX idx_day_records_journey ON day_records(journey_id);
CREATE INDEX idx_day_records_date ON day_records(calendar_date);
CREATE INDEX idx_tasks_day_record ON tasks(day_record_id);
CREATE INDEX idx_journeys_user ON journeys(user_id);
CREATE INDEX idx_journeys_status ON journeys(status);
```

---

## 7. Cron Jobs

```typescript
// Daily jobs (run in user's timezone)
schedule('59 23 * * *', processEndOfDay);        // Mark missed days
schedule('0 0 * * *', generateDailyTasks);       // Generate new day's tasks
schedule('0 7 * * *', sendDailyReminder);        // Morning reminder

// Weekly jobs
schedule('0 0 * * 1', resetWeeklyGraceDays);     // Monday: reset grace days
schedule('0 0 * * 0', analyzeWeeklyProgress);    // Sunday: analyze & adjust

// Monthly jobs
schedule('0 0 1 * *', generateMonthlyReport);    // Monthly progress report
```

---

## 8. Validation Rules

### Day Completion Validation
```typescript
function validateDayCompletion(dayRecord: DayRecord): ValidationResult {
  const errors: string[] = [];

  // Check if at least 50% tasks completed
  const completionRate = calculateDayProgress(dayRecord);
  if (completionRate < 50) {
    errors.push('Complete at least 50% of tasks to mark day as done');
  }

  // Check if reflection added (optional but encouraged)
  const hasReflection = !!dayRecord.reflection;

  // Check time logged
  if (dayRecord.actualMinutes === 0) {
    errors.push('Please log how much time you spent');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: !hasReflection ? ['Adding a reflection helps track your journey'] : []
  };
}
```

### Streak Validation
```typescript
function validateStreak(userId: string): boolean {
  const streak = getStreakRecord(userId);
  const lastActive = streak.lastActiveDate;
  const today = new Date();

  const daysSinceActive = differenceInDays(today, lastActive);

  // Streak breaks if more than 1 day gap (unless grace day used)
  return daysSinceActive <= 1;
}
```

---

## 9. Frontend Integration

### Sync Strategy
```typescript
// On app open
async function syncWithBackend() {
  const localData = getLocalStore();
  const serverData = await api.get('/journeys/active/progress');

  // Merge: server is source of truth for completed days
  // Local is source of truth for in-progress current day

  if (serverData.lastSyncedDay > localData.lastSyncedDay) {
    // Server has newer completed data
    mergeServerData(serverData);
  }

  // Push any local completions
  if (localData.pendingCompletions.length > 0) {
    await api.post('/sync', localData.pendingCompletions);
  }
}

// Optimistic updates
async function completeTask(taskId: string) {
  // Update locally immediately
  updateLocalTask(taskId, { completed: true });

  // Sync to server
  try {
    await api.post(`/tasks/${taskId}/complete`);
  } catch (error) {
    // Rollback on failure
    updateLocalTask(taskId, { completed: false });
    showError('Failed to save. Please try again.');
  }
}
```

---

## 10. Tech Stack Recommendation

### Option A: Serverless (Lower cost, faster to build)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **API**: Supabase Edge Functions or Vercel Serverless
- **Cron**: Supabase pg_cron or Vercel Cron
- **Auth**: Supabase Auth

### Option B: Traditional (More control, better for scale)
- **Database**: PostgreSQL (Neon, Railway, or AWS RDS)
- **API**: Node.js + Express or Fastify
- **Cron**: BullMQ with Redis
- **Auth**: NextAuth or Clerk
- **Hosting**: Railway, Render, or AWS

### Recommended: Supabase Stack
```
Frontend (React/Vite) → Supabase Client → Supabase Backend
                                              ├── PostgreSQL
                                              ├── Auth
                                              ├── Edge Functions
                                              └── Realtime subscriptions
```

This gives you:
- Real-time sync across devices
- Built-in auth
- Row-level security
- Automatic API from database
- Edge functions for complex logic
- pg_cron for scheduled jobs
