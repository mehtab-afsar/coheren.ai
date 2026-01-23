# 📊 Schema Comparison: V1 vs V2

## Quick Comparison

| Feature | V1 (Old) | V2 (New) | Benefit |
|---------|----------|----------|---------|
| **Organization** | Flat tables | User-centric hierarchy | ✅ Easier to track user data |
| **Tasks Storage** | Separate `tasks` table | Nested in `day_records` | ✅ Fewer JOINs, faster queries |
| **Streak Data** | Separate `streak_records` table | Nested in `journey.progress` | ✅ All journey data in one place |
| **User Stats** | Manual calculation | Auto-calculated via triggers | ✅ Always up-to-date |
| **Preferences** | Basic JSONB | Rich nested structure | ✅ More organized settings |
| **Achievements** | Not tracked | Dedicated table | ✅ Gamification built-in |
| **Activity Log** | Not tracked | Full activity history | ✅ Analytics & insights |
| **Helper Functions** | None | `get_user_complete_data()` etc | ✅ One-call complete data |
| **Querying** | Multiple JOINs | Single function call | ✅ Simpler API code |

---

## Architecture Comparison

### V1 Schema (Flat Structure)

```
users                 journeys              day_records
  |                      |                      |
  |- id                  |- id                  |- id
  |- name                |- user_id             |- journey_id
  |- email               |- title               |- day_number
  |- preferences         |- category            |- status
                         |- status              |- planned_minutes


tasks                 streak_records
  |                      |
  |- id                  |- id
  |- day_record_id       |- journey_id
  |- title               |- current_streak
  |- completed           |- longest_streak
```

**Problems:**
- ❌ 5 separate tables to track user data
- ❌ Multiple JOINs needed for simple queries
- ❌ Stats scattered across tables
- ❌ No activity tracking
- ❌ No achievement system

---

### V2 Schema (Hierarchical Structure)

```
users (Root)
  |
  ├── Profile
  │   ├── name, email, avatar
  │   ├── preferences (JSONB)
  │   │   ├── timezone
  │   │   ├── notifications {...}
  │   │   └── display {...}
  │   └── stats (JSONB)
  │       ├── total_journeys
  │       ├── current_streak
  │       └── completion_rate
  │
  ├── journeys
  │   ├── title, category, status
  │   ├── progress (JSONB)
  │   │   ├── completed_days
  │   │   ├── current_streak
  │   │   └── weekly_performance
  │   ├── strategic_plan (JSONB)
  │   └── day_records
  │       ├── day_number, date, status
  │       ├── tasks (JSONB array)
  │       │   └── [{title, duration, completed}]
  │       ├── reflection, mood, difficulty
  │       └── achievements (JSONB array)
  │
  ├── user_achievements
  │   └── type, name, data, unlocked_at
  │
  └── activity_log
      └── activity_type, data, created_at
```

**Benefits:**
- ✅ Clear user-centric hierarchy
- ✅ All user data easily accessible
- ✅ Nested structures for related data
- ✅ Built-in achievements & activity tracking
- ✅ Auto-calculated stats

---

## Query Comparison

### Example 1: Get User's Complete Data

**V1 (Old):**
```sql
-- Step 1: Get user
SELECT * FROM users WHERE id = 'user-uuid';

-- Step 2: Get journeys
SELECT * FROM journeys WHERE user_id = 'user-uuid';

-- Step 3: For each journey, get day records
SELECT * FROM day_records WHERE journey_id = 'journey-uuid';

-- Step 4: For each day, get tasks
SELECT * FROM tasks WHERE day_record_id = 'day-uuid';

-- Step 5: Get streaks
SELECT * FROM streak_records WHERE journey_id = 'journey-uuid';

-- Total: 5+ queries with multiple JOINs in your code
```

**V2 (New):**
```sql
-- One function call returns everything nested!
SELECT get_user_complete_data('user-uuid');

-- Returns complete JSON with user, journeys, achievements, activity
-- Total: 1 query
```

---

### Example 2: Get Today's Tasks for User

**V1 (Old):**
```sql
-- Multi-step query with JOINs
SELECT t.*, dr.day_number, j.title as journey_title
FROM tasks t
JOIN day_records dr ON t.day_record_id = dr.id
JOIN journeys j ON dr.journey_id = j.id
WHERE j.user_id = 'user-uuid'
  AND dr.calendar_date = CURRENT_DATE;

-- Then parse in your code
```

**V2 (New):**
```sql
-- Simple query, tasks already nested
SELECT
  dr.tasks,
  dr.status,
  dr.mood,
  j.title as journey_title
FROM day_records dr
JOIN journeys j ON j.id = dr.journey_id
WHERE j.user_id = 'user-uuid'
  AND dr.calendar_date = CURRENT_DATE;

-- Returns JSON array of tasks directly
```

---

### Example 3: Update User Stats

**V1 (Old):**
```javascript
// Manual calculation in your code
const totalJourneys = await countJourneys(userId);
const completedDays = await countCompletedDays(userId);
const currentStreak = await calculateStreak(userId);

// Store somewhere? Custom table? User preferences?
```

**V2 (New):**
```sql
-- Automatic via triggers!
-- When journey created/updated, stats update automatically
-- No code needed
```

---

## Data Structure Comparison

### User Preferences

**V1 (Old):**
```json
{
  "device_id": "abc123"
}
```
- ❌ Minimal structure
- ❌ Hard to extend
- ❌ No organization

**V2 (New):**
```json
{
  "device_id": "abc123",
  "timezone": "Asia/Kolkata",
  "language": "en",
  "notifications": {
    "daily_reminder": true,
    "reminder_time": "07:00",
    "streak_alerts": true,
    "achievement_alerts": true
  },
  "display": {
    "theme": "light",
    "show_streaks": true,
    "show_progress": true
  }
}
```
- ✅ Well organized
- ✅ Easy to extend
- ✅ Clear categories

---

### Journey Data

**V1 (Old):**
```
journeys table:
  - title, category, status
  - strategic_plan (JSON)

streak_records table (separate):
  - current_streak
  - longest_streak
  - grace_days
```
- ❌ Streak data separated
- ❌ Need JOIN to get complete picture
- ❌ No automatic updates

**V2 (New):**
```json
{
  "title": "Learn Guitar",
  "category": "creative",
  "status": "active",
  "progress": {
    "completed_days": 14,
    "missed_days": 1,
    "completion_rate": 93,
    "current_streak": 7,
    "longest_streak": 12,
    "grace_days_used": 1,
    "grace_days_allowed": 2,
    "weekly_performance": [85, 90, 93, 88]
  },
  "strategic_plan": {
    "phases": [...],
    "milestones": [...],
    "weekly_themes": [...]
  }
}
```
- ✅ Everything in one place
- ✅ No JOINs needed
- ✅ Auto-updated via triggers

---

### Daily Tasks

**V1 (Old):**
```
tasks table (separate):
  - id
  - day_record_id (FK)
  - title
  - description
  - duration_minutes
  - completed
  - task_order
```
- ❌ Separate table, need JOIN
- ❌ More database rows
- ❌ Slower queries

**V2 (New):**
```json
// Stored directly in day_records.tasks
[
  {
    "title": "Practice chords",
    "duration": 15,
    "type": "practice",
    "completed": true
  },
  {
    "title": "Learn song",
    "duration": 20,
    "type": "learning",
    "completed": false
  }
]
```
- ✅ No separate table
- ✅ Fewer database rows
- ✅ Faster queries
- ✅ Flexible structure

---

## API Code Impact

### V1 (Old API Code):
```javascript
// Get user's active journey with today's tasks
async function getTodaysTasks(userId) {
  // 1. Find active journey
  const journey = await supabase
    .from('journeys')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  // 2. Find today's day record
  const dayRecord = await supabase
    .from('day_records')
    .select('*')
    .eq('journey_id', journey.id)
    .eq('calendar_date', today)
    .single();

  // 3. Get tasks for today
  const tasks = await supabase
    .from('tasks')
    .select('*')
    .eq('day_record_id', dayRecord.id)
    .order('task_order');

  // 4. Get current streak
  const streak = await supabase
    .from('streak_records')
    .select('*')
    .eq('journey_id', journey.id)
    .single();

  // 5. Combine everything
  return {
    journey,
    dayRecord,
    tasks: tasks.data,
    streak: streak.data
  };
}
```
**Problems:**
- ❌ 4 separate database queries
- ❌ Complex code
- ❌ Slow performance
- ❌ Error-prone

---

### V2 (New API Code):
```javascript
// Get user's active journey with today's tasks
async function getTodaysTasks(userId) {
  const { data } = await supabase
    .from('day_records')
    .select(`
      *,
      journey:journeys(title, category, progress)
    `)
    .eq('journeys.user_id', userId)
    .eq('journeys.status', 'active')
    .eq('calendar_date', today)
    .single();

  // Tasks are already in data.tasks (JSONB)
  // Progress/streak is already in data.journey.progress
  return data;
}
```
**Benefits:**
- ✅ 1 database query
- ✅ Simple code
- ✅ Fast performance
- ✅ Less error-prone

---

## Migration Path

### Option 1: Fresh Start (Recommended)
1. Run new schema
2. Update API to use new structure
3. Old schema can coexist temporarily

### Option 2: Gradual Migration
1. Keep both schemas
2. Migrate data table by table
3. Update API endpoints gradually

---

## Summary

**Use V2 if you want:**
- ✅ User-centric organization
- ✅ Faster queries (fewer JOINs)
- ✅ Easier API code
- ✅ Built-in achievements
- ✅ Activity tracking
- ✅ Auto-calculated stats
- ✅ Better scalability

**V2 is optimized for:**
- Modern app development
- User-focused features
- Analytics and insights
- Easier maintenance
- Better performance

---

**Recommendation: Use the new V2 schema!** 🎯

The benefits far outweigh the migration effort, and your API code will be much simpler and faster.
