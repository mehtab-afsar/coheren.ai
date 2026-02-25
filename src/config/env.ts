/**
 * Runtime environment configuration.
 *
 * All VITE_ variables are validated here at startup.
 * Required vars throw immediately so the error is obvious.
 * Optional vars degrade gracefully with a runtime check.
 *
 * Usage:
 *   import { env } from '@config/env';
 *   const client = new Groq({ apiKey: env.GROQ_API_KEY });
 */

function required(key: string): string {
  const value = import.meta.env[key] as string | undefined;
  if (!value || value.trim() === '') {
    throw new Error(
      `[env] Missing required environment variable: ${key}\n` +
      `Add it to your .env file (dev) or deployment environment (prod).`
    );
  }
  return value.trim();
}

function optional(key: string, fallback = ''): string {
  const value = import.meta.env[key] as string | undefined;
  return value?.trim() || fallback;
}

export const env = {
  // ── Supabase ──────────────────────────────────────────────────────────────
  SUPABASE_URL:      required('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: required('VITE_SUPABASE_ANON_KEY'),

  // ── AI providers ─────────────────────────────────────────────────────────
  /** Primary reasoning model router (OpenRouter) */
  OPENROUTER_API_KEY: optional('VITE_OPENROUTER_API_KEY'),
  /** Economy-tier local inference (Groq) */
  GROQ_API_KEY:       optional('VITE_GROQ_API_KEY'),

  // ── RAG / embeddings ─────────────────────────────────────────────────────
  JINA_API_KEY: optional('VITE_JINA_API_KEY'),

  // ── Analytics (PostHog) — optional: silently disabled if not set ─────────
  POSTHOG_KEY:  optional('VITE_POSTHOG_KEY'),
  POSTHOG_HOST: optional('VITE_POSTHOG_HOST', 'https://app.posthog.com'),

  // ── Convenience ───────────────────────────────────────────────────────────
  IS_PROD: import.meta.env.PROD === true,
  IS_DEV:  import.meta.env.DEV  === true,
  MODE:    import.meta.env.MODE as string,
} as const;

/**
 * Validates all *required* vars upfront and logs a summary.
 * Call this once in main.tsx before rendering.
 */
export function validateEnv(): void {
  // Required vars are already validated by `required()` above (throws on read).
  // This function provides an explicit startup log in dev mode.
  if (env.IS_DEV) {
    const status = [
      `  Supabase : ${env.SUPABASE_URL}`,
      `  OpenRouter: ${env.OPENROUTER_API_KEY ? '✓ set' : '✗ missing (optional)'}`,
      `  Groq     : ${env.GROQ_API_KEY       ? '✓ set' : '✗ missing (optional)'}`,
      `  Jina     : ${env.JINA_API_KEY       ? '✓ set' : '✗ missing (optional)'}`,
      `  PostHog  : ${env.POSTHOG_KEY        ? '✓ set' : '— analytics disabled'}`,
    ].join('\n');
    console.info(`[env] Environment loaded (${env.MODE}):\n${status}`);
  }

  // In production, warn if no AI key is configured at all
  if (env.IS_PROD && !env.OPENROUTER_API_KEY && !env.GROQ_API_KEY) {
    console.error('[env] WARNING: No AI API key set (VITE_OPENROUTER_API_KEY or VITE_GROQ_API_KEY). AI features will fail.');
  }
}
