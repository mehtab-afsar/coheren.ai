/**
 * Agent Tools — Change 2 (Agent Tool Use)
 *
 * Tool schemas and handlers for Agent 3 (Curriculum Builder) and
 * Agent 5 (Recalibrator). These replace hardcoded injected matrices
 * with LLM-queryable knowledge — the agent calls a tool, reads the
 * result, and reasons about applying it rather than echoing text.
 *
 * Three layers of tools:
 *   Agent 3: pedagogy frameworks, stone interventions, behavioral search
 *   Agent 5: performance signal computation, behavioral context, stone directives
 *
 * Handlers are pure functions (no side effects except the RAG ones which
 * call Supabase). They're registered in callAgentToolLoop() below.
 */

import type { ClaudeToolSchema } from './claude-client';
import type { CompletedTaskFeedback, StoneType } from '@types-app/agents';
import { computeSignals, DEFAULT_THRESHOLDS } from '@core/agents/recalibrator';
import { retrieveBehavioralPatterns } from '@core/rag/behavioral-retriever';
import {
  ALL_STONE_TYPES,
  STONE_MODIFICATIONS,
  STONE_RECALIBRATION_MATRIX,
  type RecalibrationStatus,
} from '@core/agents/stone-identifier/stone-taxonomy';

// Single source of truth for the stone-type list shown to the LLM in tool
// descriptions below — built from the canonical taxonomy so it can't drift out
// of sync with STONE_MODIFICATIONS/STONE_RECALIBRATION_MATRIX the way the old
// hardcoded 8-stone description did (it still listed the removed 'ExternalObstacles').
const STONE_TYPE_LIST = ALL_STONE_TYPES.join(', ');

// ═══════════════════════════════════════════════════════════════════════════════
// AGENT 3 — Curriculum Builder tools
// ═══════════════════════════════════════════════════════════════════════════════

const PEDAGOGY_FRAMEWORKS: Record<string, string> = {
  Cognitive: `Framework: Spaced Repetition + Interleaving
Phase structure: Foundation (mental models) → Active Recall (retrieval practice) → Interleaving (mixed topics) → Application (real problems) → Mastery (teach-back).
Session design: 25-min focused blocks, review prior day's material first (5 min). One full review day per week — no new material.
Evidence: Roediger & Karpicke (2006) retrieval practice effect; Kornell & Bjork (2008) interleaving advantage.`,

  Kinesthetic: `Framework: Sports Periodization (Foundation → Development → Performance → Deload)
Phase structure: Foundation (technique, form, low volume 30-40%) → Development (volume then intensity 50-70%) → Performance (peak intensity 80-95%).
Deload rule: reduced-volume week every 4th week (50% volume, same technique focus). Never increase volume AND intensity in the same week.
Evidence: Bompa & Haff periodization model; NSCA progressive overload principles.`,

  Career: `Framework: Build → Signal → Connect → Convert
Phase structure: Skill Gap Closure → Portfolio Building (2-3 proof-of-work artifacts) → Signaling (online presence, referrals) → Active Conversion (applications, interviews).
Rule: each phase must produce a tangible artifact. Parallel networking throughout phases.
Evidence: Newport "So Good They Can't Ignore You" skills-first model; Herminia Ibarra identity-shift research.`,

  Financial: `Framework: Knowledge Laddering + Gradual Exposure
Phase structure: Financial Foundations (mechanics, no money yet) → Paper Trading (simulation) → Small Position Entry (emotional management) → Systematic Scaling (automate, increase methodically).
Gate rule: no advancing to next phase until prior phase knowledge criteria met.
Evidence: Kahneman loss aversion research; Dollar-cost averaging meta-analyses.`,

  Creative: `Framework: Divergent → Convergent Cycles
Phase structure: Exploration (volume over quality, X pieces regardless of quality) → Technique Acquisition (study masters, deconstruct) → Project-Based (one cohesive project) → Publication/Release (ship, external feedback).
Rule: production quota required — never let perfectionism block output.
Evidence: Ericsson deliberate practice; Csikszentmihalyi flow in creative work.`,

  Health: `Framework: Behavioral Activation + Habit Stacking
Phase structure: Baseline Establishment (track without changing) → Micro-Habit Introduction (tiny changes, stack onto existing routines) → Consolidation (scale habits) → Identity Integration (behavior becomes identity).
Rule: sleep, nutrition, and movement compound — track all three.
Evidence: BJ Fogg Tiny Habits; Wood & Neal habit formation research.`,

  Lifestyle: `Framework: Keystone Habit + Identity Anchoring
Phase structure: Environment Design (redesign cues) → Keystone Habit Lock-In (one cornerstone habit) → Routine Architecture (daily/weekly templates) → Identity Cementing (language shift, systems audit).
Evidence: Duhigg "The Power of Habit"; Wendy Wood habit formation research.`,

  Hybrid: `Framework: Parallel Track with Integration Points
Phase structure: Foundation phase for both tracks simultaneously (reduced volume) → Primary track 60-70% / Secondary 30-40% → Integration Phases (projects requiring both skills).
Rule: never let time split drop below 25% for either track.`,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL SCHEMA DEFINITIONS (Claude format)
// ═══════════════════════════════════════════════════════════════════════════════

// Agent 3 tools
export const CURRICULUM_TOOL_SCHEMAS: ClaudeToolSchema[] = [
  {
    name:        'get_pedagogy_framework',
    description: 'Retrieve the evidence-based pedagogical framework for a learning domain. Call this first to understand how to structure phases.',
    input_schema: {
      type:       'object',
      properties: {
        domain: { type: 'string', description: 'Learning domain: Cognitive, Kinesthetic, Career, Financial, Creative, Health, Lifestyle, or Hybrid' },
        phase:  { type: 'number', description: 'Optional: specific phase number to get focused guidance for' },
      },
      required: ['domain'],
    },
  },
  {
    name:        'get_stone_interventions',
    description: 'Retrieve concrete curriculum modifications for a detected behavioral stone. Call this for each stone in the profile.',
    input_schema: {
      type:       'object',
      properties: {
        stoneType: { type: 'string', description: `Stone type: ${STONE_TYPE_LIST}` },
        severity:  { type: 'string', description: 'Stone severity: low, medium, high' },
        domain:    { type: 'string', description: 'Learning domain for context' },
      },
      required: ['stoneType'],
    },
  },
  {
    name:        'search_behavioral_knowledge',
    description: 'Search behavioral science research relevant to this user profile. Use for habit formation, motivation, or domain-specific learning science.',
    input_schema: {
      type:       'object',
      properties: {
        query:      { type: 'string', description: 'Search query' },
        stoneTypes: { type: 'array', items: { type: 'string' }, description: 'Stone types to boost relevance' },
      },
      required: ['query'],
    },
  },
];

// Agent 5 tools
export const RECALIBRATOR_TOOL_SCHEMAS: ClaudeToolSchema[] = [
  {
    name:        'compute_performance_signals',
    description: 'Compute structured performance signals from raw task history. Always call this first — do not attempt to compute stats yourself.',
    input_schema: {
      type:       'object',
      properties: {
        tasks:       { type: 'array', description: 'Array of completed task feedback records' },
        dailyBudget: { type: 'number', description: 'User daily time budget in minutes' },
      },
      required: ['tasks', 'dailyBudget'],
    },
  },
  {
    name:        'get_stone_recalibration_directives',
    description: 'Get evidence-based recalibration directives for a stone type + status combination.',
    input_schema: {
      type:       'object',
      properties: {
        stoneType:    { type: 'string', description: 'Primary stone type' },
        status:       { type: 'string', description: 'Recalibration status: ACCELERATE, MAINTAIN, SIMPLIFY, or RECOVER' },
      },
      required: ['stoneType', 'status'],
    },
  },
  {
    name:        'retrieve_behavioral_context',
    description: 'Retrieve what worked for this user in past sprints and what patterns were observed. Call this to ground your recommendations in actual history.',
    input_schema: {
      type:       'object',
      properties: {
        query:        { type: 'string', description: 'Semantic query for relevant behavioral memories' },
        primaryStone: { type: 'string', description: 'Primary stone type for context' },
        domain:       { type: 'string', description: 'Learning domain' },
      },
      required: ['query'],
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the tool handler for Agent 3 tools.
 * Returns a function: (toolName, input) => Promise<string>
 */
export function makeCurriculumToolHandler(
  ragFn?: (query: string) => Promise<string>,
): (name: string, input: Record<string, unknown>) => Promise<string> {
  return async (name, input) => {
    switch (name) {
      case 'get_pedagogy_framework': {
        const domain  = String(input.domain ?? '');
        const framework = PEDAGOGY_FRAMEWORKS[domain] ?? PEDAGOGY_FRAMEWORKS.Cognitive;
        const phaseNote = input.phase
          ? `\n\nFor Phase ${input.phase} specifically: focus on the corresponding phase bullet above.`
          : '';
        return framework + phaseNote;
      }

      case 'get_stone_interventions': {
        const stoneType = String(input.stoneType ?? '');
        const severity  = String(input.severity  ?? 'medium');
        const domain    = String(input.domain    ?? '');
        const base = STONE_MODIFICATIONS[stoneType]
          ?? `Apply standard ${stoneType} interventions: reduce friction, increase support scaffolding.`;
        const severityNote = severity === 'high'
          ? '\nSeverity HIGH: apply all modifications aggressively. Prioritise stone management over content progression.'
          : severity === 'low'
            ? '\nSeverity LOW: apply modifications lightly. Do not let stone management slow content progression significantly.'
            : '';
        const domainNote = domain
          ? `\nDomain context (${domain}): ensure modifications fit ${domain} activity types.`
          : '';
        return base + severityNote + domainNote;
      }

      case 'search_behavioral_knowledge': {
        const query = String(input.query ?? '');
        if (ragFn) {
          try { return await ragFn(query); } catch { /* fall through */ }
        }
        return `Behavioral science context for "${query}": habit formation requires consistency over intensity; motivation follows action (not the reverse); behavioural change is more durable when tied to identity, not outcomes.`;
      }

      default:
        return `Unknown tool: ${name}`;
    }
  };
}

/**
 * Build the tool handler for Agent 5 tools.
 */
export function makeRecalibratorToolHandler(
  tasks: CompletedTaskFeedback[],
  dailyBudget: number,
): (name: string, input: Record<string, unknown>) => Promise<string> {
  return async (name, input) => {
    switch (name) {
      case 'compute_performance_signals': {
        // Use existing deterministic computeSignals() — keeps math out of LLM
        const signals = computeSignals(tasks, dailyBudget, DEFAULT_THRESHOLDS);
        return JSON.stringify({
          completionRate:   signals.completionRate.toFixed(1) + '%',
          avgDifficulty:    signals.avgDifficulty.toFixed(2),
          consecutiveSkips: signals.consecutiveSkips,
          healthSkips:      signals.healthSkips,
          difficultySkips:  signals.difficultySkips,
          timeSkips:        signals.timeSkips,
          hardDays:         signals.hardDays,
          easyDays:         signals.easyDays,
          strugglingAreas:  signals.strugglingAreas,
          masteringAreas:   signals.masteringAreas,
          recommendedStatus: signals.status,
        }, null, 2);
      }

      case 'get_stone_recalibration_directives': {
        const stoneType = String(input.stoneType ?? '') as StoneType;
        const status    = String(input.status    ?? 'MAINTAIN') as RecalibrationStatus;
        const stoneMap  = STONE_RECALIBRATION_MATRIX[stoneType];
        if (!stoneMap) return `No specific directives for ${stoneType}. Apply ${status} recalibration strategy — reduce scope on SIMPLIFY/RECOVER, increase challenge on ACCELERATE.`;
        return stoneMap[status] ?? `Apply ${status} strategy for ${stoneType}: focus on the behavioral pattern and adapt pace accordingly.`;
      }

      case 'retrieve_behavioral_context': {
        const query       = String(input.query       ?? '');
        const primaryStone = String(input.primaryStone ?? '');
        const domain      = String(input.domain      ?? '');
        try {
          const result = await retrieveBehavioralPatterns({
            query,
            domain:     domain || undefined,
            matchCount: 3,
          });
          return result || `No behavioral history found for "${query}" (stone: ${primaryStone}, domain: ${domain}). Proceed with general evidence-based recommendations.`;
        } catch {
          return 'Behavioral context unavailable — proceed with general recommendations.';
        }
      }

      default:
        return `Unknown tool: ${name}`;
    }
  };
}
