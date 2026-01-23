-- ============================================
-- COHEREN - SUPABASE DATABASE SCHEMA V2
-- User-Centric Hierarchical Architecture
-- ============================================
-- This schema organizes everything around the USER
-- All data is easily queryable by user_id with nested structures

-- ============================================
-- CORE USER TABLE
-- ============================================

-- Main users table - the root of all data
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic Info
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  avatar_url TEXT,

  -- Settings & Preferences (nested JSON)
  preferences JSONB DEFAULT '{
    "device_id": null,
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
  }'::jsonb,

  -- User Stats (automatically updated)
  stats JSONB DEFAULT '{
    "total_journeys": 0,
    "active_journeys": 0,
    "completed_journeys": 0,
    "total_days_logged": 0,
    "current_longest_streak": 0,
    "all_time_longest_streak": 0,
    "total_tasks_completed": 0,
    "average_completion_rate": 0
  }'::jsonb,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER JOURNEYS (Learning Plans)
-- ============================================

-- All journeys belong to a user
CREATE TABLE IF NOT EXISTS journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Journey Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- e.g., 'fitness', 'learning', 'creative'

  -- Timeline
  start_date DATE NOT NULL,
  target_end_date DATE NOT NULL,
  actual_end_date DATE,
  total_days INTEGER NOT NULL,
  current_day INTEGER DEFAULT 1,

  -- Configuration
  daily_time_minutes INTEGER NOT NULL,
  skill_level VARCHAR(20) NOT NULL, -- 'beginner', 'intermediate', 'advanced'

  -- AI-Generated Plan (nested structure)
  strategic_plan JSONB DEFAULT '{
    "phases": [],
    "milestones": [],
    "weekly_themes": [],
    "difficulty_curve": "gradual"
  }'::jsonb,

  -- Progress Tracking
  progress JSONB DEFAULT '{
    "completed_days": 0,
    "missed_days": 0,
    "partial_days": 0,
    "completion_rate": 0,
    "current_streak": 0,
    "longest_streak": 0,
    "grace_days_used": 0,
    "grace_days_allowed": 2,
    "last_active_date": null,
    "weekly_performance": []
  }'::jsonb,

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'paused', 'abandoned'
  paused_at TIMESTAMP,
  paused_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DAILY RECORDS (Day-by-Day Progress)
-- ============================================

-- Each journey has multiple day records
CREATE TABLE IF NOT EXISTS day_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Day Identity
  day_number INTEGER NOT NULL,
  calendar_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL, -- 1-7 (Monday-Sunday)

  -- Planning
  planned_minutes INTEGER NOT NULL,
  planned_focus TEXT, -- What to focus on today

  -- Completion Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'partial', 'missed', 'skipped'
  actual_minutes INTEGER DEFAULT 0,

  -- Tasks for this day (nested array)
  tasks JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"title": "Practice chords", "duration": 15, "completed": false, "type": "practice"},
  --   {"title": "Learn new song", "duration": 20, "completed": false, "type": "learning"}
  -- ]

  -- User Feedback
  reflection TEXT,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5), -- 1=terrible, 5=amazing
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5), -- 1=too easy, 5=too hard
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),

  -- Achievements
  achievements JSONB DEFAULT '[]'::jsonb,
  -- Example: ["first_completion", "streak_3_days", "full_week"]

  -- Streak Tracking
  contributes_to_streak BOOLEAN DEFAULT true,
  is_grace_day BOOLEAN DEFAULT false,

  -- Timestamps
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(journey_id, day_number)
);

-- ============================================
-- USER ACHIEVEMENTS & BADGES
-- ============================================

-- Track all achievements unlocked by users
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Achievement Info
  achievement_type VARCHAR(50) NOT NULL, -- 'streak', 'milestone', 'consistency', 'completion'
  achievement_name VARCHAR(100) NOT NULL,
  achievement_data JSONB DEFAULT '{}'::jsonb,
  -- Example: {"streak_days": 7, "journey_id": "...", "journey_title": "Learn Guitar"}

  -- Timestamps
  unlocked_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG (Track all user actions)
-- ============================================

-- Comprehensive activity log for analytics
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Activity Details
  activity_type VARCHAR(50) NOT NULL, -- 'task_completed', 'day_completed', 'journey_started', etc.
  activity_data JSONB DEFAULT '{}'::jsonb,

  -- Context
  journey_id UUID REFERENCES journeys(id) ON DELETE SET NULL,
  day_record_id UUID REFERENCES day_records(id) ON DELETE SET NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- HELPER VIEWS - Easy Nested Queries
-- ============================================

-- Get complete user profile with all data
CREATE OR REPLACE VIEW user_profile_complete AS
SELECT
  u.id,
  u.name,
  u.email,
  u.avatar_url,
  u.preferences,
  u.stats,
  u.created_at,
  u.last_active_at,

  -- Aggregate journey data
  (
    SELECT json_agg(
      json_build_object(
        'id', j.id,
        'title', j.title,
        'category', j.category,
        'status', j.status,
        'current_day', j.current_day,
        'total_days', j.total_days,
        'progress', j.progress,
        'start_date', j.start_date,
        'target_end_date', j.target_end_date
      )
      ORDER BY j.created_at DESC
    )
    FROM journeys j
    WHERE j.user_id = u.id
  ) as journeys,

  -- Recent achievements
  (
    SELECT json_agg(
      json_build_object(
        'type', ua.achievement_type,
        'name', ua.achievement_name,
        'data', ua.achievement_data,
        'unlocked_at', ua.unlocked_at
      )
      ORDER BY ua.unlocked_at DESC
    )
    FROM user_achievements ua
    WHERE ua.user_id = u.id
    LIMIT 10
  ) as recent_achievements

FROM users u;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Journey indexes
CREATE INDEX IF NOT EXISTS idx_journeys_user_status ON journeys(user_id, status);
CREATE INDEX IF NOT EXISTS idx_journeys_user_active ON journeys(user_id) WHERE status = 'active';

-- Day records indexes
CREATE INDEX IF NOT EXISTS idx_day_records_journey_day ON day_records(journey_id, day_number);
CREATE INDEX IF NOT EXISTS idx_day_records_user_date ON day_records(user_id, calendar_date);
CREATE INDEX IF NOT EXISTS idx_day_records_journey_status ON day_records(journey_id, status);

-- Achievements index
CREATE INDEX IF NOT EXISTS idx_achievements_user_time ON user_achievements(user_id, unlocked_at DESC);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_user_time ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_type_time ON activity_log(activity_type, created_at DESC);

-- ============================================
-- FUNCTIONS FOR NESTED QUERIES
-- ============================================

-- Function to get complete user data with all nested information
CREATE OR REPLACE FUNCTION get_user_complete_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'user', jsonb_build_object(
      'id', u.id,
      'name', u.name,
      'email', u.email,
      'avatar_url', u.avatar_url,
      'preferences', u.preferences,
      'stats', u.stats,
      'created_at', u.created_at,
      'last_active_at', u.last_active_at
    ),
    'journeys', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', j.id,
          'title', j.title,
          'description', j.description,
          'category', j.category,
          'status', j.status,
          'current_day', j.current_day,
          'total_days', j.total_days,
          'progress', j.progress,
          'strategic_plan', j.strategic_plan,
          'start_date', j.start_date,
          'target_end_date', j.target_end_date,
          'created_at', j.created_at
        )
        ORDER BY j.created_at DESC
      ), '[]'::jsonb)
      FROM journeys j
      WHERE j.user_id = p_user_id
    ),
    'achievements', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'type', ua.achievement_type,
          'name', ua.achievement_name,
          'data', ua.achievement_data,
          'unlocked_at', ua.unlocked_at
        )
        ORDER BY ua.unlocked_at DESC
      ), '[]'::jsonb)
      FROM user_achievements ua
      WHERE ua.user_id = p_user_id
      LIMIT 20
    ),
    'recent_activity', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'type', al.activity_type,
          'data', al.activity_data,
          'created_at', al.created_at
        )
        ORDER BY al.created_at DESC
      ), '[]'::jsonb)
      FROM activity_log al
      WHERE al.user_id = p_user_id
      LIMIT 50
    )
  ) INTO result
  FROM users u
  WHERE u.id = p_user_id;

  RETURN result;
END;
$$;

-- Function to get journey with all day records
CREATE OR REPLACE FUNCTION get_journey_complete_data(p_journey_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'journey', jsonb_build_object(
      'id', j.id,
      'title', j.title,
      'description', j.description,
      'category', j.category,
      'status', j.status,
      'current_day', j.current_day,
      'total_days', j.total_days,
      'daily_time_minutes', j.daily_time_minutes,
      'skill_level', j.skill_level,
      'progress', j.progress,
      'strategic_plan', j.strategic_plan,
      'start_date', j.start_date,
      'target_end_date', j.target_end_date
    ),
    'day_records', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', dr.id,
          'day_number', dr.day_number,
          'calendar_date', dr.calendar_date,
          'week_number', dr.week_number,
          'status', dr.status,
          'planned_minutes', dr.planned_minutes,
          'actual_minutes', dr.actual_minutes,
          'tasks', dr.tasks,
          'reflection', dr.reflection,
          'mood', dr.mood,
          'difficulty', dr.difficulty,
          'energy_level', dr.energy_level,
          'achievements', dr.achievements,
          'completed_at', dr.completed_at
        )
        ORDER BY dr.day_number
      ), '[]'::jsonb)
      FROM day_records dr
      WHERE dr.journey_id = p_journey_id
    )
  ) INTO result
  FROM journeys j
  WHERE j.id = p_journey_id;

  RETURN result;
END;
$$;

-- ============================================
-- TRIGGERS FOR AUTO-UPDATES
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journeys_updated_at BEFORE UPDATE ON journeys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_day_records_updated_at BEFORE UPDATE ON day_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update user stats when journey is created/completed
CREATE OR REPLACE FUNCTION update_user_stats_on_journey_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user stats based on journey changes
  UPDATE users
  SET stats = jsonb_set(
    jsonb_set(
      stats,
      '{total_journeys}',
      to_jsonb((SELECT COUNT(*) FROM journeys WHERE user_id = NEW.user_id)::int)
    ),
    '{active_journeys}',
    to_jsonb((SELECT COUNT(*) FROM journeys WHERE user_id = NEW.user_id AND status = 'active')::int)
  )
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_stats_on_journey_insert
    AFTER INSERT ON journeys
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_journey_change();

CREATE TRIGGER update_stats_on_journey_update
    AFTER UPDATE ON journeys
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_on_journey_change();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users full access to own data" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users full access to own journeys" ON journeys
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users full access to own day records" ON day_records
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users full access to own achievements" ON user_achievements
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Users full access to own activity" ON activity_log
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- EXAMPLE QUERIES
-- ============================================

-- Get complete user data with all nested info:
-- SELECT get_user_complete_data('user-uuid-here');

-- Get journey with all day records:
-- SELECT get_journey_complete_data('journey-uuid-here');

-- Get user's active journeys with progress:
-- SELECT * FROM journeys WHERE user_id = 'user-uuid' AND status = 'active';

-- Get today's tasks for a user:
-- SELECT dr.* FROM day_records dr
-- JOIN journeys j ON j.id = dr.journey_id
-- WHERE j.user_id = 'user-uuid'
-- AND dr.calendar_date = CURRENT_DATE;
