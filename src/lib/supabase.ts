/**
 * Supabase Client Configuration
 *
 * Set up environment variables in .env:
 * VITE_SUPABASE_URL=your_project_url
 * VITE_SUPABASE_ANON_KEY=your_anon_key
 */

import { createClient, type Session } from '@supabase/supabase-js';
import { env } from '@config/env';

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// supabase.auth.getSession() serializes across tabs via the Web Locks API in the
// browser. A tab that died mid-refresh (killed dev server, hard reload, HMR) can
// leave that lock held, and every later getSession() call in ANY tab hangs
// forever — no error, no rejection, just a promise that never settles. Bound it
// here once so every caller (auth init, proxyFetch, etc.) degrades to "no
// session" instead of hanging the whole app.
const GET_SESSION_TIMEOUT_MS = 5000;

export async function getSessionSafe() {
  return Promise.race([
    supabase.auth.getSession(),
    new Promise<null>(resolve => {
      setTimeout(() => {
        console.warn('[supabase] getSession() timed out after', GET_SESSION_TIMEOUT_MS, 'ms — a stuck cross-tab auth lock is the likely cause; treating as no session');
        resolve(null);
      }, GET_SESSION_TIMEOUT_MS);
    }),
  ]);
}

// Types for database tables
export interface Profile {
  id: string;
  full_name: string | null;
  location: string | null;
  bio: string | null;
  persona_traits: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal_analysis: Record<string, unknown> | null;
  status: 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface GoalStone {
  id: string;
  goal_id: string;
  question: string;
  answer: string;
  impact_data: Record<string, unknown> | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
}

export interface Roadmap {
  id: string;
  goal_id: string;
  phases: Record<string, unknown>;
  config: Record<string, unknown> | null;
  created_at: string;
}

export interface DailyTaskRecord {
  id: string;
  roadmap_id: string;
  day_number: number;
  title: string;
  content: Record<string, unknown>;
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
  try {
    // First check if there's an active session
    const result = await getSessionSafe();
    const session = result?.data.session;
    if (!session) {
      return null; // No session, user not logged in
    }

    // If session exists, get the user
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      // Only log actual errors, not "session missing" errors
      if (error.message !== 'Auth session missing!') {
        console.error('Error getting user:', error);
      }
      return null;
    }
    return user;
  } catch (error) {
    // Silently handle session missing errors
    const err = error as { message?: string };
    if (err.message !== 'Auth session missing!') {
      console.error('Error in getCurrentUser:', error);
    }
    return null;
  }
};

export const signUp = async (email: string, password: string, metadata?: { full_name?: string }) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata
    }
  });

  // Create profile in profiles table after successful signup
  if (!error && data.user) {
    try {
      // Dynamically import to avoid circular dependency
      const { createProfile } = await import('./database');
      await createProfile(data.user.id, metadata?.full_name);
    } catch (profileError) {
      console.error('❌ Failed to create profile:', profileError);
      // Don't fail the signup if profile creation fails
      // Profile can be created later or via database trigger
    }
  }

  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};
