/**
 * Runtime environment configuration.
 *
 * All VITE_ variables are validated here at startup.
 * Required vars throw immediately so the error is obvious.
 * Optional vars degrade gracefully with a runtime check.
 *
 * SECURITY: provider API keys (Groq / Anthropic / Jina) are NO LONGER read here
 * or shipped to the browser. All LLM/embedding calls go through the `ai-proxy`
 * Supabase Edge Function, which holds the real keys server-side and gates calls
 * behind the user's JWT + a per-user rate limit. See supabase/functions/ai-proxy.
 *
 * Usage:
 *   import { env } from '@config/env';
 *   const base = env.AI_PROXY_URL;
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

/** Read a boolean flag; defaults to `def` when unset. "false"/"0" → false. */
function flag(key: string, def: boolean): boolean {
  const raw = (import.meta.env[key] as string | undefined)?.trim().toLowerCase();
  if (raw === undefined || raw === '') return def;
  return raw !== 'false' && raw !== '0';
}

const SUPABASE_URL = required('VITE_SUPABASE_URL');

export const env = {
  // ── Supabase ──────────────────────────────────────────────────────────────
  SUPABASE_URL,
  SUPABASE_ANON_KEY: required('VITE_SUPABASE_ANON_KEY'),

  // ── AI proxy ──────────────────────────────────────────────────────────────
  /** Base URL of the ai-proxy edge function. All provider calls route through here. */
  AI_PROXY_URL: optional('VITE_AI_PROXY_URL', `${SUPABASE_URL}/functions/v1/ai-proxy`),
  /** Whether Groq (economy/standard) is enabled. Carries NO secret. */
  GROQ_ENABLED:   flag('VITE_GROQ_ENABLED', true),
  /** Whether the Claude strategic tier is enabled. Carries NO secret. */
  CLAUDE_ENABLED: flag('VITE_CLAUDE_ENABLED', false),
  /**
   * @deprecated Always empty. Jina calls now route through ai-proxy, which holds
   * the real key. Retained only so RAG call sites that pass an apiKey arg still
   * compile; jina-client ignores the value.
   */
  JINA_API_KEY: '',

  // ── Web Push (VAPID public key — safe to expose; enables closed-app reminders) ──
  VAPID_PUBLIC_KEY: optional('VITE_VAPID_PUBLIC_KEY'),

  // ── Analytics (PostHog) — optional: silently disabled if not set ─────────
  POSTHOG_KEY:  optional('VITE_POSTHOG_KEY'),
  POSTHOG_HOST: optional('VITE_POSTHOG_HOST', 'https://app.posthog.com'),

  // ── Error monitoring (Sentry) — optional: silently disabled if not set ───
  SENTRY_DSN: optional('VITE_SENTRY_DSN'),

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
      `  AI proxy : ${env.AI_PROXY_URL}`,
      `  Groq     : ${env.GROQ_ENABLED   ? '✓ enabled' : '✗ disabled'}`,
      `  Claude   : ${env.CLAUDE_ENABLED ? '✓ enabled' : '— disabled'}`,
      `  PostHog  : ${env.POSTHOG_KEY    ? '✓ set' : '— analytics disabled'}`,
      `  Sentry   : ${env.SENTRY_DSN     ? '✓ set' : '— error monitoring disabled'}`,
    ].join('\n');
    console.info(`[env] Environment loaded (${env.MODE}):\n${status}`);
  }

  if (env.IS_PROD && !env.GROQ_ENABLED && !env.CLAUDE_ENABLED) {
    console.error('[env] WARNING: No AI provider enabled (VITE_GROQ_ENABLED / VITE_CLAUDE_ENABLED). AI features will fail.');
  }
}
