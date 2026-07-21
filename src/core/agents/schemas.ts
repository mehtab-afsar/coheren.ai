/**
 * Zod schemas for LLM/agent output boundaries.
 *
 * The analyses flagged that agent outputs were parsed with `as T` and coerced to
 * defaults rather than validated. These schemas add a declarative contract at the
 * boundary. `safeValidate` reports drift (observability) without throwing, so it
 * can be layered onto the existing coercion incrementally — a mismatch is logged,
 * not crashed. Boundaries can later switch to hard-reject where a safe fallback
 * exists (e.g. task generation has generateFallbackTask).
 */
import { z } from 'zod';

// ── Agent 4 — daily task output ─────────────────────────────────────────────
export const taskStepSchema = z.object({
  stepNumber: z.number().optional(),
  instruction: z.string().min(1),
  duration: z.union([z.string(), z.number()]).optional(),
  tip: z.string().optional(),
});

export const dailyTaskOutputSchema = z.object({
  task: z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    // Model has used both field names historically.
    estimatedMinutes: z.number().optional(),
    duration: z.number().optional(),
    steps: z.array(taskStepSchema).min(1),
    successCriteria: z.union([z.string(), z.object({ primary: z.string() })]).optional(),
    coachTips: z.array(z.string()).optional(),
  }),
});

export type DailyTaskOutput = z.infer<typeof dailyTaskOutputSchema>;

// ── Generic non-throwing validator ──────────────────────────────────────────
export interface ValidateResult<T> {
  ok: boolean;
  data?: T;
  /** Compact list of "path: message" issues when validation fails. */
  issues?: string[];
}

/**
 * Validate `raw` against `schema` WITHOUT throwing. Logs a compact warning on
 * mismatch so LLM-output drift is observable in the console/telemetry. Callers
 * keep their existing coercion/fallback for the failure path.
 */
export function safeValidate<T>(schema: z.ZodType<T>, raw: unknown, label: string): ValidateResult<T> {
  const result = schema.safeParse(raw);
  if (result.success) return { ok: true, data: result.data };
  const issues = result.error.issues.slice(0, 6).map(i => `${i.path.join('.') || '(root)'}: ${i.message}`);
  console.warn(`[schema:${label}] LLM output did not match contract →`, issues.join(' | '));
  return { ok: false, issues };
}
