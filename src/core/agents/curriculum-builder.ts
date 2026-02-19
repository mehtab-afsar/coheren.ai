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
} from '@types-app/agents';
import { callPremium as callReasoning } from '@lib/ai-router'; // Sonnet for curriculum quality
import { retrieveKnowledgeSemantic } from '@core/rag/semantic-retriever';

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

// ─── Stone → Curriculum Modification Map ────────────────────────────────────
// Concrete curriculum changes for each stone type.
// These are injected into the prompt as explicit instructions.

const STONE_MODIFICATIONS: Record<string, string> = {
  TimeConstraint: `
TIME CONSTRAINT DETECTED — Apply these modifications:
- Compress Phase 1 by 20% (basics-only, cut nice-to-knows)
- Use "micro-session" format: each task must have a 10-min fallback version
- Remove all "supplementary" activities — only core actions
- Add time-blocking instructions to every task ("open at 7am, close at 7:25am")
- Prioritize depth over breadth — fewer topics, mastered properly`,

  ResourceGap: `
RESOURCE GAP DETECTED — Apply these modifications:
- Phase 1 must explicitly list free/low-cost alternatives for all required resources
- Add a "budget path" note in Phase 1 adaptationRules
- Replace equipment-dependent tasks with bodyweight/free alternatives where possible
- Identify which milestones are resource-dependent and flag them as "conditional"`,

  EnvironmentFriction: `
ENVIRONMENT FRICTION DETECTED — Apply these modifications:
- Phase 1 must include an Environment Design day (Day 1-3): set up the physical context
- Add friction-reduction tasks: arrange gear the night before, clear the workspace, etc.
- Sessions should be schedulable in the available environment (commute, small space, noisy home)
- Add a "minimal viable environment" specification to each phase`,

  Inconsistency: `
INCONSISTENCY PATTERN DETECTED — Apply these modifications:
- Structure as 3-day micro-sprints with built-in "catch-up day" on Day 4
- Phase 1 intensity must be so low that a bad week still produces something
- Add "never miss twice" recovery protocol: if Day N is missed, Day N+1 is half-load
- Reduce phase length: shorter phases mean more frequent sense of completion
- Add progress visibility (streak tracking, weekly review days) explicitly`,

  FearOfFailure: `
FEAR OF FAILURE DETECTED — Apply these modifications:
- Phase 1 must be impossible to fail at (tasks are "do X regardless of quality")
- Remove assessments from Phase 1 entirely — no evaluation, only practice
- Label early tasks as "experiments" not "performances"
- Add explicit "good failure" moments: tasks designed to identify mistakes safely
- Delay public or evaluated work until Phase 3 minimum`,

  Perfectionism: `
PERFECTIONISM DETECTED — Apply these modifications:
- Every task must have an explicit time-box ("spend exactly 25 minutes, then stop")
- Add "done is better than perfect" principle to Phase 1 primary goals
- Include deliberate "rough draft" tasks: produce something intentionally imperfect
- Phase 1 adaptationRules.if_completing_easily must NOT suggest adding more — suggest rest instead
- Remove any open-ended tasks without a time or quantity limit`,

  LowConfidence: `
LOW CONFIDENCE DETECTED — Apply these modifications:
- Front-load Phase 1 with tasks below current skill level — guaranteed wins
- Add explicit success criteria that are binary (did it/didn't do it) not quality-based
- Include a "skills inventory" task early: list what the user already knows
- Phase milestones should be reachable within the first 7 days
- scienceRationale for Phase 1 must reference Self-Determination Theory (competence need)`,

  UnrealisticExpectations: `
UNREALISTIC EXPECTATIONS DETECTED — Apply these modifications:
- Phase 1 primaryGoals must explicitly name what will NOT be achieved by the end
- Add a "realistic timeline" note to the roadmap description
- Include "typical learner progress" benchmarks in at least 2 phase scienceRationales
- Milestone phrasing: use relative language ("better than Day 1") not absolute ("mastered")`,

  FocusFragility: `
FOCUS FRAGILITY DETECTED — Apply these modifications:
- Break all sessions into maximum 20-minute focused blocks
- Add a 2-minute "transition ritual" before each block (review goal, silence phone)
- Reduce the number of distinct topics per session to 1 (single-focus sessions only)
- Add "environmental anchoring" to tasks: same location, same time, same cue
- Phase 2+ can only add complexity after 14 days of consistent single-focus sessions`,

  CognitiveFatigue: `
COGNITIVE FATIGUE DETECTED — Apply these modifications:
- Every 5th day is a light review day (no new material, 50% volume)
- Hardest cognitive work scheduled for the first 30 minutes of the session only
- Add sleep and recovery reminders to Phase 1 (sleep consolidates what was learned)
- Phase progression is gated on energy sustainability, not just content mastery
- Split sessions if daily time > 45 min: two 20-min blocks > one 45-min block`,

  SkillGap: `
SKILL GAP DETECTED — Apply these modifications:
- Add a Phase 0 "Prerequisite Sprint" if skill gap is severe (before Phase 1)
- Phase 1 must focus exclusively on prerequisites — no advanced content yet
- Include specific learning resources for the identified prerequisite skills
- Gate Phase 2 entry on a concrete prerequisite check: "can you do X?"
- Extend Phase 1 timeline by 20% to allow prerequisite acquisition`,

  ProcrastinationPattern: `
PROCRASTINATION PATTERN DETECTED — Apply these modifications:
- Front-load the hardest, most aversive tasks in the first 30 minutes of each session
- Every task must include a specific "implementation intention" (when, where, first action)
- Phase 1 tasks should take under 5 minutes to start (reduce initiation barrier)
- Add "minimum viable session" fallback: 10 minutes counts as a win
- Include "temptation bundling" options: pair the habit with something enjoyable`,

  Overcommitment: `
OVERCOMMITMENT DETECTED — Apply these modifications:
- Phase 1 must include an explicit "what to stop doing" section
- Cap total daily time at 80% of stated availability (buffer for life)
- Add a "single focus rule" to Phase 1 primary goals: this roadmap is the ONLY new commitment
- Milestone density must be reduced: only 1 milestone per phase, not 3+
- Phase adaptationRules.if_completing_easily: "maintain pace, do not add more goals"`,
};

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(domain: string): string {
  const pedagogy = DOMAIN_PEDAGOGY[domain] ?? DOMAIN_PEDAGOGY['Lifestyle'];

  return `You are Agent 3: Curriculum Architect — a world-class instructional designer.

Your job is to transform a goal analysis and behavioral profile into a structured, phased learning roadmap.
You are NOT a motivational coach. You are an architect designing a building. Every decision must be justified.

## Your Pedagogical Framework for This Goal's Domain
${pedagogy}

## Core Curriculum Principles (apply to ALL domains)
- Progressive Overload: Each phase is harder than the last. Never plateau.
- Spacing Effect: Review prior material before introducing new material. Never cram.
- Scaffolding: Each phase explicitly builds on skills from the prior phase.
- Feedback Loops: Every phase has a measurable checkpoint outcome.
- Consolidation before Complexity: Do not add new skills before current skills are stable.

## Phase Count Rules (NON-NEGOTIABLE)
- Short-term goal (<90 days): 2–3 phases
- Mid-term goal (90–365 days): 3–4 phases
- Long-term goal (>365 days): 4–5 phases
Never create more or fewer phases than these rules permit.

## Return ONLY valid JSON. No commentary, no markdown.`;
}

// ─── User Prompt ─────────────────────────────────────────────────────────────

function buildUserPrompt(
  context: AgentContext,
  goalAnalysis: Agent1Output,
  stoneProfile: Agent2ProfileOutput,
  ragContext: string,
  phaseCount: number,
): string {
  const g = goalAnalysis.goalAnalysis;
  const sp = stoneProfile.stoneProfile;

  // Stone modification instructions for this specific user
  const stoneInstructions = sp.stones
    .map(s => STONE_MODIFICATIONS[s.type] ?? '')
    .filter(Boolean)
    .join('\n');

  return `Build a ${context.timeline}-day curriculum roadmap with exactly ${phaseCount} phases.

## Goal Intelligence (from Agent 1)
Goal: "${g.goal}"
Domain: ${g.domain}${g.subDomains.length ? ` + [${g.subDomains.join(', ')}]` : ''}
Complexity: ${g.complexity}
Horizon: ${g.horizon}
Daily Time Available: ${context.dailyTimeAvailable} minutes
Constraints: ${g.constraintsDetected.join(', ') || 'None'}
Risks: ${g.risksDetected.join(', ') || 'None'}
Typical Realistic Timeline: ${g.typicalTimeline.realistic}
Key Milestones Agent 1 Identified: ${g.keyMilestones.join(' | ')}
Common Obstacles: ${g.commonObstacles.join(' | ')}

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
${sp.agent3Guidance.map(g => `  - ${g}`).join('\n')}
Agent 5 Prediction: "${sp.agent5Note}"

## MANDATORY Stone Modifications
Apply ALL of the following modifications to the curriculum:
${stoneInstructions || '(No stones detected — use default curriculum structure)'}

## Scientific Foundation (from Knowledge Base)
${ragContext || '(No RAG context available — use domain pedagogy defaults)'}

## Output Schema (return exactly this structure)
{
  "roadmap": {
    "totalDays": ${context.timeline},
    "totalPhases": ${phaseCount},
    "phases": [
      {
        "phaseNumber": 1,
        "phaseName": "descriptive name",
        "weeks": [1, 2],
        "durationDays": 14,
        "primaryGoals": ["specific goal 1", "specific goal 2"],
        "focusAreas": { "area_name": 40, "area_name_2": 60 },
        "keyMilestones": ["concrete, measurable milestone"],
        "scienceRationale": "Why this phase structure works — cite source if RAG provided it",
        "buildingOn": "what this phase relies on from the previous phase",
        "adaptationRules": {
          "if_completing_easily": "specific next step, not just 'do more'",
          "if_struggling": "specific reduction, not just 'slow down'"
        }
      }
    ],
    "progressionCurve": {
      "phase_1": { "intensity": 0.3, "volume": "low", "technique_depth": "shallow" },
      "phase_2": { "intensity": 0.5, "volume": "medium", "technique_depth": "medium" }
    },
    "reviewMoments": [
      { "day": 7, "type": "reflection", "prompt": "specific question tied to phase 1 goals" }
    ],
    "restDays": {
      "pattern": "every_7th_day",
      "customDays": [],
      "restType": "active_recovery"
    },
    "modifiers_from_stones": {
      "${sp.primaryStone}": {
        "removed": ["what was removed because of this stone"],
        "added": ["what was added because of this stone"],
        "modified": ["what was changed because of this stone"]
      }
    }
  },
  "domainPedagogy": "name of the pedagogical framework applied (e.g. 'Sports Periodization')",
  "stoneModificationSummary": "1-2 sentence summary of how the stone profile changed the default curriculum"
}`;
}

// ─── Phase Count Derivation ───────────────────────────────────────────────────

function derivePhaseCount(timeline: number, horizon: string): number {
  if (horizon === 'Short-term' || timeline <= 90)  return 2;
  if (horizon === 'Long-term'  || timeline > 365)  return 4;
  return 3; // Mid-term default
}

// ─── Validate + Normalize ────────────────────────────────────────────────────

function validateAndNormalize(raw: unknown, context: AgentContext, phaseCount: number): Agent3Output {
  const parsed = raw as Agent3Output;
  const roadmap = parsed?.roadmap as Roadmap | undefined;

  if (!roadmap || typeof roadmap !== 'object') {
    throw new Error('Agent 3: Missing roadmap in response');
  }

  // Enforce totalDays
  roadmap.totalDays = context.timeline;
  roadmap.totalPhases = phaseCount;

  // Ensure phases array
  if (!Array.isArray(roadmap.phases) || roadmap.phases.length === 0) {
    throw new Error('Agent 3: No phases in roadmap');
  }

  // Normalize each phase
  roadmap.phases = roadmap.phases.slice(0, phaseCount).map((phase, i) => {
    const p = phase as Phase;
    p.phaseNumber    = i + 1;
    p.phaseName      ??= `Phase ${i + 1}`;
    p.weeks          = Array.isArray(p.weeks) && p.weeks.length > 0 ? p.weeks : [i + 1];
    p.durationDays   = typeof p.durationDays === 'number' && p.durationDays > 0
      ? p.durationDays
      : Math.round(context.timeline / phaseCount);
    p.primaryGoals   = Array.isArray(p.primaryGoals) ? p.primaryGoals : [];
    p.keyMilestones  = Array.isArray(p.keyMilestones) ? p.keyMilestones : [];
    p.scienceRationale ??= '';
    p.focusAreas     ??= {};
    return p;
  });

  // Ensure we have exactly phaseCount phases (pad if LLM returned fewer)
  while (roadmap.phases.length < phaseCount) {
    const idx = roadmap.phases.length;
    roadmap.phases.push({
      phaseNumber:      idx + 1,
      phaseName:        `Phase ${idx + 1}`,
      weeks:            [idx + 1],
      durationDays:     Math.round(context.timeline / phaseCount),
      primaryGoals:     ['Continue progression from previous phase'],
      focusAreas:       {},
      keyMilestones:    ['Complete all scheduled sessions'],
      scienceRationale: '',
    });
  }

  // Ensure reviewMoments
  if (!Array.isArray(roadmap.reviewMoments)) {
    roadmap.reviewMoments = [
      { day: 7,  type: 'reflection', prompt: 'How did week 1 go? What felt hard?' },
      { day: 14, type: 'checkpoint', prompt: 'Am I on track with Phase 1 milestones?' },
    ];
  }

  // Ensure restDays
  roadmap.restDays ??= { pattern: 'every_7th_day', customDays: [], restType: 'active_recovery' };

  // Ensure progressionCurve has entries
  if (!roadmap.progressionCurve || Object.keys(roadmap.progressionCurve).length === 0) {
    roadmap.progressionCurve = {
      phase_1: { intensity: 0.3, volume: 'low',    technique_depth: 'shallow' },
      phase_2: { intensity: 0.5, volume: 'medium', technique_depth: 'medium'  },
    };
  }

  // Ensure modifiers_from_stones
  roadmap.modifiers_from_stones ??= {};

  // Ensure top-level fields
  parsed.domainPedagogy          ??= 'Standard Progression';
  parsed.stoneModificationSummary ??= 'No modifications applied.';

  return parsed;
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export async function buildCurriculum(
  context: AgentContext,
  goalAnalysis: Agent1Output,
  stoneProfile: Agent2ProfileOutput,
  ragContext?: string,
): Promise<Agent3Output> {
  const g = goalAnalysis.goalAnalysis;

  // Derive phase count from timeline/horizon (never from LLM)
  const phaseCount = derivePhaseCount(context.timeline, g.horizon);

  // Fetch RAG context if not provided by caller
  let science = ragContext ?? '';
  if (!science) {
    const query = `${g.domain} learning pedagogy ${g.complexity} ${g.goal} ${
      stoneProfile.stoneProfile.stones.map(s => s.type).join(' ')
    }`;
    science = await retrieveKnowledgeSemantic({ query, matchCount: 3 });
  }

  const { content } = await callReasoning({
    messages: [
      { role: 'system', content: buildSystemPrompt(g.domain) },
      { role: 'user',   content: buildUserPrompt(context, goalAnalysis, stoneProfile, science, phaseCount) },
    ],
    temperature: 0.3,
    max_tokens:  4000,
    response_format: { type: 'json_object' },
  });
  if (!content) throw new Error('Agent 3: No response received from model');

  const raw = JSON.parse(content) as unknown;
  return validateAndNormalize(raw, context, phaseCount);
}
