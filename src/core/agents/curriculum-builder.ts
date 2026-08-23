/**
 * Agent 3: Curriculum Builder
 *
 * Responsibilities:
 *   - Transform goal analysis + stone profile into a phased learning roadmap
 *   - Apply domain-specific pedagogical frameworks (periodization, spaced repetition, etc.)
 *   - Surgically modify the curriculum based on each detected stone
 *   - Inject science-backed rationale from the RAG into each phase
 *   - Output a validated, structured Roadmap consumed by Agent 4 (Task Generator)
 *
 * Inputs:
 *   - Agent 1 output: GoalAnalysis (domain, complexity, horizon, constraints)
 *   - Agent 2 output: StoneProfile (stones + agent3Guidance from the psychologist)
 *   - RAG context: science passages retrieved semantically for this specific goal
 *
 * Rules:
 *   - 70b model — roadmap quality is worth the cost; errors here cascade through all tasks
 *   - Temperature 0.3 — structured but allows natural phase naming
 *   - Always validate and normalize output before returning
 *   - Phase count is derived from horizon, never left to the LLM
 */

import type {
  Agent1Output,
  Agent2ProfileOutput,
  Agent3Output,
  AgentContext,
  Phase,
  Roadmap,
  ReviewMoment,
  CurriculumPreview,
  CurriculumPreviewTask,
  CurriculumSkeleton,
  CompetencyGate,
  PaceCalibration,
  PaceChoice,
} from '@types-app/agents';
import type { AgentRoadmapV2, WeekPlan, WeekDay, MonthPlan } from '@core/store/useStore';
import { callPremiumStream, callStrategicWithThinking, callStrategicWithTools } from '@lib/ai-router';
import { retrieveKnowledgeSemantic } from '@core/rag/semantic-retriever';
import { flags } from '@config/feature-flags';
import { parseAgentJSON } from './llm-output';
import { agent3RoadmapSchema, safeValidate } from './schemas';
import { SEVERITY_SORT_ORDER, STONE_MODIFICATIONS } from './stone-identifier/stone-taxonomy';

// Agent3Output now returns AgentRoadmapV2 for the new hierarchical roadmap
export type Agent3OutputV2 = AgentRoadmapV2;

// Re-export WeekPlan / WeekDay / MonthPlan for consumers
export type { WeekPlan, WeekDay, MonthPlan };

// ─── Domain Pedagogy Map ──────────────────────────────────────────────────────
// Each domain has a research-backed pedagogical framework that determines
// how phases are structured. This is injected into the system prompt.

const DOMAIN_PEDAGOGY: Record<string, string> = {
  Cognitive: `
PEDAGOGICAL FRAMEWORK: Spaced Repetition + Interleaving
- Phase 1 (Foundation): Build mental models. Read, watch, take notes. No testing yet.
- Phase 2 (Active Recall): Close the book. Practice retrieval. Flashcards, practice problems.
- Phase 3 (Interleaving): Mix topics. Do not block-practice. Interleave related concepts.
- Phase 4 (Application): Solve real problems under time pressure. Simulate exam/real conditions.
- Phase 5 (Mastery): Teach it. Explain to others. Identify remaining gaps.
Session design: 25-min focused blocks (Pomodoro), review previous day's material first (5 min).
Weekly: One full review day per week where no new material is introduced.`,

  Kinesthetic: `
PEDAGOGICAL FRAMEWORK: Sports Periodization (Foundation → Development → Performance → Deload)
- Phase 1 (Foundation): Technique over intensity. Form drills, mobility, baseline fitness.
  Volume: low. Intensity: 30-40%. Focus: movement patterns, injury prevention.
- Phase 2 (Development): Increase volume first, then intensity. Skill complexity rises.
  Volume: medium-high. Intensity: 50-70%. Focus: skill chains, progressive overload.
- Phase 3 (Performance): Peak intensity. Competition/performance preparation.
  Volume: medium (reduced to allow intensity). Intensity: 80-95%.
- Deload weeks: Insert a reduced-volume week every 4th week (50% volume, same technique focus).
Never increase volume AND intensity in the same week — choose one variable to progress.`,

  Career: `
PEDAGOGICAL FRAMEWORK: Build → Signal → Connect → Convert
- Phase 1 (Skill Gap Closure): Learn the minimum viable skills for the target role/outcome.
- Phase 2 (Portfolio Building): Create 2-3 proof-of-work artifacts that demonstrate competency.
- Phase 3 (Signaling): Optimize presence (LinkedIn, GitHub, portfolio site, referral network).
- Phase 4 (Active Conversion): Applications, outreach, interviews, negotiations.
Each phase must produce a tangible artifact (not just "study"). Parallel networking throughout.`,

  Financial: `
PEDAGOGICAL FRAMEWORK: Knowledge Laddering + Gradual Exposure
- Phase 1 (Financial Foundations): Understand the mechanics before touching money.
- Phase 2 (Paper Trading / Simulation): Practice with no real risk. Build decision muscle.
- Phase 3 (Small Position Entry): Enter with small amounts. Learn emotional management.
- Phase 4 (Systematic Scaling): Automate what works. Increase position size methodically.
Each phase gates the next: no moving to Phase 2 until Phase 1 knowledge criteria are met.`,

  Creative: `
PEDAGOGICAL FRAMEWORK: Divergent → Convergent Cycles
- Phase 1 (Exploration): Wide experimentation. No quality standard. Volume over quality.
  Rule: produce X pieces regardless of how bad they are. Quantity builds taste.
- Phase 2 (Technique Acquisition): Focused skill learning. Study masters. Deconstruct their work.
- Phase 3 (Project-Based): One cohesive project. Apply technique with intentionality.
- Phase 4 (Publication/Release): Ship it. External feedback forces honest self-assessment.
Creative work requires a "production quota" — never let perfection block output.`,

  Health: `
PEDAGOGICAL FRAMEWORK: Behavioral Activation + Habit Stacking
- Phase 1 (Baseline Establishment): Measure current state. Track without changing behavior.
  Identify existing habits to stack new ones onto.
- Phase 2 (Micro-Habit Introduction): Tiny, non-threatening changes. Below effort threshold.
  Link health behaviors to existing routines (after-X-I-will-Y format).
- Phase 3 (Consolidation): Scale the micro-habits. Add complexity and challenge.
- Phase 4 (Identity Integration): The behavior becomes identity, not goal.
Sleep, nutrition, and movement compound — track all three even if only one is the primary goal.`,

  Lifestyle: `
PEDAGOGICAL FRAMEWORK: Keystone Habit + Identity Anchoring
- Phase 1 (Environment Design): Redesign cues and contexts before attempting behavior change.
  Make desired behavior obvious and easy. Make undesired behavior invisible and hard.
- Phase 2 (Keystone Habit Lock-In): Install one cornerstone habit at low intensity.
  Expand ripple effects deliberately (exercise → better eating → better sleep).
- Phase 3 (Routine Architecture): Build daily/weekly templates. Reduce decision fatigue.
- Phase 4 (Identity Cementing): Language shift. Systems audit. Remove remaining friction.`,

  Hybrid: `
PEDAGOGICAL FRAMEWORK: Parallel Track with Integration Points
- Design separate sub-tracks for each domain (max 2 primary tracks).
- Phase 1: Foundation phase for BOTH tracks simultaneously at reduced volume.
- Phase 2+: Primary track gets 60-70% of daily time. Secondary track gets 30-40%.
- Integration Phases: Deliberately combine both domains into projects that require both skills.
- Deload sync: When one track needs recovery, accelerate the other.
Key constraint: Never let time split drop below 25% for either track — below that, one atrophies.`,
};

// ─── Stone × Domain Tiebreakers ──────────────────────────────────────────────
// Fired when a domain's pedagogical framework and a stone's modification rules
// directly conflict. Without these, the LLM resolves conflicts arbitrarily —
// usually by silently ignoring one instruction set.
//
// Each entry is keyed by "Domain:Stone" and injected BEFORE the stone
// modifications in the user prompt, so the LLM reads the resolution first.

const STONE_DOMAIN_TIEBREAKERS: Record<string, string> = {
  'Career:FearOfFailure': `
## TIEBREAKER — Career × FearOfFailure (read BEFORE the Stone Modifications below)

CONFLICT: The Career framework requires tangible "proof of work" artifacts starting Phase 2
and parallel networking throughout — both evaluated/public activities.
FearOfFailure requires removing assessments from Phase 1 and delaying public/evaluated work
to Phase 3 minimum. These directly contradict each other.

RESOLUTION — apply ALL of the following:
1. Redefine "artifact" by phase visibility:
   - Phase 1 artifacts: private drafts — saved locally, never shown to anyone.
   - Phase 2 artifacts: portfolio that EXISTS but is not yet published or shared.
   - Phase 3: first public release (post to LinkedIn, push to GitHub, share portfolio URL).
   - Phase 4: active outreach, applications, interviews.
2. Remove "parallel networking" from Phase 1 and Phase 2.
   Networking begins in Phase 3 only — when the user has something to show.
3. Replace ALL "proof of work" language with "evidence of effort" —
   the artifact proves the user showed up and practised, not that they performed well.
4. Phase 1 and Phase 2 milestones MUST be binary (done / not done), never quality-rated.
   e.g. "Draft exists and is saved" — NOT "Draft is polished enough to share."
5. Apply "experiment" framing to every phase: task titles use "Experiment:" prefix
   through Phase 2. Phase 3+ drops the prefix once public sharing begins.
6. Phase 2 phaseName and primaryGoals must explicitly state:
   "Nothing built here is published yet. This is a private rehearsal."`,

  'Career:Perfectionism': `
## TIEBREAKER — Career × Perfectionism (read BEFORE the Stone Modifications below)

CONFLICT: Career framework requires producing artifacts and signaling competency.
Perfectionism causes indefinite polish loops, blocking artifact completion and publication.

RESOLUTION — apply ALL of the following:
1. Every Phase 2 artifact task must have an explicit "ship it" gate:
   a hard time-box (e.g. "2-hour draft — stop and save at the timer, regardless of quality").
2. Phase 2 phaseName must signal "rough" — e.g. "Rough Portfolio Sprint" not "Portfolio Building."
3. keyMilestones for Phases 2–3 must use completion language, never quality language:
   e.g. "LinkedIn About section exists and is saved" — NOT "LinkedIn profile is polished."
4. Phase 3 (Signaling) must explicitly state: "Publish the imperfect version. Edit after feedback,
   not before. Real-world feedback is the only valid quality signal."
5. adaptationRules.if_completing_easily for all phases: "Publish what you have now — do not refine further."`,
};

// ─── System Prompt ────────────────────────────────────────────────────────────
function buildSystemPrompt(domain: string): string {
  const pedagogy = DOMAIN_PEDAGOGY[domain] ?? DOMAIN_PEDAGOGY['Lifestyle'];

  return `You are Agent 3: Curriculum Architect — a world-class instructional designer.

Your job is to transform a goal analysis and behavioral profile into a structured, month/week/day learning roadmap.
You are NOT a motivational coach. You are an architect designing a building. Every decision must be justified.

## Your Pedagogical Framework for This Goal's Domain
${pedagogy}

## Core Curriculum Principles (apply to ALL domains)
- Progressive Overload: Each month/week is harder than the last. Never plateau.
- Spacing Effect: Review prior material before introducing new material. Never cram.
- Scaffolding: Each month explicitly builds on skills from the prior month.
- Feedback Loops: Every week has a measurable outcome.
- Consolidation before Complexity: Do not add new skills before current skills are stable.
- Weekly Recalibration: Only Week 1 gets fully planned days. All other weeks start tentative and are planned after weekly check-ins.

## Structure Rules (NON-NEGOTIABLE)
- ONLY Week 1 has days[] populated (exactly 7 days). ALL other weeks have days: [].
- Day 7 of each week is ALWAYS type "rest" (recovery/consolidation).
- Week status: week 1 = "current", all others = "tentative".
- Weeks are numbered absolutely across the whole roadmap (Week 1, 2, 3...).
- Days are numbered absolutely across the whole roadmap (Day 1, 2, 3...).
- frameworkReason MUST reference the user's specific stones by name.

OUTPUT FORMAT — return ONLY valid JSON, no markdown:
{
  "totalDays": <number>,
  "totalWeeks": <number>,
  "totalMonths": <number>,
  "domainPedagogy": "<exact framework name>",
  "frameworkName": "<UNIQUE framework name tailored to this user's specific goal and domain — must NOT be generic. Domain examples: Fitness→'Progressive Overload — SAID Principle', Music→'Deliberate Practice — Ericsson Method', Coding→'Project-Based Mastery — PRIMM Cycle', Language→'Comprehensible Input — Krashen Immersion', Engineering/Science→'First Principles Decomposition — Feynman Technique'. Generate one that fits THIS user's goal and detected stones, not a copy of any example.>",
  "frameworkReason": "<2-3 sentences: why this framework for this user's domain AND stones. Reference the stones by name.>",
  "frameworkScience": "<2-3 sentences from the research/science behind this framework>",
  "frameworkSources": [
    { "title": "<book/paper title>", "author": "<author>", "note": "<one sentence on how it was used>" }
  ],
  "months": [
    {
      "month": 1,
      "title": "<Month theme name>",
      "phaseName": "<same as title or phase name>",
      "startDay": 1,
      "endDay": <days in month>,
      "startWeek": 1,
      "endWeek": <last week of month>,
      "primaryGoals": ["<goal 1>", "<goal 2>"],
      "scienceRationale": "<science rationale for this phase>",
      "weeks": [
        {
          "week": 1,
          "title": "<Week 1 focus topic>",
          "theme": "<short description of what this week covers>",
          "startDay": 1,
          "endDay": 7,
          "status": "current",
          "recalibratedFrom": null,
          "days": [
            { "day": 1, "weekDay": 1, "type": "learning", "title": "<day title>", "theme": "<day theme>", "intensity": 0.3, "focusArea": "<focus area>" },
            { "day": 2, "weekDay": 2, "type": "practice", "title": "...", "theme": "...", "intensity": 0.35, "focusArea": "..." },
            { "day": 3, "weekDay": 3, "type": "practice", "title": "...", "theme": "...", "intensity": 0.4, "focusArea": "..." },
            { "day": 4, "weekDay": 4, "type": "reflection", "title": "...", "theme": "...", "intensity": 0.2, "focusArea": "..." },
            { "day": 5, "weekDay": 5, "type": "practice", "title": "...", "theme": "...", "intensity": 0.45, "focusArea": "..." },
            { "day": 6, "weekDay": 6, "type": "challenge", "title": "...", "theme": "...", "intensity": 0.5, "focusArea": "..." },
            { "day": 7, "weekDay": 7, "type": "rest", "title": "Rest & Consolidation", "theme": "Active rest", "intensity": 0.1, "focusArea": "recovery" }
          ]
        },
        {
          "week": 2,
          "title": "<Week 2 tentative topic>",
          "theme": "<Week 2 theme — will be refined after Week 1 check-in>",
          "startDay": 8,
          "endDay": 14,
          "status": "tentative",
          "recalibratedFrom": null,
          "days": []
        },
        { "week": 3, "title": "...", "theme": "...", "startDay": 15, "endDay": 21, "status": "tentative", "recalibratedFrom": null, "days": [] },
        { "week": 4, "title": "...", "theme": "...", "startDay": 22, "endDay": 28, "status": "tentative", "recalibratedFrom": null, "days": [] }
      ]
    }
  ],
  "progressionCurve": {
    "month_1": { "intensity": 0.3, "volume": "low" },
    "month_2": { "intensity": 0.6, "volume": "medium" },
    "month_3": { "intensity": 0.9, "volume": "high" }
  },
  "stoneModificationSummary": "<1-2 sentences>",
  "modifiers_from_stones": {
    "<StoneName>": { "removed": ["..."], "added": ["..."], "modified": ["..."] }
  }
}`;
}

// ─── User Prompt ─────────────────────────────────────────────────────────────

function buildUserPrompt(
  context:             AgentContext,
  goalAnalysis:        Agent1Output,
  stoneProfile:        Agent2ProfileOutput,
  ragContext:          string,
  monthCount:          number,
  adjustedTimeline?:   number,
  habitAutomaticity?:  number,
  mismatchWarning?:    string,
): string {
  const g = goalAnalysis.goalAnalysis;
  const sp = stoneProfile.stoneProfile;

  // Stone modification instructions — severity-weighted
  // Critical/High: full application. Moderate: apply but softer. Low: mention but don't restructure.
  const stoneInstructions = sp.stones
    .sort((a, b) => (SEVERITY_SORT_ORDER[a.severity] ?? 2) - (SEVERITY_SORT_ORDER[b.severity] ?? 2))
    .map(s => {
      const mod = STONE_MODIFICATIONS[s.type];
      if (!mod) return '';
      const severityNote =
        s.severity === 'Critical' ? `\n⚠️ CRITICAL SEVERITY (riskImpact: ${s.riskImpact}) — Apply ALL rules aggressively. This stone WILL derail the plan if ignored.` :
        s.severity === 'High'     ? `\n🔴 HIGH SEVERITY (riskImpact: ${s.riskImpact}) — Apply all rules fully.` :
        s.severity === 'Moderate' ? `\n🟡 MODERATE SEVERITY (riskImpact: ${s.riskImpact}) — Apply rules but with lighter touch. Soft-enforce, don't restructure entire phases.` :
        `\n🟢 LOW SEVERITY (riskImpact: ${s.riskImpact}) — Acknowledge in adaptationRules only. Do not restructure phases for this stone.`;
      return mod + severityNote;
    })
    .filter(Boolean)
    .join('\n');

  // Tiebreakers — fired when a domain + stone combination creates a direct conflict
  const tiebreakers = sp.stones
    .map(s => STONE_DOMAIN_TIEBREAKERS[`${g.domain}:${s.type}`] ?? '')
    .filter(Boolean)
    .join('\n');

  const totalWeeks = Math.ceil(context.timeline / 7);

  // ── Sprint 1: Science-backed context blocks ───────────────────────────────
  const effectiveDays = adjustedTimeline ?? context.timeline;
  const timelineBlock = adjustedTimeline && adjustedTimeline !== context.timeline
    ? `Requested Timeline: ${context.timeline} days
Adjusted Timeline (time-budget scaled): ${adjustedTimeline} days
${mismatchWarning ? `⚠️ TIMELINE MISMATCH: ${mismatchWarning}` : ''}`
    : `Timeline: ${context.timeline} days`;

  const habitBlock = habitAutomaticity
    ? `\nHabit Automaticity Target: Day ${habitAutomaticity} (Lally UCL 2010 — average 66 days, NOT 21). Plan for the "valley of low motivation" at Days 10–21 (hardest period). Do NOT promise habit formation before Day 45.`
    : '';

  const dreyfusBlock = flags.USE_TIMELINE_SCALING ? `
## Dreyfus Phase Split Guidance (use as default, adjust for stones)
Foundation: ~${Math.round(effectiveDays * 0.32)} days (30–35% of timeline)
Development: ~${Math.round(effectiveDays * 0.42)} days (40–45% of timeline)
Mastery:     ~${Math.round(effectiveDays * 0.26)} days (20–30% of timeline)
Stone adjustments: SkillGap(High) → extend Foundation +20%; FearOfFailure → extend Foundation +10%;
Overcommitment → compress Development −10%; selfEfficacy≥8 → compress Foundation −15%;
ChangeStage=contemplation → add Phase 0 (7–14 days) for motivation activation before Foundation.` : '';

  const bctBlock = flags.USE_BCT_DECOMPOSITION && g.goalType === 'behavior_based' ? `
## BCT DECOMPOSITION REQUIRED (behavior-based goal, no pre-built curriculum)
This goal has no standard curriculum. Use Behavior Change Technique (BCT) framework to decompose it:
Step 1: Identify 3–5 Behavioral Primitives (specific cue → behavior chains)
Step 2: Sequence primitives from smallest to largest (Fogg Tiny Habits: never stack until current ≥85% completion for 5 days)
Step 3: Phase 1 = install Primitive 1 only. Phase 2 = Primitive 1 consolidated + introduce Primitive 2. Etc.
Do NOT design a skills curriculum for this goal — it needs behavioral sequencing, not knowledge transfer.` : '';

  const spacedRepBlock = flags.USE_SPACED_REPETITION_SCHEDULE ? `
## Spaced Repetition Week 1 Pattern (Cepeda et al. 2008 — mandatory)
Day 1: New concept (encoding session)
Day 2: 24-hour review of Day 1 (MOST IMPORTANT — first review within 24 hrs)
Day 3: New concept
Day 4: Interleaved review of Days 1 + 3 (3-day spacing for Day 1 concept)
Day 5: Deliberate practice / application
Day 6: Full week review — all concepts interleaved (7-day spacing for Day 1)
Day 7: Rest (hippocampal consolidation — mandatory, never skip)
Mark Day 2/4/6 days as type "retrieval" not "learning".` : '';

  return `Build a ${effectiveDays}-day month/week/day curriculum roadmap with ${monthCount} months.

## Goal Intelligence (from Agent 1)
Goal: "${g.goal}"
Domain: ${g.domain}${g.subDomains.length ? ` + [${g.subDomains.join(', ')}]` : ''}
Complexity: ${g.complexity}
Horizon: ${g.horizon}
Daily Time Available: ${context.dailyTimeAvailable} minutes
${timelineBlock}
Total Weeks: ${totalWeeks}
Constraints: ${g.constraintsDetected.join(', ') || 'None'}
Risks: ${g.risksDetected.join(', ') || 'None'}
Typical Realistic Timeline: ${g.typicalTimeline.realistic}
Key Milestones Agent 1 Identified: ${g.keyMilestones.join(' | ')}
Common Obstacles: ${g.commonObstacles.join(' | ')}${habitBlock}${dreyfusBlock}${bctBlock}${spacedRepBlock}

## Behavioral Signals (from Shadow Extractor)
${context.behavioralFlags && context.behavioralFlags.length > 0
  ? context.behavioralFlags.map(f => {
      const notes: Record<string, string> = {
        past_failure_mentioned: '⚠️ past_failure_mentioned — Begin with very small wins; avoid ambitious starts that mirror previous attempts.',
        conditional_availability: '⚠️ conditional_availability — Build in buffer days and avoid rigid daily streaks; make recovery easy.',
        external_accountability_needed: '⚠️ external_accountability_needed — Include explicit checkpoint milestones and social/sharing moments in the roadmap.',
        low_confidence: '⚠️ low_confidence — Start below the user\'s actual skill level; rapid early wins matter more than efficiency.',
        time_scarcity: '⚠️ time_scarcity — Cap daily tasks strictly at stated time; eliminate any "optional" extensions.',
        perfectionist_tendency: '⚠️ perfectionist_tendency — Introduce "good enough" criteria explicitly; reward completion over quality in early phases.',
      };
      return notes[f] ?? `⚠️ ${f}`;
    }).join('\n')
  : '(No behavioral flags detected — standard delivery applies)'}

## User Psychology (from Agent 2)
Archetype: ${sp.userArchetype}
Primary Stone (highest risk): ${sp.primaryStone}
All Stones: ${sp.stones.map(s => `${s.type} (${s.severity})`).join(', ')}
Agent 2 Guidance for Curriculum:
${sp.agent3Guidance.map(gi => `  - ${gi}`).join('\n')}
Agent 5 Prediction: "${sp.agent5Note}"

${tiebreakers ? `${tiebreakers}

` : ''}## MANDATORY Stone Modifications
Apply ALL of the following modifications to the curriculum:
${stoneInstructions || '(No stones detected — use default curriculum structure)'}

## Scientific Foundation (from Knowledge Base)
${ragContext || '(No RAG context available — use domain pedagogy defaults)'}

CRITICAL RULES:
- Only Week 1 gets populated days[] (7 days exactly). ALL other weeks have days: [].
- Day 7 of each week is always type: "rest" (recovery/consolidation).
- Week status: week 1 = "current", all others = "tentative".
- Weeks are numbered absolutely (Week 1, 2, 3... across the whole roadmap).
- Days are numbered absolutely (Day 1, 2, 3... across the whole roadmap).
- frameworkReason MUST reference the user's specific stones by name: ${sp.stones.map(s => s.type).join(', ')}.
- Return ONLY valid JSON in the format shown in your system prompt. No markdown, no commentary.`;
}

// ─── Month Count Derivation ───────────────────────────────────────────────────

export function computePhaseCount(timeline: number, horizon: string): number {
  if (horizon === 'Short-term' || timeline <= 90)  return 2;
  if (horizon === 'Long-term'  || timeline > 365)  return 4;
  return 3; // Mid-term default
}

// ─── Sprint 1: Research-Backed Helpers ───────────────────────────────────────

/**
 * Adjust the requested timeline based on daily time budget.
 * Formula (sqrt scaling): adjustedTimeline = raw × (60 / dailyMinutes)^0.5
 * Research: square root scaling because doubling time doesn't double learning rate.
 *
 * Examples:
 *   15 min/day for 90-day goal  → 90 × √(60/15) = 90 × 2 = 180 days
 *   30 min/day                  → 90 × √(60/30) = 90 × 1.41 = 127 days
 *   60 min/day (baseline)       → 90 days
 *   120 min/day                 → 90 × √(60/120) = 90 × 0.71 = 64 days
 *
 * Only runs when USE_TIMELINE_SCALING flag is on.
 */
export function computeAdjustedTimeline(
  rawTimeline:  number,
  dailyMinutes: number,
  primaryStone?: string,
  changeStage?:  string,
): { adjustedTimeline: number; mismatchWarning: string | undefined } {
  if (!flags.USE_TIMELINE_SCALING || dailyMinutes <= 0) {
    return { adjustedTimeline: rawTimeline, mismatchWarning: undefined };
  }

  const baseline       = 60; // minutes
  const scalingFactor  = Math.sqrt(baseline / Math.max(dailyMinutes, 5));
  let   adjusted       = Math.round(rawTimeline * scalingFactor);

  // Stone adjustments
  if (primaryStone === 'Inconsistency' || primaryStone === 'ProcrastinationPattern') {
    adjusted = Math.round(adjusted * 1.1); // +10%: these users need more buffer
  }
  if (changeStage === 'contemplation') {
    adjusted = Math.round(adjusted * 1.15); // +15%: motivation activation phase needed
  }

  let mismatchWarning: string | undefined;
  if (adjusted > rawTimeline * 1.1) {
    const extraDays = adjusted - rawTimeline;
    mismatchWarning = `Your current daily time budget (${dailyMinutes} min/day) means this goal realistically needs about ${adjusted} days, not ${rawTimeline}. That's ${extraDays} extra days. You can either extend your timeline, increase daily time, or narrow your goal scope.`;
  }

  return { adjustedTimeline: adjusted, mismatchWarning };
}

/**
 * Estimate the day when the primary habit will reach automaticity.
 * Research: Lally et al., UCL 2010 — average 66 days (range 18–254).
 * The 21-day myth is not supported by research.
 *
 * Adjustments:
 *   - Kinesthetic habits → 45–80 days (physical conditioning adds time)
 *   - Cognitive habits   → 30–66 days (mental habits automate slightly faster)
 *   - Inconsistency stone → push to 90+ days
 *   - 15 min/day sessions → faster automaticity (shorter, more frequent = stronger context cue)
 */
export function computeHabitAutomaticityDay(
  domain:        string,
  primaryStone?: string,
  dailyMinutes?: number,
): number {
  let base = 66; // Lally UCL 2010 average

  if (domain === 'Kinesthetic' || domain === 'Health') base = 72;
  if (domain === 'Cognitive')   base = 55;
  if (domain === 'Lifestyle')   base = 60;

  if (primaryStone === 'Inconsistency')        base = Math.round(base * 1.35); // +35%
  if (primaryStone === 'ProcrastinationPattern') base = Math.round(base * 1.2);  // +20%
  if (primaryStone === 'LowConfidence')        base = Math.round(base * 1.1);

  // Short sessions → stronger context-dependence → slightly faster automaticity
  if (dailyMinutes && dailyMinutes <= 15) base = Math.round(base * 0.9);

  return Math.max(18, Math.min(base, 120));
}

/**
 * Generate science-backed Week 1 day skeletons using spaced repetition.
 * Research: Cepeda et al. (2008) — first review within 24 hours of encoding
 * is the single most impactful spacing rule.
 *
 * Pattern (Mon–Sun):
 *   1 = learning (new concept)
 *   2 = retrieval (24-hr review of Day 1)
 *   3 = learning (new concept)
 *   4 = retrieval (mixed review of Days 1+3)
 *   5 = practice (application / deliberate practice)
 *   6 = reflection (week review — all concepts at Day 1+5 spacing)
 *   7 = rest (hippocampal consolidation)
 *
 * Only fires when USE_SPACED_REPETITION_SCHEDULE is on.
 */
export function buildSpacedRepetitionWeek1(
  startDay: number = 1
): import('@core/store/useStore').WeekDay[] {
  type DayType = import('@core/store/useStore').WeekDay['type'];

  const plan: Array<{ type: DayType; title: string; theme: string; intensity: number; focusArea: string; isSpacedReview?: boolean; reviewOf?: number[]; spacingInterval?: number }> = [
    { type: 'learning',   title: 'Day 1 — New Concept',          theme: 'Introduction & encoding',         intensity: 0.35, focusArea: 'foundation',    isSpacedReview: false },
    { type: 'retrieval',  title: 'Day 2 — 24hr Review',          theme: '24-hour spaced review of Day 1',  intensity: 0.30, focusArea: 'consolidation', isSpacedReview: true, reviewOf: [1], spacingInterval: 1 },
    { type: 'learning',   title: 'Day 3 — New Concept',          theme: 'Second concept introduction',     intensity: 0.40, focusArea: 'foundation',    isSpacedReview: false },
    { type: 'retrieval',  title: 'Day 4 — Mixed Review',         theme: 'Interleaved review: Days 1 & 3', intensity: 0.35, focusArea: 'consolidation', isSpacedReview: true, reviewOf: [1, 3], spacingInterval: 3 },
    { type: 'practice',   title: 'Day 5 — Deliberate Practice',  theme: 'Application of both concepts',   intensity: 0.50, focusArea: 'application',   isSpacedReview: false },
    { type: 'reflection', title: 'Day 6 — Week Review',          theme: 'Full week review (7-day spacing)', intensity: 0.30, focusArea: 'consolidation', isSpacedReview: true, reviewOf: [1, 2, 3, 4, 5], spacingInterval: 5 },
    { type: 'rest',       title: 'Day 7 — Rest & Consolidation', theme: 'Active rest — hippocampal consolidation', intensity: 0.10, focusArea: 'recovery', isSpacedReview: false },
  ];

  return plan.map((d, i) => ({
    day:       startDay + i,
    weekDay:   i + 1,
    type:      d.type,
    title:     d.title,
    theme:     d.theme,
    intensity: d.intensity,
    focusArea: d.focusArea,
    // Extended fields (stored but not required by WeekDay base type)
    ...(d.isSpacedReview !== undefined && { isSpacedReview: d.isSpacedReview }),
    ...(d.reviewOf && { reviewOf: d.reviewOf.map(r => startDay + r - 1) }),
    ...(d.spacingInterval !== undefined && { spacingInterval: d.spacingInterval }),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────

// ─── Validate + Normalize V2 ─────────────────────────────────────────────────

function validateAndNormalizeV2(raw: unknown, context: AgentContext): AgentRoadmapV2 {
  // Boundary contract — logs drift, does not throw (force-fill logic below covers the failure path).
  safeValidate(agent3RoadmapSchema, raw, 'agent3-roadmap');

  const parsed = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  const totalDays = typeof parsed.totalDays === 'number' ? parsed.totalDays : context.timeline;
  const totalWeeks = typeof parsed.totalWeeks === 'number' ? parsed.totalWeeks : Math.ceil(totalDays / 7);
  const totalMonths = typeof parsed.totalMonths === 'number' ? parsed.totalMonths : Math.ceil(totalDays / 30);

  const validDayTypes = ['learning', 'practice', 'reflection', 'challenge', 'retrieval', 'rest'] as const;

  // Normalize months
  const rawMonths = Array.isArray(parsed.months) ? parsed.months : [];
  const months: MonthPlan[] = rawMonths.map((m: unknown, mi: number) => {
    const month = (typeof m === 'object' && m !== null ? m : {}) as Record<string, unknown>;
    const rawWeeks = Array.isArray(month.weeks) ? month.weeks : [];

    const weeks: WeekPlan[] = rawWeeks.map((w: unknown, wi: number) => {
      const week = (typeof w === 'object' && w !== null ? w : {}) as Record<string, unknown>;
      const weekNumber = typeof week.week === 'number' ? week.week : (mi * 4) + wi + 1;

      // Only Week 1 gets days populated; all others get empty array
      const isFirstWeek = weekNumber === 1;
      let days: WeekDay[] = [];

      if (isFirstWeek && Array.isArray(week.days) && week.days.length > 0) {
        days = (week.days as unknown[]).map((d: unknown, di: number) => {
          const day = (typeof d === 'object' && d !== null ? d : {}) as Record<string, unknown>;
          return {
            day:       typeof day.day       === 'number' ? day.day       : di + 1,
            weekDay:   typeof day.weekDay   === 'number' ? day.weekDay   : di + 1,
            type:      (validDayTypes as readonly string[]).includes(day.type as string)
              ? (day.type as WeekDay['type'])
              : (di === 6 ? 'rest' : 'practice'),
            title:     typeof day.title     === 'string' ? day.title     : `Day ${di + 1}`,
            theme:     typeof day.theme     === 'string' ? day.theme     : '',
            intensity: typeof day.intensity === 'number' ? Math.min(1, Math.max(0, day.intensity)) : 0.3,
            focusArea: typeof day.focusArea === 'string' ? day.focusArea : 'general',
          };
        });

        // Ensure exactly 7 days, enforce rest on day 7
        while (days.length < 7) {
          const di = days.length;
          days.push({
            day: (typeof week.startDay === 'number' ? week.startDay : 1) + di,
            weekDay: di + 1,
            type: di === 6 ? 'rest' : 'practice',
            title: di === 6 ? 'Rest & Consolidation' : `Day ${di + 1}`,
            theme: di === 6 ? 'Active rest' : '',
            intensity: di === 6 ? 0.1 : 0.3,
            focusArea: di === 6 ? 'recovery' : 'general',
          });
        }
        // Enforce day 7 is always rest
        if (days[6]) {
          days[6] = { ...days[6], type: 'rest', intensity: Math.min(days[6].intensity, 0.2) };
        }
      } else if (isFirstWeek) {
        // Generate Week 1 days — use spaced repetition pattern if flag is on
        const startDay = typeof week.startDay === 'number' ? week.startDay : 1;
        if (flags.USE_SPACED_REPETITION_SCHEDULE) {
          days = buildSpacedRepetitionWeek1(startDay);
        } else {
          const weekTypes: WeekDay['type'][] = ['learning', 'practice', 'practice', 'reflection', 'practice', 'challenge', 'rest'];
          days = weekTypes.map((type, di) => ({
            day: startDay + di,
            weekDay: di + 1,
            type,
            title: type === 'rest' ? 'Rest & Consolidation' : `Day ${di + 1} — ${type}`,
            theme: type === 'rest' ? 'Active rest' : '',
            intensity: type === 'rest' ? 0.1 : 0.3 + di * 0.03,
            focusArea: type === 'rest' ? 'recovery' : 'general',
          }));
        }
      }

      return {
        week: weekNumber,
        title: typeof week.title === 'string' ? week.title : `Week ${weekNumber}`,
        theme: typeof week.theme === 'string' ? week.theme : '',
        startDay: typeof week.startDay === 'number' ? week.startDay : (weekNumber - 1) * 7 + 1,
        endDay:   typeof week.endDay   === 'number' ? week.endDay   : weekNumber * 7,
        status:   isFirstWeek ? 'current' : 'tentative',
        days,
        recalibratedFrom: typeof week.recalibratedFrom === 'number' ? week.recalibratedFrom : undefined,
      };
    });

    return {
      month: typeof month.month === 'number' ? month.month : mi + 1,
      title: typeof month.title === 'string' ? month.title : `Month ${mi + 1}`,
      phaseName: typeof month.phaseName === 'string' ? month.phaseName : (typeof month.title === 'string' ? month.title : `Phase ${mi + 1}`),
      startWeek: typeof month.startWeek === 'number' ? month.startWeek : mi * 4 + 1,
      endWeek: typeof month.endWeek === 'number' ? month.endWeek : (mi + 1) * 4,
      startDay: typeof month.startDay === 'number' ? month.startDay : mi * 30 + 1,
      endDay: typeof month.endDay === 'number' ? month.endDay : Math.min((mi + 1) * 30, totalDays),
      primaryGoals: Array.isArray(month.primaryGoals) ? month.primaryGoals as string[] : [],
      scienceRationale: typeof month.scienceRationale === 'string' ? month.scienceRationale : '',
      weeks,
    };
  });

  // Ensure progressionCurve
  const progressionCurve = (typeof parsed.progressionCurve === 'object' && parsed.progressionCurve !== null)
    ? parsed.progressionCurve as Record<string, { intensity: number; volume: string }>
    : { month_1: { intensity: 0.3, volume: 'low' }, month_2: { intensity: 0.6, volume: 'medium' } };

  return {
    totalDays,
    totalWeeks,
    totalMonths,
    domainPedagogy:          typeof parsed.domainPedagogy         === 'string' ? parsed.domainPedagogy         : 'Standard Progression',
    frameworkName:           typeof parsed.frameworkName          === 'string' ? parsed.frameworkName          : '',
    frameworkReason:         typeof parsed.frameworkReason        === 'string' ? parsed.frameworkReason        : '',
    frameworkScience:        typeof parsed.frameworkScience       === 'string' ? parsed.frameworkScience       : '',
    frameworkSources:        Array.isArray(parsed.frameworkSources) ? parsed.frameworkSources as AgentRoadmapV2['frameworkSources'] : [],
    months,
    progressionCurve,
    stoneModificationSummary: typeof parsed.stoneModificationSummary === 'string' ? parsed.stoneModificationSummary : 'No modifications applied.',
    modifiers_from_stones:   (typeof parsed.modifiers_from_stones === 'object' && parsed.modifiers_from_stones !== null)
      ? parsed.modifiers_from_stones as AgentRoadmapV2['modifiers_from_stones']
      : {},
  };
}
// ─── Compatibility Bridge (V2 → Legacy Agent3Output for Agent 4) ─────────────

/**
 * Converts AgentRoadmapV2 (month/week/day hierarchy) into the legacy Agent3Output
 * structure that Agent 4 (task-generator) still consumes.
 * Populates daySkeleton from the pre-planned Week 1 days.
 */
export function buildLegacyAgent3Output(v2: AgentRoadmapV2): Agent3Output {
  // Read Sprint 1 metadata attached by buildCurriculum (if present)
  const meta = v2 as AgentRoadmapV2 & { _habitAutomaticityDay?: number; _adjustedTimeline?: number; _mismatchWarning?: string };
  const habitAutomaticityDay   = meta._habitAutomaticityDay;
  const adjustedTimeline       = meta._adjustedTimeline;
  const timelineMismatchWarning = meta._mismatchWarning;
  const phases: Phase[] = v2.months.map((month, idx) => {
    // Build daySkeleton from week days that are populated
    const daySkeleton = month.weeks
      .flatMap(w => w.days)
      .map(d => ({
        day: d.day - (month.startDay - 1), // day within phase
        theme: d.theme,
        taskType: d.type as 'practice' | 'learning' | 'reflection' | 'challenge' | 'retrieval' | 'rest',
        intensity: d.intensity,
        focusArea: d.focusArea,
      }));

    return {
      phaseNumber: idx + 1,
      phaseName: month.title,
      weeks: Array.from({ length: month.endWeek - month.startWeek + 1 }, (_, i) => month.startWeek + i),
      durationDays: month.endDay - month.startDay + 1,
      primaryGoals: month.primaryGoals,
      focusAreas: {},
      keyMilestones: month.primaryGoals.slice(0, 2),
      scienceRationale: month.scienceRationale,
      daySkeleton: daySkeleton.length > 0 ? daySkeleton : undefined,
    };
  });

  return {
    roadmap: {
      totalDays: v2.totalDays,
      totalPhases: v2.totalMonths,
      phases,
      progressionCurve: v2.progressionCurve as Record<string, import('@types-app/agents').ProgressionPoint>,
      reviewMoments: [] as ReviewMoment[],
      restDays: { pattern: 'weekly', customDays: [6, 0], restType: 'active_recovery' as const },
      modifiers_from_stones: {} as Roadmap['modifiers_from_stones'],
      habitAutomaticityDay,
      adjustedTimeline,
      timelineMismatchWarning,
    },
    domainPedagogy: v2.domainPedagogy,
    stoneModificationSummary: v2.stoneModificationSummary,
  };
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function buildCurriculum(
  context: AgentContext,
  goalAnalysis: Agent1Output,
  stoneProfile: Agent2ProfileOutput,
  ragContext?: string,
): Promise<AgentRoadmapV2> {
  const g = goalAnalysis.goalAnalysis;

  // Derive month count from timeline/horizon (never from LLM)
  const phaseCount = computePhaseCount(context.timeline, g.horizon);

  // ── Sprint 1: Research-backed timeline + habit science computations ────────
  const primaryStone = stoneProfile.stoneProfile.primaryStone;
  const changeStage  = stoneProfile.stoneProfile.changeStage;
  const { adjustedTimeline, mismatchWarning } = computeAdjustedTimeline(
    context.timeline,
    context.dailyTimeAvailable,
    primaryStone,
    changeStage,
  );
  const habitAutomaticityDay = computeHabitAutomaticityDay(
    g.domain,
    primaryStone,
    context.dailyTimeAvailable,
  );

  // Fetch RAG context if not provided by caller — multi-query for richer context
  let science = ragContext ?? '';
  let behavioralContext = '';
  const stoneTypes   = stoneProfile.stoneProfile.stones.map(s => s.type);

  const ragTimeout = new Promise<void>(resolve => setTimeout(resolve, 10_000));
  await Promise.race([
    Promise.all([
      (!science ? retrieveKnowledgeSemantic({
        query: `${g.domain} ${g.goal} skill progression phases milestones daily activities specific`,
        additionalQueries: [
          `${primaryStone} ${g.domain} intervention curriculum modification coaching`,
          `${g.complexity} learner ${g.domain} pedagogical approach evidence-based`,
        ],
        boostCategories: [g.domain.toLowerCase(), ...stoneTypes.map(s => s.toLowerCase())],
        boostKeywords: [g.domain.toLowerCase(), primaryStone.toLowerCase()],
        matchCount: 6,
      }).then(s => { science = s; }).catch(() => {}) : Promise.resolve()),
      (flags.USE_BEHAVIORAL_RAG ? (async () => {
        try {
          const { retrieveBehavioralPatterns } = await import('@core/rag');
          behavioralContext = await retrieveBehavioralPatterns({
            query:        `${g.domain} ${primaryStone} curriculum learning pattern success`,
            stoneProfile,
            domain:       g.domain,
            matchCount:   2,
          });
        } catch { /* non-fatal */ }
      })() : Promise.resolve()),
    ]),
    ragTimeout,
  ]);

  const behavioralBlock = behavioralContext
    ? `\n## Prior Behavioral Context\n${behavioralContext}\n`
    : '';

  const userPrompt = buildUserPrompt(
    context, goalAnalysis, stoneProfile, science + behavioralBlock, phaseCount,
    adjustedTimeline, habitAutomaticityDay, mismatchWarning,
  );

  const callMessages = [
    { role: 'system' as const, content: buildSystemPrompt(g.domain) },
    { role: 'user'   as const, content: userPrompt },
  ];

  let content: string;
  if (flags.USE_AGENT_TOOL_CALLING && flags.USE_CLAUDE_FOR_CURRICULUM) {
    // Tool-use + extended thinking: Agent 3 queries pedagogy + stone tools then generates
    const { makeCurriculumToolHandler, CURRICULUM_TOOL_SCHEMAS } = await import('@lib/agentTools');
    const toolHandler = makeCurriculumToolHandler(
      async (query) => {
        const { retrieveKnowledgeHybrid, retrieveKnowledgeSemantic: ragSem } = await import('@core/rag/semantic-retriever');
        return flags.USE_HYBRID_RAG
          ? retrieveKnowledgeHybrid({ query, matchCount: 3 })
          : ragSem({ query, matchCount: 3 });
      },
    );
    const systemWithToolInstructions = buildSystemPrompt(g.domain) + `

TOOL USE INSTRUCTIONS:
1. Call get_pedagogy_framework for the "${g.domain}" domain.
2. Call get_stone_interventions for each detected stone.
3. Optionally call search_behavioral_knowledge for additional science.
4. Use all retrieved context to build the curriculum JSON.`;

    const result = await callStrategicWithTools({
      messages:     [{ role: 'user', content: userPrompt }],
      systemPrompt: systemWithToolInstructions,
      tools:        CURRICULUM_TOOL_SCHEMAS,
      toolHandler,
      temperature:  0.3,
      max_tokens:   16000, // align to streaming default; avoids truncation if this flag path is enabled
    });
    content = result.finalText;
  } else if (flags.USE_CLAUDE_FOR_CURRICULUM) {
    const result = await callStrategicWithThinking({
      messages:     callMessages,
      budgetTokens: 8000,
      max_tokens:   16000, // align to streaming default (thinking shares this budget on 5-gen)
    });
    content = result.content;
  } else {
    // A blocking call here was observed hitting the ai-proxy edge function's
    // own execution ceiling (~150s) even with a correctly-scoped prompt (only
    // Week 1 gets full day-by-day detail) — Opus 5 generating even a moderate
    // structured-JSON completion can genuinely take longer than that window,
    // and a non-streaming call can't return anything until the whole response
    // is done. Streaming avoids the buffering that trips that ceiling — the
    // edge function forwards chunks as they arrive instead of waiting for the
    // full completion — and is Anthropic's own recommended pattern for any
    // call likely to produce a large response.
    let accumulated = '';
    for await (const chunk of callPremiumStream({
      messages:        callMessages,
      temperature:     0.3,
      max_tokens:      16000,
    })) {
      accumulated += chunk;
    }
    content = accumulated;
  }
  if (!content) throw new Error('Agent 3: No response received from model');

  const raw = parseAgentJSON(content, 'agent3-curriculum');
  const v2  = validateAndNormalizeV2(raw, context);

  // Attach Sprint 1 metadata so buildLegacyAgent3Output can propagate them to Roadmap
  (v2 as AgentRoadmapV2 & { _habitAutomaticityDay?: number; _adjustedTimeline?: number; _mismatchWarning?: string })
    ._habitAutomaticityDay = habitAutomaticityDay;
  (v2 as AgentRoadmapV2 & { _adjustedTimeline?: number })
    ._adjustedTimeline = adjustedTimeline !== context.timeline ? adjustedTimeline : undefined;
  if (mismatchWarning) {
    (v2 as AgentRoadmapV2 & { _mismatchWarning?: string })._mismatchWarning = mismatchWarning;
  }

  // Bolt-on metadata for eval/observability — the RAG excerpt this roadmap was
  // actually grounded on, so a judge can check groundedness post-hoc.
  (v2 as AgentRoadmapV2 & { _ragContextUsed?: string })._ragContextUsed = science;

  return v2;
}

// ============================================
// ROLLING CURRICULUM SKELETON (USE_ROLLING_CURRICULUM)
// ============================================

/**
 * Derive Dreyfus-based phase splits for any timeline.
 * Returns [foundationEnd, developmentEnd, masteryEnd] as day numbers.
 */
function computePhaseSplits(
  totalDays: number,
  primaryStone: string,
  changeStage?: string,
): { foundationEnd: number; developmentEnd: number; masteryEnd: number } {
  // Base Dreyfus splits: Foundation 33%, Development 42%, Mastery 25%
  let foundationRatio  = 0.33;
  let developmentRatio = 0.42;

  // Stone adjustments
  if (primaryStone === 'SkillGap')         foundationRatio += 0.07;  // more Foundation
  if (primaryStone === 'FearOfFailure')    foundationRatio += 0.04;
  if (primaryStone === 'Overcommitment')   developmentRatio -= 0.05;
  if (primaryStone === 'LowConfidence')    foundationRatio += 0.04;

  // High self-efficacy signal: compress Foundation slightly (handled upstream via readiness)
  if (changeStage === 'action')            foundationRatio -= 0.08;  // already started
  if (changeStage === 'contemplation')     foundationRatio += 0.05;  // needs motivation phase

  // Clamp ratios
  foundationRatio  = Math.min(0.45, Math.max(0.20, foundationRatio));
  developmentRatio = Math.min(0.50, Math.max(0.30, developmentRatio));

  const foundationEnd  = Math.round(totalDays * foundationRatio);
  const developmentEnd = Math.round(totalDays * (foundationRatio + developmentRatio));
  const masteryEnd     = totalDays;

  return { foundationEnd, developmentEnd, masteryEnd };
}

function buildCompetencyGate(phase: string, difficulty: number): CompetencyGate {
  const gatesByPhase: Record<string, CompetencyGate> = {
    Foundation: {
      description:        'Demonstrates consistent execution of core fundamentals without prompting',
      minCompletionRate:  80,
      maxAvgDifficulty:   3.0,
      requiredBehaviors:  ['Completes daily task without skipping for 5 consecutive days'],
    },
    Development: {
      description:        'Applies skills in varied contexts with increasing autonomy',
      minCompletionRate:  75,
      maxAvgDifficulty:   3.5,
      requiredBehaviors:  ['Handles a deliberate practice challenge with minimal scaffolding'],
    },
    Mastery: {
      description:        'Executes skills fluently; proactively manages obstacles',
      minCompletionRate:  85,
      maxAvgDifficulty:   2.5,
    },
  };
  const base = gatesByPhase[phase] ?? gatesByPhase['Foundation'];
  // Very hard goals get a more forgiving bar — perfect execution is less realistic.
  // Copy before mutating: `base` is a reference into the map above, not an owned value.
  if (difficulty > 3) return { ...base, minCompletionRate: Math.max(65, base.minCompletionRate - 10) };
  return base;
}

/**
 * Build a CurriculumSkeleton — phase structure + competency gates + Week 1 + milestones.
 * No LLM call — fully deterministic from Agent 1 + Agent 2 outputs.
 *
 * Used when USE_ROLLING_CURRICULUM is on. Agent 4 generates each subsequent week
 * against the phase skeleton rather than a pre-planned roadmap.
 */
export function buildCurriculumSkeleton(
  context:      AgentContext,
  goalAnalysis: Agent1Output,
  stoneProfile: Agent2ProfileOutput,
  adjustedTimeline?: number,
  habitAutomaticityDay?: number,
): CurriculumSkeleton {
  const g          = goalAnalysis.goalAnalysis;
  const sp         = stoneProfile.stoneProfile;
  const totalDays  = adjustedTimeline ?? context.timeline;
  const primaryStone = sp.primaryStone;
  const changeStage  = sp.changeStage;

  const { foundationEnd, developmentEnd, masteryEnd } = computePhaseSplits(
    totalDays, primaryStone, changeStage,
  );

  // Add Phase 0 for contemplation-stage users (7–14 days motivation activation)
  const phase0Days = changeStage === 'contemplation' ? Math.min(14, Math.round(totalDays * 0.08)) : 0;
  const phase0End  = phase0Days;

  const phases: CurriculumSkeleton['phases'] = [];

  if (phase0Days > 0) {
    phases.push({
      phaseNumber:   0,
      phaseName:     'Phase0_Motivation',
      startDay:      1,
      endDay:        phase0End,
      dreyfusStage:  'novice',
      primaryGoals:  [
        'Clarify personal "why" behind the goal',
        'Build the minimum viable daily behavior (2 minutes)',
        'Establish anchor habit and context',
      ],
      graduationGate: {
        description:       'Completes the tiny starter behavior for 5 consecutive days',
        minCompletionRate: 70,
        maxAvgDifficulty:  2.0,
      },
    });
  }

  const baseOffset = phase0Days;

  phases.push({
    phaseNumber:  1,
    phaseName:    'Foundation',
    startDay:     baseOffset + 1,
    endDay:       baseOffset + foundationEnd,
    dreyfusStage: 'novice',
    primaryGoals: [
      `Build the core ${g.domain.toLowerCase()} habit with consistent execution`,
      'Establish reliable trigger → behavior → reward loop',
      'Reach 80%+ completion rate before advancing',
    ],
    graduationGate: buildCompetencyGate('Foundation', g.complexity === 'advanced' ? 4 : 2),
    bctPrimitives:  g.goalType === 'behavior_based' ? [
      { name: 'Morning trigger', cue: 'Wake + first routine action', behavior: 'Complete 2-min starter behavior', installByDay: baseOffset + 7 },
      { name: 'Task initiation', cue: 'Sit at workspace', behavior: 'Open the primary task immediately', installByDay: baseOffset + 14 },
    ] : undefined,
  });

  phases.push({
    phaseNumber:  2,
    phaseName:    'Development',
    startDay:     baseOffset + foundationEnd + 1,
    endDay:       baseOffset + developmentEnd,
    dreyfusStage: 'competent',
    primaryGoals: [
      'Apply skills in progressively varied contexts',
      'Handle setbacks and recover without losing streak',
      'Begin deliberate practice at the performance boundary',
    ],
    graduationGate: buildCompetencyGate('Development', g.complexity === 'advanced' ? 4 : 2),
    bctPrimitives:  g.goalType === 'behavior_based' ? [
      { name: 'Distraction blocking', cue: 'Task initiation cue fires', behavior: 'Single-task for full session', installByDay: baseOffset + foundationEnd + 14 },
      { name: 'Evening review', cue: 'Post-dinner', behavior: '5-min log of what was done', installByDay: baseOffset + foundationEnd + 21 },
    ] : undefined,
  });

  phases.push({
    phaseNumber:  3,
    phaseName:    'Mastery',
    startDay:     baseOffset + developmentEnd + 1,
    endDay:       masteryEnd,
    dreyfusStage: 'proficient',
    primaryGoals: [
      'Achieve fluent autonomous execution without deliberate effort',
      'Maintain performance under stress and context disruption',
      'Establish relapse recovery protocol',
    ],
    graduationGate: buildCompetencyGate('Mastery', g.complexity === 'advanced' ? 4 : 2),
  });

  // Milestones at 30%, 60%, 90%
  const milestones: CurriculumSkeleton['milestones'] = [30, 60, 90].map(pct => ({
    percentComplete:          pct,
    day:                      Math.round(totalDays * pct / 100),
    competencyDescription:    pct === 30
      ? `Foundation behaviors consistent; ready for Development phase challenges`
      : pct === 60
        ? `Core skills applied autonomously; difficulty perception normalized`
        : `Near-automaticity; resilient to context disruption`,
    graduationGate: buildCompetencyGate(
      pct <= 30 ? 'Foundation' : pct <= 60 ? 'Development' : 'Mastery',
      2,
    ),
  }));

  // Week 1 — spaced repetition pattern (Cepeda et al. 2008)
  const week1Days = buildSpacedRepetitionWeek1(1);

  // Stone modification summary
  const stoneModifications = sp.agent3Guidance ?? [];

  return {
    totalDays,
    adjustedTimeline:     adjustedTimeline !== context.timeline ? adjustedTimeline : undefined,
    habitAutomaticityDay,
    goalType:             g.goalType ?? 'skill_based',
    phases,
    milestones,
    week1Days,
    stoneModifications,
    behavioralPrimitives: g.goalType === 'behavior_based'
      ? phases.flatMap(p => p.bctPrimitives?.map(b => b.name) ?? [])
      : undefined,
  };
}

// ============================================
// CURRICULUM PREVIEW (deterministic — no LLM)
// ============================================

const TASK_TYPE_LABELS: Record<string, CurriculumPreviewTask['type']> = {
  practice: 'practice',
  learning: 'learning',
  reflection: 'reflection',
  challenge: 'challenge',
  retrieval: 'retrieval',
  rest: 'practice', // map rest → practice as fallback for preview
};

/**
 * Derive a 7-day curriculum preview from Agent 3 output.
 * Completely deterministic — no LLM call needed.
 * Uses the phase daySkeleton if available, otherwise synthesizes from phase goals.
 */
export function buildCurriculumPreview(
  curriculum: Agent3Output,
  category: string,
  dailyMinutes: number,
): CurriculumPreview {
  const phase1 = curriculum.roadmap.phases[0];
  if (!phase1) {
    return { tasks: [], weekTheme: 'Getting started', endOfWeekOutcome: 'Your journey begins' };
  }

  const tasks: CurriculumPreviewTask[] = [];
  const skeleton = phase1.daySkeleton ?? [];

  for (let day = 1; day <= 7; day++) {
    const skeletonDay = skeleton.find(s => s.day === day);
    const focusAreas = Object.keys(phase1.focusAreas);
    const focusArea = focusAreas[(day - 1) % Math.max(1, focusAreas.length)];

    // Alternate types through the week for variety
    const weekPattern: CurriculumPreviewTask['type'][] =
      ['learning', 'practice', 'practice', 'reflection', 'practice', 'challenge', 'reflection'];
    const taskType = skeletonDay
      ? (TASK_TYPE_LABELS[skeletonDay.taskType] ?? weekPattern[day - 1])
      : weekPattern[day - 1];

    const theme = skeletonDay?.theme ?? `${phase1.primaryGoals[0] ?? category} — Day ${day}`;

    // Vary duration slightly to feel realistic
    const durationVariance = [0, 5, -5, 0, 5, 10, -5][day - 1];
    const estimatedMinutes = Math.max(15, dailyMinutes + durationVariance);

    tasks.push({
      day,
      title: theme,
      type: taskType,
      estimatedMinutes,
      summary: buildDaySummary(day, taskType, focusArea, phase1.primaryGoals),
      phase: 1,
    });
  }

  const weekTheme = phase1.phaseName ?? `${category} Foundations`;
  const endOfWeekOutcome = phase1.keyMilestones[0] ?? `You'll have completed your first week of ${category}`;

  return { tasks, weekTheme, endOfWeekOutcome };
}

function buildDaySummary(
  day: number,
  type: CurriculumPreviewTask['type'],
  focusArea: string,
  primaryGoals: string[],
): string {
  const goal = primaryGoals[0] ?? 'core skills';
  const area = focusArea ?? 'fundamentals';

  switch (type) {
    case 'learning':
      return `Study ${area} — understand the core concepts behind ${goal}`;
    case 'practice':
      return `Drill session — apply ${area} with focused repetition`;
    case 'reflection':
      return `Review what's working, identify your key improvement area`;
    case 'challenge':
      return `Push beyond comfort — a stretch exercise on ${area}`;
    case 'retrieval':
      return `Recall and test yourself on ${area} without notes`;
    default:
      return `Day ${day} — ${area} session`;
  }
}

/**
 * Convert the user's pace choice into concrete calibration parameters
 * that get injected into Agent 4's task generation prompt.
 */
export function resolvePaceCalibration(choice: PaceChoice): PaceCalibration {
  switch (choice) {
    case 'too_easy':
      return {
        choice,
        difficultyMultiplier: 1.25,
        phaseDurationMultiplier: 0.9,
        maxStepsPerTask: 6,
        note: 'User found preview pace too easy. Increase task complexity and challenge level. Include harder variations and bonus challenge steps.',
      };
    case 'too_intense':
      return {
        choice,
        difficultyMultiplier: 0.75,
        phaseDurationMultiplier: 1.2,
        maxStepsPerTask: 3,
        note: 'User found preview pace too intense. Simplify tasks: max 3 steps, shorter sessions, lighter cognitive load. Prioritize momentum over depth.',
      };
    case 'just_right':
    default:
      return {
        choice: 'just_right',
        difficultyMultiplier: 1.0,
        phaseDurationMultiplier: 1.0,
        maxStepsPerTask: 4,
        note: 'User confirmed pace is well-calibrated. Maintain standard progression curve.',
      };
  }
}
