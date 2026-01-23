# 🏗️ User-Centric Database Architecture

## Overview

The new schema is designed around **users as the root** of all data. Everything is organized hierarchically and easily queryable by `user_id`.

---

## 🌳 Data Hierarchy

```
USER (Root)
├── Profile Data
│   ├── Basic info (name, email, avatar)
│   ├── Preferences (nested JSON)
│   └── Stats (auto-calculated)
│
├── JOURNEYS (Learning Plans)
│   ├── Journey Details
│   ├── Strategic Plan (nested JSON)
│   ├── Progress Tracking (nested JSON)
│   └── DAY RECORDS
│       ├── Day details
│       ├── Tasks (nested JSON array)
│       ├── Reflection & feedback
│       └── Achievements (nested JSON array)
│
├── ACHIEVEMENTS
│   └── Unlocked badges & milestones
│
└── ACTIVITY LOG
    └── All user actions tracked
```

---

## ✨ Key Improvements

### 1. **Nested JSON Structures**

Instead of multiple tables, related data is stored in JSONB columns:

#### **User Preferences** (All settings in one place)
```json
{
  "device_id": "abc123",
  "timezone": "Asia/Kolkata",
  "language": "en",
  "notifications": {
    "daily_reminder": true,
    "reminder_time": "07:00",
    "streak_alerts": true
  },
  "display": {
    "theme": "dark",
    "show_streaks": true
  }
}
```

#### **Journey Progress** (All progress metrics nested)
```json
{
  "completed_days": 15,
  "missed_days": 2,
  "completion_rate": 88,
  "current_streak": 7,
  "longest_streak": 12,
  "grace_days_used": 1,
  "grace_days_allowed": 2,
  "weekly_performance": [85, 90, 88, 92]
}
```

#### **Daily Tasks** (Tasks stored with the day)
```json
[
  {
    "title": "Practice guitar chords",
    "duration": 15,
    "type": "practice",
    "completed": true
  },
  {
    "title": "Learn new song",
    "duration": 20,
    "type": "learning",
    "completed": false
  }
]
```

---

### 2. **Helper Functions for Complete Data**

Get ALL user data with one function call:

```sql
-- Returns complete nested JSON with all user data
SELECT get_user_complete_data('user-uuid-here');
```

**Returns:**
```json
{
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "preferences": {...},
    "stats": {...}
  },
  "journeys": [
    {
      "id": "uuid",
      "title": "Learn Guitar",
      "status": "active",
      "progress": {...},
      "strategic_plan": {...}
    }
  ],
  "achievements": [
    {
      "type": "streak",
      "name": "7 Day Streak",
      "unlocked_at": "2025-01-20"
    }
  ],
  "recent_activity": [...]
}
```

Get complete journey with all day records:

```sql
SELECT get_journey_complete_data('journey-uuid-here');
```

---

### 3. **Auto-Calculated Stats**

User stats are **automatically updated** via database triggers:

```json
{
  "total_journeys": 3,
  "active_journeys": 1,
  "completed_journeys": 2,
  "total_days_logged": 84,
  "current_longest_streak": 15,
  "all_time_longest_streak": 28,
  "total_tasks_completed": 156,
  "average_completion_rate": 87
}
```

No need to calculate these manually - the database does it!

---

### 4. **Activity Log**

Track **everything** a user does:

```sql
-- Example activities tracked:
- task_completed
- day_completed
- journey_started
- journey_completed
- achievement_unlocked
- streak_milestone
- grace_day_used
```

Great for:
- Analytics
- User behavior insights
- Debugging
- Recommendations

---

## 📊 Common Queries

### Get User with All Data
```sql
SELECT get_user_complete_data('user-uuid');
```

### Get User's Active Journeys
```sql
SELECT * FROM journeys
WHERE user_id = 'user-uuid'
AND status = 'active';
```

### Get Today's Tasks for User
```sql
SELECT dr.tasks, dr.status, j.title as journey_title
FROM day_records dr
JOIN journeys j ON j.id = dr.journey_id
WHERE j.user_id = 'user-uuid'
AND dr.calendar_date = CURRENT_DATE;
```

### Get Journey with All Days
```sql
SELECT get_journey_complete_data('journey-uuid');
```

### Get User's Recent Achievements
```sql
SELECT * FROM user_achievements
WHERE user_id = 'user-uuid'
ORDER BY unlocked_at DESC
LIMIT 10;
```

### Get User's Activity History
```sql
SELECT * FROM activity_log
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 50;
```

---

## 🔄 How Data Flows

### 1. **User Signs Up**
```
users table created
↓
stats initialized to zeros
↓
preferences set to defaults
```

### 2. **User Creates Journey**
```
journey created
↓
trigger updates user.stats.total_journeys
↓
trigger updates user.stats.active_journeys
↓
activity_log entry created
```

### 3. **User Completes Day**
```
day_record.status updated
↓
day_record.tasks updated
↓
journey.progress updated (streak, completion_rate)
↓
user.stats updated (total_days_logged)
↓
achievement check (unlock badges if earned)
↓
activity_log entry created
```

---

## 🎯 Benefits

### ✅ **Easy to Query**
- Everything related to a user? → One function call
- All days in a journey? → One function call
- User's achievements? → Simple WHERE user_id

### ✅ **Better Performance**
- Fewer JOIN operations needed
- JSONB is indexed and fast
- Views and functions pre-aggregate data

### ✅ **Flexible Schema**
- Add new preferences without schema changes
- Store arbitrary achievement data
- Track any activity type in activity_log

### ✅ **Self-Documenting**
- JSONB structures show exactly what data exists
- Function names describe what they return
- Clear hierarchy: user → journey → day

### ✅ **Auto-Maintained**
- Stats update automatically via triggers
- No manual calculation needed
- Consistency guaranteed

---

## 📈 Scaling Considerations

### Good For:
- ✅ Millions of users
- ✅ Thousands of journeys per user
- ✅ Fast user profile queries
- ✅ Complex analytics

### Optimized By:
- Indexes on user_id everywhere
- JSONB GIN indexes for nested queries
- Partial indexes for active journeys
- Function caching

---

## 🔐 Security (RLS)

All tables have Row Level Security enabled:

- Users can only see/modify **their own** data
- Foreign keys enforce data integrity
- Service role (your server) bypasses RLS for admin operations

---

## 🚀 Migration from Old Schema

The old schema had:
- Separate `tasks` table
- Separate `streak_records` table
- Less nested structure

New schema:
- ✅ Tasks embedded in day_records
- ✅ Streak data in journey.progress
- ✅ Everything organized by user

**Migration is automatic** - just run the new schema and update your API code!

---

## 📝 Next Steps

1. **Run the new schema** in Supabase SQL Editor
2. **Update server code** to use new structure
3. **Use helper functions** for easy queries
4. **Enjoy organized data!** 🎉

---

## Example: Complete User Data Structure

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "preferences": {
      "timezone": "Asia/Kolkata",
      "notifications": {
        "daily_reminder": true,
        "reminder_time": "07:00"
      }
    },
    "stats": {
      "total_journeys": 3,
      "active_journeys": 1,
      "total_days_logged": 42,
      "current_longest_streak": 15
    }
  },
  "journeys": [
    {
      "id": "journey-uuid",
      "title": "Learn Guitar",
      "category": "creative",
      "status": "active",
      "current_day": 15,
      "total_days": 84,
      "progress": {
        "completed_days": 14,
        "current_streak": 7,
        "completion_rate": 93
      }
    }
  ],
  "achievements": [
    {
      "type": "streak",
      "name": "First Week",
      "data": {
        "streak_days": 7,
        "journey_title": "Learn Guitar"
      }
    }
  ]
}
```

**Everything in one place, organized by user!** 🎯
