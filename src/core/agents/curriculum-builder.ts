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
  PaceCalibration,
  PaceChoice,
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

// ─── Spaced Repetition Assessment Schedule ──────────────────────────────────
// Deterministic schedule for when to insert retrieval/challenge/assessment days.
// These are injected post-LLM into reviewMoments to ensure testing happens.

const SPACED_REPETITION_SCHEDULE: { afterDays: number; type: ReviewMoment['type'] }[] = [
  { afterDays: 1,  type: 'reflection' },       // next-day quick recall
  { afterDays: 3,  type: 'checkpoint' },        // 3-day retrieval
  { afterDays: 7,  type: 'mid_assessment' },    // weekly challenge
  { afterDays: 14, type: 'mid_assessment' },    // bi-weekly assessment
];

/**
 * Generate assessment ReviewMoments based on spaced repetition schedule.
 * For each phase, creates retrieval and assessment days relative to phase start.
 * Also adds a final_assessment on the last day of the roadmap.
 */
function generateAssessmentMoments(phases: Phase[], totalDays: number): ReviewMoment[] {
  const moments: ReviewMoment[] = [];
  const usedDays = new Set<number>();

  let phaseStartDay = 1;
  for (const phase of phases) {
    const phaseEndDay = phaseStartDay + phase.durationDays - 1;

    // Insert spaced repetition moments relative to phase start
    for (const schedule of SPACED_REPETITION_SCHEDULE) {
      const assessDay = phaseStartDay + schedule.afterDays;
      // Only add if within this phase and within total days
      if (assessDay <= phaseEndDay && assessDay <= totalDays && !usedDays.has(assessDay)) {
        usedDays.add(assessDay);
        moments.push({
          day: assessDay,
          type: schedule.type,
          prompt: schedule.type === 'reflection'
            ? `Quick recall: What did you learn in the last session? Name 2-3 key points.`
            : schedule.type === 'checkpoint'
            ? `Retrieval check: Can you demonstrate the core skills from this phase so far?`
            : `Assessment: Show what you know from ${phase.phaseName}.`,
          relatedSkills: phase.primaryGoals?.slice(0, 3) ?? [],
          relatedDays: Array.from(
            { length: Math.min(schedule.afterDays, assessDay - phaseStartDay) },
            (_, i) => phaseStartDay + i
          ),
        });
      }
    }

    // End-of-phase assessment (if phase is long enough)
    if (phase.durationDays >= 7) {
      const endAssessDay = phaseEndDay;
      if (!usedDays.has(endAssessDay) && endAssessDay <= totalDays) {
        usedDays.add(endAssessDay);
        moments.push({
          day: endAssessDay,
          type: 'mid_assessment',
          prompt: `Phase ${phase.phaseNumber} assessment: Demonstrate mastery of ${phase.phaseName}.`,
          relatedSkills: phase.primaryGoals ?? [],
          relatedDays: Array.from(
            { length: phase.durationDays },
            (_, i) => phaseStartDay + i
          ),
        });
      }
    }

    phaseStartDay = phaseEndDay + 1;
  }

  // Final assessment on last day
  if (!usedDays.has(totalDays)) {
    moments.push({
      day: totalDays,
      type: 'final_assessment',
      prompt: 'Final assessment: Comprehensive review of everything you have learned.',
      relatedSkills: phases.flatMap(p => p.primaryGoals?.slice(0, 2) ?? []),
      relatedDays: Array.from({ length: Math.min(totalDays, 7) }, (_, i) => totalDays - i).reverse(),
    });
  }

  return moments.sort((a, b) => a.day - b.day);
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const FEW_SHOT_EXAMPLES = `
## CONCRETE OUTPUT EXAMPLES — Study these before generating

### GOOD PHASE (specific, verifiable, actionable):
{
  "phaseNumber": 1,
  "phaseName": "Core Mechanics",
  "durationDays": 45,
  "primaryGoals": [
    "Solve 20 beginner algorithm problems without looking at solutions",
    "Build a working CLI application from scratch"
  ],
  "focusAreas": { "variables-and-data-types": 20, "control-flow": 30, "functions-and-scope": 30, "arrays-and-objects": 20 },
  "keyMilestones": [
    "Complete 20 HackerRank Easy problems — timed at under 15 min each without hints",
    "CLI number guessing game working: accepts input, tracks guesses, announces winner"
  ],
  "scienceRationale": "Deliberate practice research (Ericsson): beginners need 30+ repetitions per concept before transfer occurs. Blocked practice first (variables → loops → functions) builds schema before interleaving.",
  "adaptationRules": {
    "if_completing_easily": "Add 5-minute time pressure to each problem — speed is the next challenge",
    "if_struggling": "Spend 2 extra days on control flow; only move to functions when loops feel automatic"
  }
}

### BAD PHASE (vague, unverifiable — NEVER produce this):
{
  "phaseName": "Foundation Building",
  "primaryGoals": ["Learn the basics", "Get comfortable with the material"],
  "keyMilestones": ["Understand core concepts", "Feel more confident"]
}
WHY IT'S BAD: "Learn the basics" is not a goal. "Understand core concepts" cannot be verified. Agent 4 cannot generate a specific daily task from these.

### GOOD PHASE (kinesthetic example):
{
  "phaseNumber": 1,
  "phaseName": "Technique Foundation",
  "durationDays": 28,
  "primaryGoals": [
    "Run 3km continuously at a conversational pace (can hold a sentence while running)",
    "Establish correct foot strike and posture mechanics"
  ],
  "focusAreas": { "easy-aerobic-runs": 60, "form-drills": 25, "mobility-and-warmup": 15 },
  "keyMilestones": [
    "Complete a 3km run without stopping — pace does not matter, only continuity",
    "Pass posture checklist: heel not striking first, arms at 90 degrees, looking 10m ahead"
  ],
  "scienceRationale": "Sports periodization: technique must be established at low intensity (RPE 4-5) before volume increases. Muscle memory of poor form is very hard to unlearn once volume rises.",
  "adaptationRules": {
    "if_completing_easily": "Extend long run by 500m per week — do NOT increase pace yet",
    "if_struggling": "Switch to run/walk intervals: 2 min run, 1 min walk, total 20 min"
  }
}

## MILESTONE QUALITY RULES (read carefully):
- BAD: "understand X" / "learn Y" / "get comfortable with Z" / "feel ready" — these are UNVERIFIABLE
- BAD: "practice regularly" / "work on fundamentals" — too vague for Agent 4 to act on
- GOOD: "solve 15 problems without hints in under 10 min each" — measurable, binary (done/not done)
- GOOD: "produce a 500-word rough draft — quality irrelevant, existence is the milestone"
- GOOD: "complete 3 full practice sets of 20 reps each with a 60-second rest" — specific, countable
`;

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

## Day-Level Skeletons (REQUIRED)
Each phase MUST include a "daySkeleton" array with one entry per day in the phase.
Each entry specifies: day number (1-indexed within phase), theme (what the day covers),
taskType (learning|practice|reflection|challenge|retrieval|rest), intensity (0.0–1.0),
and focusArea (must match a key from that phase's focusAreas).
Rules:
- Every 7th day should be "rest" type with intensity ≤ 0.2
- Intensity should ramp within each phase (start low, peak mid-phase, taper at end)
- Include at least 1 "reflection" day per 7 days
- Include at least 1 "retrieval" day per 14 days (spaced repetition)
- Themes must be specific enough for Agent 4 to generate a real task (NOT "learn basics")

${FEW_SHOT_EXAMPLES}

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

  // Stone modification instructions — severity-weighted
  // Critical/High: full application. Moderate: apply but softer. Low: mention but don't restructure.
  const stoneInstructions = sp.stones
    .sort((a, b) => {
      const order: Record<string, number> = { Critical: 0, High: 1, Moderate: 2, Low: 3 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    })
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

${tiebreakers ? `${tiebreakers}

` : ''}## MANDATORY Stone Modifications
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
        "daySkeleton": [
          { "day": 1, "theme": "specific topic/drill for this day", "taskType": "learning", "intensity": 0.3, "focusArea": "area_name" },
          { "day": 2, "theme": "...", "taskType": "practice", "intensity": 0.4, "focusArea": "area_name_2" }
        ],
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

// ─── JSON Repair ──────────────────────────────────────────────────────────────

function repairJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) raw = fenceMatch[1];
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) raw = raw.substring(start, end + 1);
  return raw
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
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

    // Validate/generate daySkeleton
    if (!Array.isArray(p.daySkeleton) || p.daySkeleton.length === 0) {
      // Generate a basic skeleton if the LLM didn't provide one
      const focusKeys = Object.keys(p.focusAreas);
      p.daySkeleton = Array.from({ length: p.durationDays }, (_, d) => {
        const dayNum = d + 1;
        const isRest = dayNum % 7 === 0;
        const isReflection = dayNum % 7 === 6;
        const isRetrieval = dayNum % 14 === 13;
        return {
          day: dayNum,
          theme: isRest ? 'Rest & recovery' : isReflection ? 'Weekly reflection' : `${p.phaseName} practice`,
          taskType: isRest ? 'rest' as const : isReflection ? 'reflection' as const : isRetrieval ? 'retrieval' as const : 'practice' as const,
          intensity: isRest ? 0.1 : Math.min(0.3 + (dayNum / p.durationDays) * 0.5, 0.9),
          focusArea: focusKeys[d % Math.max(focusKeys.length, 1)] ?? 'general',
        };
      });
    } else {
      // Validate existing skeleton entries
      const validTypes = ['practice', 'learning', 'reflection', 'challenge', 'retrieval', 'rest'];
      p.daySkeleton = p.daySkeleton.map((ds, d) => ({
        day: ds.day ?? d + 1,
        theme: ds.theme ?? `${p.phaseName} day ${d + 1}`,
        taskType: validTypes.includes(ds.taskType) ? ds.taskType : 'practice' as const,
        intensity: typeof ds.intensity === 'number' ? Math.min(1, Math.max(0, ds.intensity)) : 0.5,
        focusArea: ds.focusArea ?? 'general',
      }));
    }

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

  // Ensure reviewMoments from LLM
  if (!Array.isArray(roadmap.reviewMoments)) {
    roadmap.reviewMoments = [];
  }

  // Merge spaced repetition assessment moments into reviewMoments
  const assessmentMoments = generateAssessmentMoments(roadmap.phases, roadmap.totalDays);
  const existingDays = new Set(roadmap.reviewMoments.map(rm => rm.day));
  for (const am of assessmentMoments) {
    if (!existingDays.has(am.day)) {
      roadmap.reviewMoments.push(am);
      existingDays.add(am.day);
    }
  }
  roadmap.reviewMoments.sort((a, b) => a.day - b.day);

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

  // Fetch RAG context if not provided by caller — multi-query for richer context
  let science = ragContext ?? '';
  if (!science) {
    const primaryStone = stoneProfile.stoneProfile.primaryStone;
    const stoneTypes = stoneProfile.stoneProfile.stones.map(s => s.type);
    science = await retrieveKnowledgeSemantic({
      query: `${g.domain} ${g.goal} skill progression phases milestones daily activities specific`,
      additionalQueries: [
        `${primaryStone} ${g.domain} intervention curriculum modification coaching`,
        `${g.complexity} learner ${g.domain} pedagogical approach evidence-based`,
      ],
      boostCategories: [g.domain.toLowerCase(), ...stoneTypes.map(s => s.toLowerCase())],
      boostKeywords: [g.domain.toLowerCase(), primaryStone.toLowerCase()],
      matchCount: 6,
    });
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

  const raw = JSON.parse(repairJSON(content)) as unknown;
  return validateAndNormalize(raw, context, phaseCount);
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
