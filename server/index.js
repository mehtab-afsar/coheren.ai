import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supabase from './db/supabase.js';

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
    const { data: existingUsers, error: searchError } = await supabase
      .from('users')
      .select('*')
      .eq('preferences->>device_id', device_id);

    if (searchError) {
      throw searchError;
    }

    if (existingUsers && existingUsers.length > 0) {
      const existing = existingUsers[0];

      // Update name if provided and different
      if (name && existing.name !== name) {
        const { data: updated, error: updateError } = await supabase
          .from('users')
          .update({ name, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (updateError) throw updateError;

        console.log('👤 Returning user:', updated.id);
        return res.json(updated);
      }

      console.log('👤 Returning user:', existing.id);
      return res.json(existing);
    }

    // Create new user with device_id
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{
        name: name || 'User',
        timezone,
        preferences: { device_id }
      }])
      .select()
      .single();

    if (createError) throw createError;

    console.log('👤 New user created:', newUser.id);
    res.status(201).json(newUser);
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
      const { data: existing, error: searchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (searchError) throw searchError;

      if (existing) {
        return res.json(existing);
      }
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([{ name, email, timezone }])
      .select()
      .single();

    if (createError) throw createError;

    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// JOURNEY ENDPOINTS
// ============================================

// Create journey with all day records pre-generated
app.post('/api/journeys', async (req, res) => {
  try {
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
      endDate = new Date(providedEndDate);
      total_days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    } else if (duration_months) {
      total_days = duration_months * 28;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + total_days);
    } else if (providedDays) {
      total_days = providedDays;
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + total_days);
    } else {
      total_days = 84; // Default to 12 weeks
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + total_days);
    }

    console.log(`📅 Journey: ${total_days} days from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

    // Create journey
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .insert([{
        user_id,
        title,
        category,
        start_date: startDate.toISOString().split('T')[0],
        target_end_date: endDate.toISOString().split('T')[0],
        total_days,
        daily_time_minutes,
        skill_level,
        strategic_plan
      }])
      .select()
      .single();

    if (journeyError) throw journeyError;

    // Create streak record
    const { error: streakError } = await supabase
      .from('streak_records')
      .insert([{
        user_id,
        journey_id: journey.id,
        grace_days_allowed: 2
      }]);

    if (streakError) throw streakError;

    // Pre-generate all day records
    const dayRecords = [];
    for (let dayNum = 1; dayNum <= total_days; dayNum++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + dayNum - 1);
      const weekNum = Math.ceil(dayNum / 7);

      dayRecords.push({
        journey_id: journey.id,
        user_id,
        day_number: dayNum,
        calendar_date: dayDate.toISOString().split('T')[0],
        week_number: weekNum,
        planned_minutes: daily_time_minutes,
        status: 'pending'
      });
    }

    // Insert day records in batches (Supabase has a limit on bulk inserts)
    const batchSize = 100;
    for (let i = 0; i < dayRecords.length; i += batchSize) {
      const batch = dayRecords.slice(i, i + batchSize);
      const { error: dayRecordsError } = await supabase
        .from('day_records')
        .insert(batch);

      if (dayRecordsError) throw dayRecordsError;
    }

    console.log(`✅ Journey created with ${total_days} day records`);
    res.status(201).json(journey);

  } catch (error) {
    console.error('Error creating journey:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get journey with progress
app.get('/api/journeys/:id', async (req, res) => {
  try {
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (journeyError) {
      if (journeyError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Journey not found' });
      }
      throw journeyError;
    }

    // Get day records
    const { data: dayRecords, error: dayRecordsError } = await supabase
      .from('day_records')
      .select('*')
      .eq('journey_id', req.params.id)
      .order('day_number');

    if (dayRecordsError) throw dayRecordsError;

    // Get streak
    const { data: streak, error: streakError } = await supabase
      .from('streak_records')
      .select('*')
      .eq('journey_id', req.params.id)
      .single();

    if (streakError && streakError.code !== 'PGRST116') throw streakError;

    res.json({
      ...journey,
      day_records: dayRecords || [],
      streak: streak || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's active journey
app.get('/api/users/:userId/active-journey', async (req, res) => {
  try {
    const { data: journey, error } = await supabase
      .from('journeys')
      .select('*')
      .eq('user_id', req.params.userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!journey) {
      return res.status(404).json({ error: 'No active journey' });
    }

    res.json(journey);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get journey progress summary
app.get('/api/journeys/:id/progress', async (req, res) => {
  try {
    const journeyId = req.params.id;

    // Get journey
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journeyId)
      .single();

    if (journeyError) {
      if (journeyError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Journey not found' });
      }
      throw journeyError;
    }

    // Get all day records
    const { data: dayRecords, error: dayRecordsError } = await supabase
      .from('day_records')
      .select('*')
      .eq('journey_id', journeyId);

    if (dayRecordsError) throw dayRecordsError;

    // Calculate expected day (based on current date)
    const startDate = new Date(journey.start_date);
    const today = new Date();
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const expectedDay = Math.min(daysSinceStart, journey.total_days);

    // Calculate stats
    const pastDays = dayRecords.filter(d => d.day_number <= expectedDay);
    const completedDays = pastDays.filter(d => d.status === 'completed').length;
    const missedDays = pastDays.filter(d => d.status === 'missed').length;
    const partialDays = pastDays.filter(d => d.status === 'partial').length;

    // Get streak
    const { data: streak, error: streakError } = await supabase
      .from('streak_records')
      .select('*')
      .eq('journey_id', journeyId)
      .single();

    if (streakError && streakError.code !== 'PGRST116') throw streakError;

    res.json({
      journey_id: journeyId,
      current_day: expectedDay,
      total_days: journey.total_days,
      days_remaining: journey.total_days - expectedDay,
      percent_complete: Math.round((expectedDay / journey.total_days) * 100),
      completed_days: completedDays,
      missed_days: missedDays,
      partial_days: partialDays,
      completion_rate: pastDays.length > 0 ? Math.round((completedDays / pastDays.length) * 100) : 0,
      current_streak: streak?.current_streak || 0,
      longest_streak: streak?.longest_streak || 0,
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
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journeyId)
      .single();

    if (journeyError) {
      if (journeyError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Journey not found' });
      }
      throw journeyError;
    }

    const startDate = new Date(journey.start_date);
    const today = new Date();
    const currentDay = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;

    // Get day record
    const { data: dayRecord, error: dayRecordError } = await supabase
      .from('day_records')
      .select('*')
      .eq('journey_id', journeyId)
      .eq('day_number', currentDay)
      .single();

    if (dayRecordError) {
      if (dayRecordError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Day record not found' });
      }
      throw dayRecordError;
    }

    // Get tasks for this day
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('day_record_id', dayRecord.id)
      .order('task_order');

    if (tasksError) throw tasksError;

    res.json({
      ...dayRecord,
      tasks: tasks || []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific day
app.get('/api/journeys/:id/days/:dayNumber', async (req, res) => {
  try {
    const { id: journeyId, dayNumber } = req.params;

    const { data: dayRecord, error: dayRecordError } = await supabase
      .from('day_records')
      .select('*')
      .eq('journey_id', journeyId)
      .eq('day_number', parseInt(dayNumber))
      .single();

    if (dayRecordError) {
      if (dayRecordError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Day record not found' });
      }
      throw dayRecordError;
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('day_record_id', dayRecord.id)
      .order('task_order');

    if (tasksError) throw tasksError;

    res.json({
      ...dayRecord,
      tasks: tasks || []
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
    const { data: dayRecord, error: dayRecordError } = await supabase
      .from('day_records')
      .select('*')
      .eq('journey_id', journeyId)
      .eq('day_number', parseInt(dayNumber))
      .single();

    if (dayRecordError) {
      if (dayRecordError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Day record not found' });
      }
      throw dayRecordError;
    }

    const dayRecordId = dayRecord.id;

    // Delete existing tasks (in case of regeneration)
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('day_record_id', dayRecordId);

    if (deleteError) throw deleteError;

    // Insert new tasks
    const newTasks = tasks.map((task, index) => ({
      day_record_id: dayRecordId,
      title: task.title,
      description: task.description || task.title,
      type: task.type,
      duration_minutes: task.duration,
      task_order: index + 1
    }));

    const { data: insertedTasks, error: insertError } = await supabase
      .from('tasks')
      .insert(newTasks)
      .select()
      .order('task_order');

    if (insertError) throw insertError;

    res.json({
      ...dayRecord,
      tasks: insertedTasks
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
  try {
    const taskId = req.params.id;
    const { quality, notes } = req.body;

    // Update task
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        quality,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select()
      .single();

    if (taskError) {
      if (taskError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Task not found' });
      }
      throw taskError;
    }

    // Check if all tasks for this day are complete
    const { data: allTasks, error: allTasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('day_record_id', task.day_record_id);

    if (allTasksError) throw allTasksError;

    const completedCount = allTasks.filter(t => t.completed).length;
    const totalCount = allTasks.length;
    const completionRate = (completedCount / totalCount) * 100;

    // Update day record status
    let dayStatus = 'pending';
    if (completionRate === 100) {
      dayStatus = 'completed';
    } else if (completionRate >= 50) {
      dayStatus = 'partial';
    }

    const { error: dayUpdateError } = await supabase
      .from('day_records')
      .update({
        status: dayStatus,
        completed_at: dayStatus === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', task.day_record_id);

    if (dayUpdateError) throw dayUpdateError;

    // Update streak if day completed
    if (dayStatus === 'completed' || dayStatus === 'partial') {
      const { data: dayRecord, error: dayRecordError } = await supabase
        .from('day_records')
        .select('journey_id')
        .eq('id', task.day_record_id)
        .single();

      if (dayRecordError) throw dayRecordError;

      // Get current streak to check if we need to update today
      const { data: currentStreak, error: streakFetchError } = await supabase
        .from('streak_records')
        .select('*')
        .eq('journey_id', dayRecord.journey_id)
        .single();

      if (streakFetchError && streakFetchError.code !== 'PGRST116') throw streakFetchError;

      const today = new Date().toISOString().split('T')[0];
      const lastActiveDate = currentStreak?.last_active_date;

      // Only update streak if we haven't already counted today
      if (!lastActiveDate || lastActiveDate !== today) {
        const newStreak = (currentStreak?.current_streak || 0) + 1;

        const { error: streakUpdateError } = await supabase
          .from('streak_records')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(currentStreak?.longest_streak || 0, newStreak),
            last_active_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('journey_id', dayRecord.journey_id);

        if (streakUpdateError) throw streakUpdateError;
      }
    }

    res.json({
      task: task,
      day_status: dayStatus,
      completion_rate: Math.round(completionRate)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Uncomplete a task
app.post('/api/tasks/:id/uncomplete', async (req, res) => {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .update({
        completed: false,
        completed_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Task not found' });
      }
      throw error;
    }

    res.json(task);
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
    const { data: streak, error } = await supabase
      .from('streak_records')
      .select('*')
      .eq('journey_id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Streak record not found' });
      }
      throw error;
    }

    res.json(streak);
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
    const { data: streak, error: streakError } = await supabase
      .from('streak_records')
      .select('*')
      .eq('journey_id', journeyId)
      .single();

    if (streakError) {
      if (streakError.code === 'PGRST116') {
        return res.status(404).json({ error: 'Streak record not found' });
      }
      throw streakError;
    }

    if (streak.grace_days_used >= streak.grace_days_allowed) {
      return res.status(400).json({ error: 'No grace days remaining this week' });
    }

    // Update streak
    const { error: updateError } = await supabase
      .from('streak_records')
      .update({
        grace_days_used: streak.grace_days_used + 1,
        updated_at: new Date().toISOString()
      })
      .eq('journey_id', journeyId);

    if (updateError) throw updateError;

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
    // Simple query to check database connectivity
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`☁️  Using Supabase database`);
});
