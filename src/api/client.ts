// API Client for Coheren Backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generate or retrieve device ID for user identification
function getDeviceId(): string {
  let deviceId = localStorage.getItem('coheren_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('coheren_device_id', deviceId);
  }
  return deviceId;
}

// Store user ID after creation/retrieval
let cachedUserId: string | null = null;

export function getUserId(): string | null {
  if (cachedUserId) return cachedUserId;
  cachedUserId = localStorage.getItem('coheren_user_id');
  return cachedUserId;
}

function setUserId(id: string): void {
  cachedUserId = id;
  localStorage.setItem('coheren_user_id', id);
}

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================
// USER API
// ============================================

export interface User {
  id: string;
  name: string;
  email?: string;
  timezone: string;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Auto-create or get user (called silently on app start)
export async function getOrCreateUser(name?: string): Promise<User> {
  const deviceId = getDeviceId();

  const user = await fetchAPI<User>('/users/auto', {
    method: 'POST',
    body: JSON.stringify({
      device_id: deviceId,
      name: name || undefined,
    }),
  });

  setUserId(user.id);
  return user;
}

// Update user name
export async function updateUserName(name: string): Promise<User> {
  return getOrCreateUser(name);
}

// ============================================
// JOURNEY API
// ============================================

export interface Journey {
  id: string;
  user_id: string;
  title: string;
  category: string;
  start_date: string;
  target_end_date: string;
  actual_end_date?: string;
  total_days: number;
  daily_time_minutes: number;
  skill_level: string;
  strategic_plan?: unknown;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  created_at: string;
  updated_at: string;
}

export interface CreateJourneyInput {
  title: string;
  category: string;
  total_days?: number;
  duration_months?: number;
  target_end_date?: string;
  daily_time_minutes: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  strategic_plan?: unknown;
}

// Create a new journey
export async function createJourney(input: CreateJourneyInput): Promise<Journey> {
  const userId = getUserId();
  if (!userId) {
    throw new Error('User not initialized. Call getOrCreateUser first.');
  }

  return fetchAPI<Journey>('/journeys', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      ...input,
    }),
  });
}

// Get journey by ID
export async function getJourney(journeyId: string): Promise<Journey> {
  return fetchAPI<Journey>(`/journeys/${journeyId}`);
}

// Get user's active journey
export async function getActiveJourney(): Promise<Journey | null> {
  const userId = getUserId();
  if (!userId) return null;

  try {
    return await fetchAPI<Journey>(`/users/${userId}/active-journey`);
  } catch {
    return null;
  }
}

// ============================================
// PROGRESS API
// ============================================

export interface JourneyProgress {
  journey_id: string;
  current_day: number;
  total_days: number;
  days_remaining: number;
  percent_complete: number;
  completed_days: number;
  missed_days: number;
  partial_days: number;
  completion_rate: number;
  current_streak: number;
  longest_streak: number;
  is_on_track: boolean;
  needs_intervention: boolean;
}

// Get journey progress
export async function getJourneyProgress(journeyId: string): Promise<JourneyProgress> {
  return fetchAPI<JourneyProgress>(`/journeys/${journeyId}/progress`);
}

// ============================================
// DAY & TASK API
// ============================================

export interface Task {
  id: string;
  day_record_id: string;
  title: string;
  description?: string;
  type: 'practice' | 'learning' | 'reflection';
  duration_minutes: number;
  completed: boolean;
  completed_at?: string;
  quality?: string;
  notes?: string;
  task_order: number;
}

export interface DayRecord {
  id: string;
  journey_id: string;
  day_number: number;
  calendar_date: string;
  week_number: number;
  status: 'pending' | 'partial' | 'completed' | 'missed' | 'skip_allowed';
  planned_minutes: number;
  actual_minutes: number;
  reflection?: string;
  mood?: number;
  difficulty?: number;
  tasks: Task[];
}

// Get today's tasks
export async function getTodaysTasks(journeyId: string): Promise<DayRecord> {
  return fetchAPI<DayRecord>(`/journeys/${journeyId}/today`);
}

// Get specific day
export async function getDayRecord(journeyId: string, dayNumber: number): Promise<DayRecord> {
  return fetchAPI<DayRecord>(`/journeys/${journeyId}/days/${dayNumber}`);
}

// Generate tasks for a day
export async function generateDayTasks(
  journeyId: string,
  dayNumber: number,
  tasks: Array<{ title: string; description?: string; type: string; duration: number }>
): Promise<DayRecord> {
  return fetchAPI<DayRecord>(`/journeys/${journeyId}/days/${dayNumber}/generate-tasks`, {
    method: 'POST',
    body: JSON.stringify({ tasks }),
  });
}

// Complete a task
export async function completeTask(
  taskId: string,
  quality?: string,
  notes?: string
): Promise<{ task: Task; day_status: string; completion_rate: number }> {
  return fetchAPI(`/tasks/${taskId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ quality, notes }),
  });
}

// Uncomplete a task
export async function uncompleteTask(taskId: string): Promise<Task> {
  return fetchAPI<Task>(`/tasks/${taskId}/uncomplete`, {
    method: 'POST',
  });
}

// ============================================
// STREAK API
// ============================================

export interface StreakInfo {
  id: string;
  current_streak: number;
  longest_streak: number;
  last_active_date: string;
  grace_days_used: number;
  grace_days_allowed: number;
}

// Get streak info
export async function getStreak(journeyId: string): Promise<StreakInfo> {
  return fetchAPI<StreakInfo>(`/journeys/${journeyId}/streak`);
}

// Use a grace day
export async function useGraceDay(journeyId: string, reason: string): Promise<void> {
  await fetchAPI(`/journeys/${journeyId}/grace-day`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ============================================
// HEALTH CHECK
// ============================================

export async function checkHealth(): Promise<{ status: string; database: string }> {
  return fetchAPI('/health');
}
