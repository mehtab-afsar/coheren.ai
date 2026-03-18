/**
 * Node.js shim for src/config/feature-flags.ts
 * Replaces localStorage/import.meta.env with process.env so agents work under tsx/Node.js
 * All AI agent flags default ON for simulation testing.
 */

interface FeatureFlags {
  USE_AI_AGENTS: boolean;
  USE_RAG: boolean;
  USE_RECALIBRATION: boolean;
  LOG_AGENT_RUNS: boolean;
  PUSH_NOTIFICATIONS: boolean;
  DEBUG_PANEL: boolean;
  PREGENERATE_TASKS: boolean;
}

function envFlag(key: keyof FeatureFlags): boolean {
  const envKey = `VITE_FF_${key}`;
  const val = ((process.env as Record<string, string | undefined>)[envKey] ?? '').toLowerCase();
  if (val === 'true' || val === '1') return true;
  if (val === 'false' || val === '0') return false;
  // Defaults: all AI flags ON for testing
  return key !== 'LOG_AGENT_RUNS' && key !== 'PUSH_NOTIFICATIONS';
}

export const flags: Readonly<FeatureFlags> = Object.freeze({
  USE_AI_AGENTS:      envFlag('USE_AI_AGENTS'),
  USE_RAG:            envFlag('USE_RAG'),
  USE_RECALIBRATION:  envFlag('USE_RECALIBRATION'),
  LOG_AGENT_RUNS:     false, // always off in test scripts
  PUSH_NOTIFICATIONS: false,
  DEBUG_PANEL:        false,
  PREGENERATE_TASKS:  envFlag('PREGENERATE_TASKS'),
});

export function resetFlag(_key: keyof FeatureFlags): void { /* no-op in Node.js context */ }
export function resetAllFlags(): void { /* no-op in Node.js context */ }
export function logFlags(): void { console.table(flags); }
