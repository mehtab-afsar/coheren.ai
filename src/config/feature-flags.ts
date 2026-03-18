/**
 * Feature Flags
 *
 * Centralized feature toggle system.
 * Precedence: localStorage override > env var > default
 *
 * Usage: import { flags } from '@config/feature-flags';
 * Override: localStorage.setItem('ff_USE_AI_AGENTS', 'false') then reload
 * Or via URL: ?ff_USE_AI_AGENTS=false (auto-sets localStorage)
 */

interface FeatureFlags {
  /** Use AI agent pipeline (Agents 1-5). If false, use static fallback generators. */
  USE_AI_AGENTS: boolean;
  /** Enable RAG semantic retrieval for task generation context. */
  USE_RAG: boolean;
  /** Enable checkpoint recalibration (Agent 5). If false, skip recalibration. */
  USE_RECALIBRATION: boolean;
  /** Enable agent logging to Supabase agent_logs table. */
  LOG_AGENT_RUNS: boolean;
  /** Enable push notifications. */
  PUSH_NOTIFICATIONS: boolean;
  /** Show debug panel access (via ?debug=agents). */
  DEBUG_PANEL: boolean;
  /** Enable pre-generating next-day tasks in background. */
  PREGENERATE_TASKS: boolean;
}

const DEFAULTS: FeatureFlags = {
  USE_AI_AGENTS:      true,
  USE_RAG:            true,
  USE_RECALIBRATION:  true,
  LOG_AGENT_RUNS:     true,
  PUSH_NOTIFICATIONS: true,
  DEBUG_PANEL:        true,
  PREGENERATE_TASKS:  true,
};

const LS_PREFIX = 'ff_';

function resolveFlag(key: keyof FeatureFlags): boolean {
  // 1. localStorage override
  const lsValue = localStorage.getItem(`${LS_PREFIX}${key}`);
  if (lsValue === 'true') return true;
  if (lsValue === 'false') return false;

  // 2. env var (VITE_FF_<FLAG_NAME>)
  const envKey = `VITE_FF_${key}`;
  const envValue = (import.meta.env[envKey] as string | undefined)?.trim().toLowerCase();
  if (envValue === 'true' || envValue === '1') return true;
  if (envValue === 'false' || envValue === '0') return false;

  // 3. Default
  return DEFAULTS[key];
}

/** Apply URL-based overrides: ?ff_USE_AI_AGENTS=false */
function applyUrlOverrides(): void {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  let changed = false;
  for (const key of Object.keys(DEFAULTS)) {
    const urlValue = params.get(`${LS_PREFIX}${key}`);
    if (urlValue === 'true' || urlValue === 'false') {
      localStorage.setItem(`${LS_PREFIX}${key}`, urlValue);
      changed = true;
    }
  }
  if (changed) {
    // Remove ff_ params from URL to clean up
    for (const key of Object.keys(DEFAULTS)) {
      params.delete(`${LS_PREFIX}${key}`);
    }
    const cleanUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', cleanUrl);
  }
}

// Apply URL overrides on module load
applyUrlOverrides();

/** Resolved feature flags (read-only). */
export const flags: Readonly<FeatureFlags> = Object.freeze(
  Object.fromEntries(
    (Object.keys(DEFAULTS) as (keyof FeatureFlags)[]).map(key => [key, resolveFlag(key)])
  ) as FeatureFlags
);

/** Reset a flag to default (remove localStorage override). */
export function resetFlag(key: keyof FeatureFlags): void {
  localStorage.removeItem(`${LS_PREFIX}${key}`);
}

/** Reset all flags to defaults. */
export function resetAllFlags(): void {
  for (const key of Object.keys(DEFAULTS)) {
    localStorage.removeItem(`${LS_PREFIX}${key}`);
  }
}

/** Log current flag state (useful in dev console). */
export function logFlags(): void {
  console.table(
    Object.fromEntries(
      (Object.keys(DEFAULTS) as (keyof FeatureFlags)[]).map(key => [
        key,
        {
          value: flags[key],
          source: localStorage.getItem(`${LS_PREFIX}${key}`) != null ? 'localStorage'
            : (import.meta.env[`VITE_FF_${key}`] as string | undefined) ? 'env'
            : 'default',
        },
      ])
    )
  );
}
