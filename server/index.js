import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/pool.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// USER ENDPOINTS
// ============================================

// Auto-create or get user (silent user management)
// Uses device_id to identify returning users without auth
app.post('/api/users/auto', async (req, res) => {
  try {
    const { device_id, name, timezone = 'Asia/Kolkata' } = req.body;

    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }

    // Check if user exists by device_id (stored in preferences)
    const existing = await pool.query(
      `SELECT * FROM users WHERE preferences->>'device_id' = $1`,
      [device_id]
    );

    if (existing.rows.length > 0) {
      // Update name if provided and different
      if (name && existing.rows[0].name !== name) {
        await pool.query(
          `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`,
          [name, existing.rows[0].id]
        );
        existing.rows[0].name = name;
      }
      console.log('👤 Returning user:', existing.rows[0].id);
      return res.json(existing.rows[0]);
    }

    // Create new user with device_id
    const result = await pool.query(
      `INSERT INTO users (name, timezone, preferences)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name || 'User', timezone, JSON.stringify({ device_id })]
    );

    console.log('👤 New user created:', result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error in auto user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create or get user (legacy - with email)
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, timezone = 'Asia/Kolkata' } = req.body;

    // Check if user exists
    if (email) {
      const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.json(existing.rows[0]);
      }
    }

    // Create new user
    const result = await pool.query(
      `INSERT INTO users (name, email, timezone) VALUES ($1, $2, $3) RETURNING *`,
      [name, email, timezone]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// JOURNEY ENDPOINTS
// ============================================

// Create journey with all day records pre-generated
// Accepts either:
//   - total_days (e.g., 84 for 12 weeks)
//   - duration_months (e.g., 3) - will calculate days as duration_months * 28
//   - target_end_date (e.g., "2026-04-12") - will calculate days dynamically
app.post('/api/journeys', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      user_id,
      title,
      category,
      total_days: providedDays,
      duration_months,
      target_end_date: providedEndDate,
      daily_time_minutes,
      skill_level,
      strategic_plan
    } = req.body;

    // Calculate dates and total_days dynamically
    const startDate = new Date();
    let endDate;
    let total_days;

    if (providedEndDate) {
      // Calculate from target end date
      endDate = new Date(providedEndDate);
      total_days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    } else if (duration_months) {
      // Calculate from duration in months (28 days per month for consistency)
      total_days = duration_months * 28;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + total_days);
    } else if (providedDays) {
      // Use provided total_days
      total_days = providedDays;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + total_days);
    } else {
      // Default to 84 days (12 weeks)
      total_days = 84;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + total_days);
    }

    console.log(`📅 Journey: ${total_days} days from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Create journey
    const journeyResult = await client.query(
      `INSERT INTO journeys
       (user_id, title, category, start_date, target_end_date, total_days, daily_time_minutes, skill_level, strategic_plan)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [user_id, title, category, startDate, endDate, total_days, daily_time_minutes, skill_level, JSON.stringify(strategic_plan)]
    );

    const journey = journeyResult.rows[0];

    // Create streak record
    await client.query(
      `INSERT INTO streak_records (user_id, journey_id, grace_days_allowed)
       VALUES ($1, $2, 2)`,
      [user_id, journey.id]
    );

    // Pre-generate all day records
    for (let dayNum = 1; dayNum <= total_days; dayNum++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + dayNum - 1);
      const weekNum = Math.ceil(dayNum / 7);

      await client.query(
        `INSERT INTO day_records
         (journey_id, user_id, day_number, calendar_date, week_number, planned_minutes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [journey.id, user_id, dayNum, dayDate, weekNum, daily_time_minutes]
      );
    }

    await client.query('COMMIT');

    console.log(`✅ Journey created with ${total_days} day records`);
    res.status(201).json(journey);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating journey:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Get journey with progress
app.get('/api/journeys/:id', async (req, res) => {
  try {
    const journey = await pool.query('SELECT * FROM journeys WHERE id = $1', [req.params.id]);
    if (journey.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Get day records
    const dayRecords = await pool.query(
      'SELECT * FROM day_records WHERE journey_id = $1 ORDER BY day_number',
      [req.params.id]
    );

    // Get streak
    const streak = await pool.query(
      'SELECT * FROM streak_records WHERE journey_id = $1',
      [req.params.id]
    );

    res.json({
      ...journey.rows[0],
      day_records: dayRecords.rows,
      streak: streak.rows[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's active journey
app.get('/api/users/:userId/active-journey', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM journeys WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [req.params.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active journey' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get journey progress summary
app.get('/api/journeys/:id/progress', async (req, res) => {
  try {
    const journeyId = req.params.id;

    // Get journey
    const journey = await pool.query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
    if (journey.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Get all day records
    const dayRecords = await pool.query(
      'SELECT * FROM day_records WHERE journey_id = $1',
      [journeyId]
    );

    // Calculate expected day (based on current date)
    const startDate = new Date(journey.rows[0].start_date);
    const today = new Date();
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const expectedDay = Math.min(daysSinceStart, journey.rows[0].total_days);

    // Calculate stats
    const pastDays = dayRecords.rows.filter(d => d.day_number <= expectedDay);
    const completedDays = pastDays.filter(d => d.status === 'completed').length;
    const missedDays = pastDays.filter(d => d.status === 'missed').length;
    const partialDays = pastDays.filter(d => d.status === 'partial').length;

    // Get streak
    const streak = await pool.query(
      'SELECT * FROM streak_records WHERE journey_id = $1',
      [journeyId]
    );

    res.json({
      journey_id: journeyId,
      current_day: expectedDay,
      total_days: journey.rows[0].total_days,
      days_remaining: journey.rows[0].total_days - expectedDay,
      percent_complete: Math.round((expectedDay / journey.rows[0].total_days) * 100),
      completed_days: completedDays,
      missed_days: missedDays,
      partial_days: partialDays,
      completion_rate: pastDays.length > 0 ? Math.round((completedDays / pastDays.length) * 100) : 0,
      current_streak: streak.rows[0]?.current_streak || 0,
      longest_streak: streak.rows[0]?.longest_streak || 0,
      is_on_track: missedDays <= Math.floor(expectedDay * 0.15),
      needs_intervention: missedDays > Math.floor(expectedDay * 0.3)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DAY RECORD ENDPOINTS
// ============================================

// Get today's tasks
app.get('/api/journeys/:id/today', async (req, res) => {
  try {
    const journeyId = req.params.id;

    // Get journey to calculate current day
    const journey = await pool.query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
    if (journey.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const startDate = new Date(journey.rows[0].start_date);
    const today = new Date();
    const currentDay = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Get day record
    const dayRecord = await pool.query(
      'SELECT * FROM day_records WHERE journey_id = $1 AND day_number = $2',
      [journeyId, currentDay]
    );

    if (dayRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Day record not found' });
    }

    // Get tasks for this day
    const tasks = await pool.query(
      'SELECT * FROM tasks WHERE day_record_id = $1 ORDER BY task_order',
      [dayRecord.rows[0].id]
    );

    res.json({
      ...dayRecord.rows[0],
      tasks: tasks.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific day
app.get('/api/journeys/:id/days/:dayNumber', async (req, res) => {
  try {
    const { id: journeyId, dayNumber } = req.params;

    const dayRecord = await pool.query(
      'SELECT * FROM day_records WHERE journey_id = $1 AND day_number = $2',
      [journeyId, parseInt(dayNumber)]
    );

    if (dayRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Day record not found' });
    }

    const tasks = await pool.query(
      'SELECT * FROM tasks WHERE day_record_id = $1 ORDER BY task_order',
      [dayRecord.rows[0].id]
    );

    res.json({
      ...dayRecord.rows[0],
      tasks: tasks.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate tasks for a day (called when user starts a day)
app.post('/api/journeys/:id/days/:dayNumber/generate-tasks', async (req, res) => {
  try {
    const { id: journeyId, dayNumber } = req.params;
    const { tasks } = req.body; // Array of tasks from AI plan

    // Get day record
    const dayRecord = await pool.query(
      'SELECT * FROM day_records WHERE journey_id = $1 AND day_number = $2',
      [journeyId, parseInt(dayNumber)]
    );

    if (dayRecord.rows.length === 0) {
      return res.status(404).json({ error: 'Day record not found' });
    }

    const dayRecordId = dayRecord.rows[0].id;

    // Delete existing tasks (in case of regeneration)
    await pool.query('DELETE FROM tasks WHERE day_record_id = $1', [dayRecordId]);

    // Insert new tasks
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      await pool.query(
        `INSERT INTO tasks (day_record_id, title, description, type, duration_minutes, task_order)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [dayRecordId, task.title, task.description || task.title, task.type, task.duration, i + 1]
      );
    }

    // Get updated tasks
    const updatedTasks = await pool.query(
      'SELECT * FROM tasks WHERE day_record_id = $1 ORDER BY task_order',
      [dayRecordId]
    );

    res.json({
      ...dayRecord.rows[0],
      tasks: updatedTasks.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TASK ENDPOINTS
// ============================================

// Complete a task
app.post('/api/tasks/:id/complete', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const taskId = req.params.id;
    const { quality, notes } = req.body;

    // Update task
    const taskResult = await client.query(
      `UPDATE tasks
       SET completed = true, completed_at = NOW(), quality = $2, notes = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [taskId, quality, notes]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult.rows[0];

    // Check if all tasks for this day are complete
    const allTasks = await client.query(
      'SELECT * FROM tasks WHERE day_record_id = $1',
      [task.day_record_id]
    );

    const completedCount = allTasks.rows.filter(t => t.completed).length;
    const totalCount = allTasks.rows.length;
    const completionRate = (completedCount / totalCount) * 100;

    // Update day record status
    let dayStatus = 'pending';
    if (completionRate === 100) {
      dayStatus = 'completed';
    } else if (completionRate >= 50) {
      dayStatus = 'partial';
    }

    await client.query(
      `UPDATE day_records
       SET status = $1, completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE NULL END, updated_at = NOW()
       WHERE id = $2`,
      [dayStatus, task.day_record_id]
    );

    // Update streak if day completed
    if (dayStatus === 'completed' || dayStatus === 'partial') {
      const dayRecord = await client.query(
        'SELECT journey_id FROM day_records WHERE id = $1',
        [task.day_record_id]
      );

      await client.query(
        `UPDATE streak_records
         SET current_streak = current_streak + 1,
             longest_streak = GREATEST(longest_streak, current_streak + 1),
             last_active_date = CURRENT_DATE,
             updated_at = NOW()
         WHERE journey_id = $1 AND last_active_date < CURRENT_DATE`,
        [dayRecord.rows[0].journey_id]
      );
    }

    await client.query('COMMIT');

    res.json({
      task: task,
      day_status: dayStatus,
      completion_rate: Math.round(completionRate)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Uncomplete a task
app.post('/api/tasks/:id/uncomplete', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE tasks
       SET completed = false, completed_at = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// STREAK ENDPOINTS
// ============================================

// Get streak info
app.get('/api/journeys/:id/streak', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM streak_records WHERE journey_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Streak record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Use grace day
app.post('/api/journeys/:id/grace-day', async (req, res) => {
  try {
    const journeyId = req.params.id;
    const { reason } = req.body;

    // Check grace days remaining
    const streak = await pool.query(
      'SELECT * FROM streak_records WHERE journey_id = $1',
      [journeyId]
    );

    if (streak.rows.length === 0) {
      return res.status(404).json({ error: 'Streak record not found' });
    }

    if (streak.rows[0].grace_days_used >= streak.rows[0].grace_days_allowed) {
      return res.status(400).json({ error: 'No grace days remaining this week' });
    }

    // Update streak
    await pool.query(
      `UPDATE streak_records
       SET grace_days_used = grace_days_used + 1, updated_at = NOW()
       WHERE journey_id = $1`,
      [journeyId]
    );

    res.json({ message: 'Grace day used', reason });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
});
