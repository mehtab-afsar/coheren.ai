/**
 * Node.js shim for src/config/env.ts
 * Replaces import.meta.env with process.env so agents work under tsx/Node.js
 */

function get(key: string): string {
  return ((process.env as Record<string, string | undefined>)[key] ?? '').trim();
}

export const env = {
  SUPABASE_URL:       get('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY:  get('VITE_SUPABASE_ANON_KEY'),
  OPENROUTER_API_KEY: get('VITE_OPENROUTER_API_KEY'),
  GROQ_API_KEY:       get('VITE_GROQ_API_KEY'),
  JINA_API_KEY:       get('VITE_JINA_API_KEY'),
  POSTHOG_KEY:        get('VITE_POSTHOG_KEY'),
  POSTHOG_HOST:       get('VITE_POSTHOG_HOST') || 'https://app.posthog.com',
  IS_PROD: false,
  IS_DEV:  true,
  MODE:    'development',
} as const;

export function validateEnv(): void { /* no-op in Node.js/tsx context */ }
