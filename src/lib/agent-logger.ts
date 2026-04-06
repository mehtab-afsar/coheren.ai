/**
 * Agent Logger — writes structured logs to the agent_logs table.
 *
 * Non-blocking: all writes are fire-and-forget so they never slow down the pipeline.
 * Output is trimmed to 10 KB to avoid bloating the JSONB column.
 */

import { supabase } from './supabase';
import { flags } from '@config/feature-flags';

export interface AgentLogEntry {
  userId?: string;
  goalId?: string;
  agentName: string;
  runType?: 'onboarding' | 'checkpoint' | 'daily_task' | 'early_recal' | 'micro_recalibration' | 'shadow';
  input?: unknown;
  output?: unknown;
  latencyMs: number;
  modelUsed?: string;
  tokenCount?: number;
  success: boolean;
  errorMsg?: string;
  metadata?: Record<string, unknown>;
  // v2 fields (5.8)
  pipelineId?: string;
  wave?: number;
  inputTokens?: number;
  outputTokens?: number;
  checkpointRestored?: boolean;
  contextSizeTokens?: number;
}

const MAX_OUTPUT_BYTES = 10_000;

function trimOutput(output: unknown): unknown {
  if (output == null) return null;
  const json = JSON.stringify(output);
  if (json.length <= MAX_OUTPUT_BYTES) return output;
  // Truncate and mark as trimmed
  return { _trimmed: true, preview: json.slice(0, MAX_OUTPUT_BYTES) };
}

function hashInput(input: unknown): string | null {
  if (input == null) return null;
  // Simple FNV-1a hash for dedup (no crypto dependency needed in browser)
  const str = JSON.stringify(input);
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * Log an agent invocation. Fire-and-forget — never throws.
 * Gated behind the LOG_AGENT_RUNS feature flag.
 */
export function logAgentRun(entry: AgentLogEntry): void {
  if (!flags.LOG_AGENT_RUNS) return;
  const row = {
    user_id: entry.userId ?? null,
    goal_id: entry.goalId ?? null,
    agent_name: entry.agentName,
    run_type: entry.runType ?? 'onboarding',
    input_hash: hashInput(entry.input),
    output_json: trimOutput(entry.output),
    latency_ms: entry.latencyMs,
    model_used: entry.modelUsed ?? null,
    token_count: entry.tokenCount ?? null,
    success: entry.success,
    error_msg: entry.errorMsg ?? null,
    metadata: entry.metadata ?? {},
    // v2 fields
    pipeline_id: entry.pipelineId ?? null,
    wave: entry.wave ?? null,
    input_tokens: entry.inputTokens ?? null,
    output_tokens: entry.outputTokens ?? null,
    checkpoint_restored: entry.checkpointRestored ?? false,
    context_size_tokens: entry.contextSizeTokens ?? null,
  };

  Promise.resolve(
    supabase.from('agent_logs').insert(row)
  ).then(({ error }) => {
    if (error) console.warn('Agent log write failed:', error.message);
  }).catch((_err) => {
    // Silently ignore network errors (e.g. agent_logs table missing in dev)
  });
}

/**
 * Helper to wrap an agent call with automatic logging.
 * Optional extra param accepts v2 pipeline metadata (pipelineId, wave, checkpointRestored).
 */
export async function withAgentLogging<T>(
  entry: Omit<AgentLogEntry, 'latencyMs' | 'success' | 'output' | 'errorMsg'>,
  fn: () => Promise<T>,
  extra?: Pick<AgentLogEntry, 'pipelineId' | 'wave' | 'checkpointRestored'>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    logAgentRun({
      ...entry,
      ...extra,
      latencyMs: Math.round(performance.now() - start),
      success: true,
      output: result,
    });
    return result;
  } catch (err) {
    logAgentRun({
      ...entry,
      ...extra,
      latencyMs: Math.round(performance.now() - start),
      success: false,
      errorMsg: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
