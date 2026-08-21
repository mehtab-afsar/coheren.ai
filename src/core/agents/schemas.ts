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
import { ALL_STONE_TYPES } from './stone-identifier/stone-taxonomy';
import type { StoneType } from '@types-app/agents';

const stoneTypeEnum = z.enum(ALL_STONE_TYPES as [StoneType, ...StoneType[]]);

// ── Agent 1 — goal analysis output ──────────────────────────────────────────
export const agent1GoalAnalysisSchema = z.object({
  goalAnalysis: z.object({
    domain: z.string().min(1),
    horizon: z.string().min(1),
    intensity: z.string().min(1),
    clarityScore: z.number().optional(),
    ambiguityScore: z.number().optional(),
    confidence: z.number().optional(),
    smartStatus: z.object({
      specific: z.boolean(), measurable: z.boolean(), achievable: z.boolean(),
      relevant: z.boolean(), timeBound: z.boolean(),
    }).optional(),
    realismChecks: z.object({
      timeRealism: z.string(), effortRealism: z.string(),
    }).optional(),
  }),
});

// ── Agent 2 — stone profile output ──────────────────────────────────────────
export const agent2StoneProfileSchema = z.object({
  stoneProfile: z.object({
    primaryStone: stoneTypeEnum,
    stones: z.array(z.object({
      type: stoneTypeEnum,
      riskImpact: z.number().optional(),
      severity: z.string().optional(),
    })).optional(),
    userArchetype: z.string().optional(),
    confidence: z.number().optional(),
  }),
});

// ── Agent 3 — curriculum roadmap output ─────────────────────────────────────
export const agent3RoadmapSchema = z.object({
  totalDays: z.number().optional(),
  totalWeeks: z.number().optional(),
  totalMonths: z.number().optional(),
  months: z.array(z.object({
    month: z.number().optional(),
    title: z.string().optional(),
    weeks: z.array(z.object({
      week: z.number().optional(),
      days: z.array(z.object({
        day: z.number().optional(),
        type: z.string().optional(),
      })).optional(),
    })).optional(),
  })),
});

// ── Agent 5 — weekly recalibration output ───────────────────────────────────
export const agent5RecalibratedWeekSchema = z.object({
  checkpointAnalysis: z.object({
    overallMastery: z.string().optional(),
    paceAdjustment: z.string().optional(),
  }),
  recalibratedWeek: z.object({
    weekNumber: z.number().optional(),
    startDay: z.number().optional(),
    endDay: z.number().optional(),
    days: z.array(z.object({
      day: z.number().optional(),
      type: z.string().optional(),
    })).optional(),
  }),
});

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

// ── Eval judge output (golden eval set — LLM-as-judge scoring) ─────────────
// Not part of the live agent pipeline — used by scripts/eval-golden-curriculum.ts
// to score generated curricula/tasks for groundedness, safety, and pedagogy.
const judgeDimensionSchema = z.object({
  score: z.number().min(1).max(5),
  rationale: z.string().min(10),
});

export const judgeOutputSchema = z.object({
  groundedness: judgeDimensionSchema,
  domainSafetyAppropriateness: judgeDimensionSchema,
  stoneFit: judgeDimensionSchema,
  pedagogicalSoundness: judgeDimensionSchema,
  specificity: judgeDimensionSchema,
  hallucinatedClaims: z.array(z.string()).optional(),
  overallVerdict: z.enum(['ship', 'revise', 'block']),
  summary: z.string().min(10),
});

export type JudgeOutput = z.infer<typeof judgeOutputSchema>;

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
