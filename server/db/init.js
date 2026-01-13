import pool from './pool.js';

const initSQL = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255) NOT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Journeys table (the 3-month plan)
CREATE TABLE IF NOT EXISTS journeys (
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

-- Day records table (one per day of journey)
CREATE TABLE IF NOT EXISTS day_records (
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
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(journey_id, day_number)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
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
CREATE TABLE IF NOT EXISTS streak_records (
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
CREATE INDEX IF NOT EXISTS idx_day_records_journey ON day_records(journey_id);
CREATE INDEX IF NOT EXISTS idx_day_records_date ON day_records(calendar_date);
CREATE INDEX IF NOT EXISTS idx_tasks_day_record ON tasks(day_record_id);
CREATE INDEX IF NOT EXISTS idx_journeys_user ON journeys(user_id);
CREATE INDEX IF NOT EXISTS idx_journeys_status ON journeys(status);
`;

async function initDatabase() {
  try {
    console.log('🔧 Initializing database tables...');
    await pool.query(initSQL);
    console.log('✅ All tables created successfully!');

    // List tables
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('📋 Tables in database:');
    tables.rows.forEach(row => console.log('   -', row.table_name));

    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    process.exit(1);
  }
}

initDatabase();
