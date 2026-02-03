/**
 * Supabase Client Configuration
 *
 * Set up environment variables in .env:
 * VITE_SUPABASE_URL=your_project_url
 * VITE_SUPABASE_ANON_KEY=your_anon_key
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Types for database tables
export interface Profile {
  id: string;
  full_name: string | null;
  location: string | null;
  bio: string | null;
  persona_traits: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal_analysis: Record<string, any> | null;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface GoalStone {
  id: string;
  goal_id: string;
  question: string;
  answer: string;
  impact_data: Record<string, any> | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
}

export interface Roadmap {
  id: string;
  goal_id: string;
  phases: Record<string, any>;
  config: Record<string, any> | null;
  created_at: string;
}

export interface DailyTaskRecord {
  id: string;
  roadmap_id: string;
  day_number: number;
  title: string;
  content: Record<string, any>;
  is_completed: boolean;
  difficulty_rating: number | null;
  actual_duration: number | null;
  user_comment: string | null;
  completed_at: string | null;
  skipped: boolean;
  skip_reason: 'time' | 'health' | 'difficulty' | 'external' | null;
  created_at: string;
}

// Auth helper functions
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting user:', error);
    return null;
  }
  return user;
};

export const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};
