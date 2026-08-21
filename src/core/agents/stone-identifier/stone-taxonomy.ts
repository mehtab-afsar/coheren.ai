/**
 * Stone Taxonomy — Fixed ontology of success blockers
 *
 * Agents can ONLY emit stones from this list.
 * This prevents schema drift and keeps recalibration (Agent 5) deterministic.
 */

import type { StoneCategory, StoneType } from '@types-app/agents';

// --- Category → Stone mapping ---

export const STONE_CATEGORIES: Record<StoneCategory, StoneType[]> = {
  Logistical: ['TimeConstraint', 'ResourceGap', 'EnvironmentFriction'],
  Psychological: ['Inconsistency', 'FearOfFailure', 'Perfectionism', 'LowConfidence', 'UnrealisticExpectations'],
  Cognitive: ['FocusFragility', 'CognitiveFatigue', 'SkillGap'],
  Behavioural: ['ProcrastinationPattern', 'Overcommitment'],
};

// --- Stone → Category lookup ---

export const STONE_TO_CATEGORY: Record<StoneType, StoneCategory> = {
  TimeConstraint: 'Logistical',
  ResourceGap: 'Logistical',
  EnvironmentFriction: 'Logistical',
  Inconsistency: 'Psychological',
  FearOfFailure: 'Psychological',
  Perfectionism: 'Psychological',
  LowConfidence: 'Psychological',
  UnrealisticExpectations: 'Psychological',
  FocusFragility: 'Cognitive',
  CognitiveFatigue: 'Cognitive',
  SkillGap: 'Cognitive',
  ProcrastinationPattern: 'Behavioural',
  Overcommitment: 'Behavioural',
};

// --- Descriptions for prompt injection ---

export const STONE_DESCRIPTIONS: Record<StoneType, string> = {
  TimeConstraint:           'Not enough consistent time available for meaningful progress',
  ResourceGap:              'Missing equipment, tools, environment, or financial access',
  EnvironmentFriction:      'Physical or social environment makes practice difficult',
  Inconsistency:            'Restart cycles — starts strong, drops off, repeats',
  FearOfFailure:            'Avoidance and hesitation driven by fear of poor outcomes',
  Perfectionism:            'Blocked by the need for conditions to be perfect before starting',
  LowConfidence:            'Self-doubt undermines execution despite having the capability',
  UnrealisticExpectations:  'Fantasy timeline or outcome detached from reality',
  FocusFragility:           'Difficulty maintaining deep focus for sustained periods',
  CognitiveFatigue:         'Mental exhaustion limits learning quality and retention',
  SkillGap:                 'Missing foundational knowledge required for the goal',
  ProcrastinationPattern:   'Delay loops — knows what to do but repeatedly postpones',
  Overcommitment:           'Too many parallel goals dilute focus and energy',
};

// --- Domain-specific READINESS gaps ---
// These are psychological and behavioural patterns Agent 2 probes to uncover stones.
// They are NOT data-collection questions (goal/timeline/dailyTime/skillLevel are already known).
// Each item maps to a pattern that, if detected, changes the curriculum significantly.

export const DOMAIN_READINESS_GAPS: Record<string, string[]> = {
  Cognitive: [
    'Past study/learning attempts — what specifically caused them to stall or stop (Inconsistency / ProcrastinationPattern)',
    'Response when understanding breaks down — do they push through, seek help, or quietly disengage and avoid the material (FocusFragility / LowConfidence)',
    'Study environment and focus quality — what does their actual study setup look like? Dedicated desk, shared space, noisy? What competes for attention during a session? (EnvironmentFriction)',
    'Perfectionism tendency — do they rewrite notes endlessly, delay starting until conditions are perfect, or struggle to move forward without complete understanding (Perfectionism)',
    'Accountability style — do they need external check-ins, deadlines, or study partners, or are they reliably self-directed (Inconsistency)',
  ],
  Kinesthetic: [
    'Past injury, burnout, or overtraining history — patterns of going too hard then stopping (Overcommitment / Inconsistency)',
    'Response to a missed session — skip the whole week and restart, or find a minimal version same day (ProcrastinationPattern)',
    'Structural access friction — for gym/studio goals: does commute, schedule conflict, or equipment access make sessions hard to start? For home training: does space setup or interruptions disrupt sessions? (EnvironmentFriction)',
    'Solo vs. structured accountability preference — self-motivated or needs a class/partner/coach to show up (Inconsistency)',
    'Emotional relationship with physical effort and discomfort — avoidance of hard days, or willing to push through (FearOfFailure)',
  ],
  Career: [
    'Previous pivot or project attempts that stalled — what derailed them and when (Inconsistency / ProcrastinationPattern)',
    'Fear of visibility or judgment — reluctance to share work, network, or put work in front of others (FearOfFailure)',
    'Competing obligations right now — active projects, job pressure, or family load that competes for attention (Overcommitment / TimeConstraint)',
    'Confidence in their own readiness — do they feel qualified to take this step or are they waiting to feel ready (LowConfidence)',
    'Tendency to overplan and under-execute — research loops, course-buying, delayed first action (ProcrastinationPattern)',
  ],
  Financial: [
    'Past money decisions that went wrong and the emotional aftermath — risk aversion pattern (FearOfFailure)',
    'Impulsive vs. over-cautious decision-making under uncertainty (UnrealisticExpectations / FearOfFailure)',
    'Competing financial pressures right now — debt, dependents, job insecurity (TimeConstraint / Overcommitment)',
    'Tendency to consume financial content without acting — analysis paralysis pattern (ProcrastinationPattern)',
    'Accountability structure for financial commitments — do they need external tracking or are they self-enforcing (Inconsistency)',
  ],
  Creative: [
    'Past creative projects abandoned mid-way — what caused the stop and how they felt about it (Inconsistency / FearOfFailure)',
    'Relationship with sharing work publicly — avoidance, anxiety, or craving external validation (FearOfFailure / Perfectionism)',
    'Creative perfectionism — do they struggle to ship imperfect work, endlessly tweak, avoid getting started (Perfectionism)',
    'Feedback sensitivity — do critical responses cause them to disengage or motivate them (LowConfidence / FearOfFailure)',
    'Creative environment — dedicated space and routine, or fits in whenever inspiration strikes (EnvironmentFriction)',
  ],
  Health: [
    'Previous behaviour change attempts (diet, sleep, wellness) — how far they got and what exactly broke it (Inconsistency)',
    'Response to relapse or setback — shame-spiral and restart from zero, or small correction and continue (ProcrastinationPattern / Inconsistency)',
    'Environmental triggers and social resistance — does their home/work environment actively undermine the change (junk food in the house, unsupportive partner, social pressure)? (EnvironmentFriction)',
    'Stress-behaviour link — do they fall back on old habits during high-stress periods, and how long recovery takes (Inconsistency / CognitiveFatigue)',
    'All-or-nothing thinking — do they abandon the goal entirely after one bad day rather than treating it as a dip (Perfectionism / Inconsistency)',
  ],
  Lifestyle: [
    'Previous habit-building attempts — what phase they typically reach before the habit collapses and what triggers the collapse (Inconsistency)',
    'Resilience after a skip — do they restart the next day or does a missed day spiral into weeks off (ProcrastinationPattern)',
    'Accountability preference — solo discipline, accountability partner, app tracking, or public commitment (Inconsistency)',
    'Competing demands and displacement — what existing routine would this habit replace or compete with? What will they give up? (Overcommitment / TimeConstraint)',
    'Context friction — does their daily context (home setup, schedule, social environment) actively support or resist this habit? What is the single biggest structural barrier? (EnvironmentFriction)',
  ],
  Hybrid: [
    'Which sub-domain feels more uncertain or threatening — energy and attention will gravitate to the easier one (FocusFragility)',
    'Previous multi-domain attempts — did they manage both or did one always crowd out the other (Overcommitment)',
    'Decision-making style when progress stalls in one area — do they pivot focus or persist (ProcrastinationPattern)',
    'Self-belief gap between domains — confident in one, secretly doubting the other (LowConfidence)',
  ],
};

// Legacy export kept for any references still pointing to the old name
export const DOMAIN_GAPS = DOMAIN_READINESS_GAPS;

// Flat list of all valid stone types for validation
export const ALL_STONE_TYPES = Object.keys(STONE_TO_CATEGORY) as StoneType[];

// Severity sort order — used wherever stones are ranked so Critical/High get full
// treatment and Low gets a brief mention (Agent 3 modification instructions, Agent 4
// delivery rules).
export const SEVERITY_SORT_ORDER: Record<string, number> = { Critical: 0, High: 1, Moderate: 2, Low: 3 };

// ─────────────────────────────────────────────────────────────────────────────
// STONE PERSONALITIES — Evidence-based behavioral archetypes
//
// Used by Agent 3 and Agent 4 to select interventions grounded in peer-reviewed
// research rather than flat "if FearOfFailure → do X" injection.
// ─────────────────────────────────────────────────────────────────────────────

export interface StonePersonality {
  archetype: string;
  coreBelief: string;
  manifests_as: string[];
  validated_scale: string;
  big_five_correlates: string[];
  evidence_based_interventions: string[];
  recalibration_note: string;
}

export const STONE_PERSONALITIES: Record<StoneType, StonePersonality> = {

  // ── LOGISTICAL ──────────────────────────────────────────────────────────────

  TimeConstraint: {
    archetype: 'The Overloaded Optimizer',
    coreBelief: 'There is never enough time to do this properly',
    manifests_as: [
      'Sessions consistently shorter than planned',
      'Skips during high-demand weeks (not laziness — actual overload)',
      'Guilt about skipping, followed by overcorrection attempts',
      'Tends to quit entirely when they miss a streak',
    ],
    validated_scale: 'Perceived Stress Scale (Cohen 1983) — time pressure subscale',
    big_five_correlates: ['High Conscientiousness (wants to do it right)', 'High Neuroticism under load'],
    evidence_based_interventions: [
      'Minimum viable session design: 5-min version of every task (Fogg Tiny Habits)',
      'Implementation intentions: "When X happens, I will do Y instead" (Gollwitzer 1999)',
      'Time-boxing: fixed 15-min slots non-negotiable, not duration targets',
      'Habit stacking onto existing anchors to eliminate scheduling friction',
    ],
    recalibration_note: 'Severity should reduce if completion rate stays ≥70% for 10+ days; escalate if skip streaks exceed 3 days',
  },

  ResourceGap: {
    archetype: 'The Unprepared Starter',
    coreBelief: 'I cannot make real progress without the right tools',
    manifests_as: [
      'Frequently delays starting sessions due to missing equipment or setup',
      'Session quality varies widely depending on resource access',
      'May over-invest in gear once acquired (compensation)',
      'Abandons practice when preferred environment is unavailable',
    ],
    validated_scale: 'Barriers to Physical Activity Questionnaire (BPAQ)',
    big_five_correlates: ['Low Openness (prefers established methods)', 'Moderate Conscientiousness'],
    evidence_based_interventions: [
      'Environment design: lay out resources the night before (reduces activation energy)',
      'Resource triage: identify 1 non-negotiable item vs nice-to-haves',
      'Analog alternatives: every digital/physical resource has a no-equipment fallback',
      'Minimum viable environment principle: define what "good enough setup" looks like',
    ],
    recalibration_note: 'Often resolves after first sprint if environment design is built into tasks',
  },

  EnvironmentFriction: {
    archetype: 'The Context-Dependent Practitioner',
    coreBelief: 'My environment doesn\'t support this habit',
    manifests_as: [
      'Practice frequency tied to specific locations or social conditions',
      'Disruption-sensitive: noisy households, open-plan offices, shared spaces',
      'High completion when environment is right, near-zero when it isn\'t',
      'Social interference — family or flatmates actively or passively disrupt sessions',
    ],
    validated_scale: 'Context Availability Scale (Wendy Wood, 2018)',
    big_five_correlates: ['Low Extraversion (needs quiet focus)', 'High Neuroticism (ambient distraction amplifies stress)'],
    evidence_based_interventions: [
      'Context cue design: dedicate one physical spot exclusively to this habit',
      'Friction audit: identify and remove top 3 environmental blockers',
      'Social contract: communicate session times to household members',
      'Portable minimum: a version of the practice that works in any environment',
    ],
    recalibration_note: 'Severity is context-dependent; don\'t reduce based on good streaks in ideal conditions',
  },

  // ── PSYCHOLOGICAL ────────────────────────────────────────────────────────────

  Inconsistency: {
    archetype: 'The Cyclical Restarter',
    coreBelief: 'I always start strong but it never sticks',
    manifests_as: [
      'Weeks 1-3: high motivation, over-execution',
      'Weeks 3-6: frequency drops, skips increase',
      'Week 6+: full stop, often followed by shame',
      'External locus of attribution ("life got in the way")',
      'History of 3+ abandoned attempts at similar goals',
    ],
    validated_scale: 'Habit automaticity: Self-Report Behavioural Automaticity Index (SRBAI, Gardner 2012)',
    big_five_correlates: ['Low Conscientiousness (r=−0.41)', 'High Neuroticism (r=0.33)'],
    evidence_based_interventions: [
      'Never miss twice rule: the skip policy is more important than the session (James Clear)',
      'Commitment devices: advance booking, accountability partner, public commitment',
      'Plateau warning: explicitly tell user about the Week 3-6 valley (Lally UCL 2010)',
      'Process identity: "I am someone who shows up" — not "I am training for X"',
      'Minimum daily marker: even a 2-min "I showed up" counts toward streak',
    ],
    recalibration_note: 'Primary indicator: rolling 7-day completion rate. Escalate if it falls below 60% for 2 consecutive weeks',
  },

  FearOfFailure: {
    archetype: 'The Performer',
    coreBelief: 'My worth depends on my results',
    manifests_as: [
      'Avoidance of tasks with visible failure outcomes',
      'Perfectionist execution when they do act',
      'Reframing quitting as "strategic pivot" or "not the right time"',
      'Reluctance to share progress publicly or invite feedback',
      'Difficulty starting tasks that involve judgment from others',
    ],
    validated_scale: 'PFAI — Performance Failure Appraisal Inventory (Conroy 2001)',
    big_five_correlates: ['High Neuroticism (r=0.48)', 'Low Conscientiousness under threat'],
    evidence_based_interventions: [
      'Reframe tasks as experiments, not performances (process vs. outcome focus)',
      'Process-based success criteria (effort) not outcome-based',
      'Gradual exposure: private → small public → full public artifacts (exposure therapy)',
      'Self-compassion practices — Neff\'s MSC framework (Neff 2003)',
      'Decoupling self-worth from performance in journal/reflection prompts',
    ],
    recalibration_note: 'Severity decays after 3 consecutive public artifact completions; escalate if user adds "bonus" failure framing to task feedback',
  },

  Perfectionism: {
    archetype: 'The Condition-Setter',
    coreBelief: 'It only counts if it is done properly',
    manifests_as: [
      'Blocks on starting until conditions are perfect',
      'Session quality anxiety: reports dissatisfaction even after completing',
      'Minimal answers about what went wrong (won\'t admit struggle)',
      'Rewrites or restarts rather than building on imperfect work',
      'All-or-nothing: partial completion is treated as failure',
    ],
    validated_scale: 'MPS-F — Multidimensional Perfectionism Scale (Frost 1990)',
    big_five_correlates: ['High Conscientiousness (r=0.35)', 'High Neuroticism (concern over mistakes r=0.52)'],
    evidence_based_interventions: [
      '"Good enough" threshold: explicitly define what passes for each task',
      'Anti-perfectionism tasks: deliberately submit imperfect drafts',
      'Completion logging: quantity of attempts counts, not quality score',
      'Two-minute rule: just start — quality emerges from repetition (Fogg 2019)',
      'Error normalization: reframe mistakes as data, not verdicts',
    ],
    recalibration_note: 'Watch for "skip but explain" patterns — perfectionism often looks like a legitimate excuse',
  },

  LowConfidence: {
    archetype: 'The Qualified Doubter',
    coreBelief: 'I don\'t actually have what it takes',
    manifests_as: [
      'Hedged language in answers: "I guess", "maybe", "sort of"',
      'High self-efficacy gap: knows the steps, doubts their own execution',
      'Seeks external validation before acting',
      'Avoids public commitment to avoid accountability',
      'Interprets normal struggle as evidence of inadequacy',
    ],
    validated_scale: 'GSE — General Self-Efficacy Scale (Schwarzer & Jerusalem 1995)',
    big_five_correlates: ['High Neuroticism (r=−0.55 with self-efficacy)', 'Low Extraversion'],
    evidence_based_interventions: [
      'Mastery experiences: design early tasks with guaranteed success (Bandura 1977)',
      'Vicarious modeling: show evidence that similar people succeeded',
      'Verbal persuasion: affirmative framing in coaching language',
      'Small wins architecture: momentum before challenge (Amabile & Kramer 2011)',
      'Self-efficacy journaling: log evidence of capability after each session',
    ],
    recalibration_note: 'Self-efficacy builds through action, not reassurance; keep early tasks achievable and remove ambiguity',
  },

  UnrealisticExpectations: {
    archetype: 'The Fantasy Planner',
    coreBelief: 'I should be much further along by now',
    manifests_as: [
      'Sets aggressive timelines without backing (importance < 6 despite stated urgency)',
      'Rapid disappointment when early results are normal/slow',
      'Abandons goals after 2-3 weeks as "not working"',
      'Compares their Week 2 to others\' Year 2',
      'Motivation spikes correlate with new starts, not sustained effort',
    ],
    validated_scale: 'FOMO Scale + Unrealistic Optimism Scale (Weinstein 1980)',
    big_five_correlates: ['High Openness (novelty-seeking)', 'Low Conscientiousness (planning deficit)'],
    evidence_based_interventions: [
      'Timeline reality calibration: show research-backed typical timelines at onboarding',
      'Milestone anchoring: focus on next 14 days only — shield from long-term anxiety',
      'Progress normalization: "plateau is normal — 90% of users experience this at week 3"',
      'Expectation log: document specific expected outcomes each week, review reality vs expectation',
    ],
    recalibration_note: 'Severity often peaks at Day 14-21; watch for dropout signals at first plateau',
  },

  // ── COGNITIVE ────────────────────────────────────────────────────────────────

  FocusFragility: {
    archetype: 'The Distracted Thinker',
    coreBelief: 'I can\'t concentrate long enough to make real progress',
    manifests_as: [
      'Task switching within sessions — reports "losing focus" frequently',
      'Phone, notifications, and ambient interruptions cited in feedback',
      'Short deep-work tolerance: struggles beyond 20-25 min focus blocks',
      'Higher performance in structured environments vs. open-ended ones',
      'Reports feeling "scattered" even after completing tasks',
    ],
    validated_scale: 'BRIEF-A — Behavior Rating Inventory of Executive Function (Roth 2005)',
    big_five_correlates: ['Low Conscientiousness (attention regulation r=−0.40)', 'High Openness (gets bored)'],
    evidence_based_interventions: [
      'Pomodoro architecture: 25-min focused blocks, 5-min breaks (Cirillo 1992)',
      'Pre-session ritual: 3-item task list written before starting eliminates decision fatigue',
      'Single-tasking protocol: close all non-essential tabs/apps before session',
      'Attention restoration: 5-min outdoor/nature break between blocks (Kaplan 1995)',
      'Progressive focus training: start at 15-min blocks, extend by 5 min per week',
    ],
    recalibration_note: 'Task format matters: active/kinesthetic tasks tolerate this better than reading/study tasks',
  },

  CognitiveFatigue: {
    archetype: 'The Depleted Performer',
    coreBelief: 'My brain just doesn\'t work after [trigger]',
    manifests_as: [
      'Strong correlation between session quality and time-of-day (reported in feedback)',
      'Difficulty with complex/reasoning tasks later in the day',
      'Difficulty rating spikes on cognitively dense tasks',
      'Reports high completion but low quality on "tired" days',
      'Skips correlate with high-stress or cognitively demanding work days',
    ],
    validated_scale: 'Multidimensional Fatigue Inventory (MFI-20, Smets 1995)',
    big_five_correlates: ['High Neuroticism (cognitive fatigue amplification)', 'Low Openness to effort under fatigue'],
    evidence_based_interventions: [
      'Session timing optimization: schedule practice at identified energy peak (morning vs. evening)',
      'Cognitive load leveling: alternate high-density and low-density days',
      'Sleep hygiene integration: fatigue tracking + sleep quality prompts',
      'Energy-first task design: most demanding content at session start when cognitive resources peak',
      'Recovery tasks: explicitly schedule low-effort consolidation days post high-load days',
    ],
    recalibration_note: 'Energy pattern data from onboarding (energyPattern field) directly calibrates session timing recommendations',
  },

  SkillGap: {
    archetype: 'The Foundation Seeker',
    coreBelief: 'I am missing something fundamental that everyone else already has',
    manifests_as: [
      'Confusion or overwhelm at intermediate-level content designed for their stated level',
      'Difficulty connecting new concepts to existing knowledge',
      'Frequently revisits earlier material before progressing',
      'Imposter syndrome signals: questions their readiness to start',
    ],
    validated_scale: 'Dreyfus Stage Diagnostic — Novice vs. Advanced Beginner self-assessment',
    big_five_correlates: ['Low Openness (prefers known territory)', 'High Conscientiousness (wants to "do it right" before moving on)'],
    evidence_based_interventions: [
      'Prerequisite audit at onboarding: surface gaps before they derail',
      'Foundation phase extension: 30→40% of timeline for high-severity SkillGap',
      'Scaffolded sequencing: no concept introduced without its prerequisite',
      'Worked examples before independent practice (Sweller Cognitive Load Theory 1988)',
      'Confidence calibration: rate perceived understanding after each concept',
    ],
    recalibration_note: 'Severity should decrease if difficulty ratings drop after Foundation phase; flag if it persists into Development',
  },

  // ── BEHAVIOURAL ──────────────────────────────────────────────────────────────

  ProcrastinationPattern: {
    archetype: 'The Strategic Delayer',
    coreBelief: 'I will definitely do this — just not right now',
    manifests_as: [
      'Knows exactly what to do but initiates late or not at all',
      'Task initiation is the hardest part — once started, performs well',
      'Builds elaborate plans that substitute for execution',
      'Guilt cycles: delay → guilt → more delay',
      'Temporal discounting: overvalues comfort now vs. progress later',
    ],
    validated_scale: 'Pure Procrastination Scale (Steel 2010) — most cited procrastination measure',
    big_five_correlates: ['Low Conscientiousness (r=−0.62, strongest known correlate — Steel 2007)', 'High Neuroticism (r=0.37)'],
    evidence_based_interventions: [
      'Task segmentation: only commit to the first 2 minutes (reduces initiation resistance)',
      'Temptation bundling: pair unpleasant tasks with enjoyable activities (Milkman 2014)',
      'Implementation intentions: "I will do X at Y time in Z location" reduces delay by 2-3× (Gollwitzer 1999)',
      'Commit-and-review: check in at fixed time of day, not just at task completion',
      'Reward immediacy: immediate small reward on start, not on completion',
    ],
    recalibration_note: 'Watch for pattern of "completed late in the day" — a signal of initiation resistance even when not skipping',
  },

  Overcommitment: {
    archetype: 'The Enthusiastic Overreacher',
    coreBelief: 'I can handle more than most people',
    manifests_as: [
      'Runs multiple parallel goals simultaneously',
      'Signs up with high enthusiasm, drops within 3-4 weeks as energy depletes',
      'Reports that other goals are competing for the same time/energy',
      'Underestimates actual effort per task before starting',
      'Struggles to say no to new commitments',
    ],
    validated_scale: 'Behavioural Activation System (BAS) — reward sensitivity scale (Carver & White 1994)',
    big_five_correlates: ['High Extraversion (novelty-seeking, r=0.31)', 'Low Conscientiousness (poor effort estimation)'],
    evidence_based_interventions: [
      'Capacity audit at onboarding: list all current commitments, estimate time, surface conflicts',
      'Single goal prioritization: one primary goal only during Foundation phase',
      'Energy budget framing: finite daily energy → this goal costs X energy units per session',
      'Planned deload weeks: reduce volume by 40% every 4th week to prevent burnout (sports science)',
      'Decision log: document what they are choosing NOT to do to protect this goal',
    ],
    recalibration_note: 'Severity predictably peaks at Week 4-6; design a lighter week at Day 28 preemptively',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STONE → CURRICULUM MODIFICATION MAP
// Concrete curriculum changes for each stone type. Single source of truth,
// consumed both by Agent 3's default prompt-injection path (curriculum-builder.ts)
// and by the get_stone_interventions tool (src/lib/agentTools.ts) when
// USE_AGENT_TOOL_CALLING is on — so the two paths can never drift apart.
// ─────────────────────────────────────────────────────────────────────────────

export const STONE_MODIFICATIONS: Record<string, string> = {
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

// ─────────────────────────────────────────────────────────────────────────────
// STONE RECALIBRATION MATRIX
// Per-stone directive for each recalibration status. Single source of truth,
// consumed both by Agent 5's default prompt-injection path (recalibrator.ts)
// and by the get_stone_recalibration_directives tool (src/lib/agentTools.ts)
// when USE_AGENT_TOOL_CALLING is on.
// ─────────────────────────────────────────────────────────────────────────────

/** ACCELERATE | MAINTAIN | SIMPLIFY | RECOVER — Agent 5's weekly recalibration status. */
export type RecalibrationStatus = 'ACCELERATE' | 'MAINTAIN' | 'SIMPLIFY' | 'RECOVER';

export const STONE_RECALIBRATION_MATRIX: Partial<Record<StoneType, Record<RecalibrationStatus, string>>> = {
  TimeConstraint: {
    ACCELERATE: 'User is thriving within time limits. Keep micro-block structure but allow slightly longer sessions (up to 10% over budget). Introduce one optional extension step per task marked BONUS.',
    MAINTAIN: 'Keep strict time-boxing. Reconfirm every task fits the daily budget. Add one "parking lot" tip so they can stop guilt-free if time runs out.',
    SIMPLIFY: 'Reduce every task by 20% in scope. Split any 2-step tasks into 2 separate day entries. Never exceed budget. Add micro-win at start of each task (<3 min Starter Step).',
    RECOVER: 'Sprint must be completable in 50% of declared daily time. All tasks start with a 2-minute Starter Step. Include a "15-minute win" fallback inside every task description.'
  },

  ProcrastinationPattern: {
    ACCELERATE: 'User is initiating consistently. Introduce slightly more open-ended tasks — reduce scripted micro-steps; trust them to start. Add one reflective question at task end.',
    MAINTAIN: 'Keep Starter Step on every task. Vary the Starter Step so it doesn\'t feel routine (mix physical set-up, verbal declaration, or time-lapse write). Implementation intention tip weekly.',
    SIMPLIFY: 'Starter Step must be ≤90 seconds and physical (open the app, put on gloves, uncap the pen). Add "When–Then" prompt before the main task steps. Reduce step count to ≤3 per task.',
    RECOVER: 'Every task is a Starter Step only — nothing beyond a 3-minute entry point. Label them "Ignition Day". No multi-step sequences. Goal is to re-establish the initiation habit.'
  },

  Inconsistency: {
    ACCELERATE: 'Streak is healthy. Introduce a weekly "make-up" option so they know missing once is safe. Add one creative exploration day mid-sprint to break monotony.',
    MAINTAIN: 'Keep Never Miss Twice rule prominent. Add a "minimum viable session" footnote to each task (e.g., "If short on time: just do Step 1 — 3 min counts"). Celebrate streaks verbally in tips.',
    SIMPLIFY: 'Reduce task variety — repeat similar task structures so the habit feels automatic. Each task ends with "minimum viable tomorrow" preview. Add explicit rest day framing.',
    RECOVER: 'Sprint goal: show up 8 out of 14 days — not 14 out of 14. Each task labelled "Consistency Day". Micro-win first, rest is bonus. Never Miss Twice reminder in personalizedMessage.'
  },

  FearOfFailure: {
    ACCELERATE: 'User is building confidence. Introduce one "challenge rep" at the end of each task — optional, higher difficulty, framed as an experiment. Keep observation-based success criteria.',
    MAINTAIN: 'Keep "Experiment:" framing and observation-based criteria. One task per week is explicitly labelled "Safe Attempt" — outcome irrelevant, data collection only.',
    SIMPLIFY: 'All tasks reframe failure as data. Replace success criteria with "What did you notice?" prompts. Add a "This is allowed to be messy" line in every task tip.',
    RECOVER: 'Sprint is a "Curiosity Sprint" — no performance goals, only observations. Each task starts with "This is an experiment". Success = showing up, not results. Coach\'s Brief must validate that struggling is information, not failure.'
  },

  Perfectionism: {
    ACCELERATE: 'User is releasing good work. Introduce one "polish day" per week — a dedicated refinement session — so perfectionism has a sanctioned outlet. Rest is rough-draft mode.',
    MAINTAIN: 'Keep ROUGH DRAFT TASK framing. Each task has an explicit time-box. Add "Done > Perfect" reminder in tips. One task per week: practise on purpose letting something be "good enough".',
    SIMPLIFY: 'Every task is labelled "ROUGH DRAFT". Hard time-box on every step. Add STOP HERE marker after 80% of budget. Permission to Fail tip required in every task. Success criteria: started AND stopped on time.',
    RECOVER: 'Sprint goal: finish on time, not perfectly. Each task ends with a mandatory "Exit at time" step. Coach\'s Brief must reframe productivity as showing up, not output quality. Add "abandon cleanly" practise task.'
  },

  Overcommitment: {
    ACCELERATE: 'User is staying in scope — great signal. Introduce optional stretch task at end of sprint week (not mid-week). Keep hard cap but widen to 95% of budget.',
    MAINTAIN: 'Keep hard cap at 85% of budget. STOP HERE marker required. Weekly "scope check" in tips: "Is your list of tasks this week realistic?"',
    SIMPLIFY: 'Hard cap reduced to 75% of budget. Each task must have a "minimum viable version" that fits in 50% of budget. Remove any optional steps entirely.',
    RECOVER: 'Cap estimatedMinutes at 60% of budget. Each task is single-focus — one skill, one drill, one output. All multi-part tasks split across separate days. Coach\'s Brief: recovery means doing less, not failing.'
  },

  SkillGap: {
    ACCELERATE: 'Foundation is solid. Push into intermediate concepts. Replace review repetitions with novel applications of the skill. Reduce scaffolding.',
    MAINTAIN: 'Keep scaffolded steps. One review task per week to consolidate. Progressive complexity: each week adds one new micro-skill on top of last week.',
    SIMPLIFY: 'Insert 2 dedicated "foundation review" days this sprint. Break complex tasks into single-skill drills. Add a "prerequisite check" step at start of each task.',
    RECOVER: 'Sprint is a foundation rebuild. Map every task to one specific prerequisite skill. No advancement until fundamentals are confirmed. Coach\'s Brief explains why rebuilding is faster than continuing.'
  },

  CognitiveFatigue: {
    ACCELERATE: 'Cognitive load is manageable. Introduce one "deep work" session (uninterrupted, 1.5× normal time) per week as an optional upgrade.',
    MAINTAIN: 'Keep Pomodoro framing. Space complex tasks across days. Avoid back-to-back high-load tasks in the same sprint week.',
    SIMPLIFY: 'No task should require more than one major cognitive operation. Split complex analysis + creation tasks into 2 days. Add a 5-min decompression step at task end.',
    RECOVER: 'Sprint is low-intensity — review and consolidation only. No new concepts. Short sessions (50% budget). End each task with a 2-min "brain dump" journaling step to offload working memory.'
  },

  FocusFragility: {
    ACCELERATE: 'Focus is strong. Introduce one extended session per week with fewer interruption safeguards. Let them work with fewer micro-breaks.',
    MAINTAIN: 'Keep environment setup step at start. Pomodoro blocks. Clear "end trigger" at task close so they know when to stop.',
    SIMPLIFY: 'Tasks must start with a 3-step environment setup ritual (phone away, timer set, water ready). Reduce task scope to one uninterrupted block. Add "distraction log" optional step.',
    RECOVER: 'Sprint is a "focus rehabilitation" sprint. Each task starts with a 5-min body scan + environment check. Sessions capped at 20 min with mandatory 5-min rest. No context-switching within a session.'
  },

  LowConfidence: {
    ACCELERATE: 'Confidence is building. Introduce peer comparison context ("Most beginners reach X by week N — you\'re on track"). Add one "teach it back" moment per week.',
    MAINTAIN: 'Keep evidence-building language. Each task ends with a "what I proved today" prompt. Celebrate incremental wins explicitly in tips.',
    SIMPLIFY: 'All tasks start with a recap of what they already know ("You can already X — today builds on that"). Success criteria emphasise effort, not outcome. Eliminate any language implying judgment.',
    RECOVER: 'Sprint is a "proof of competence" sprint — tasks are reviews of already-learned skills at reduced difficulty. Goal: rebuild evidence of capability. Coach\'s Brief must list 3 specific things they have already learned this sprint.'
  },

  UnrealisticExpectations: {
    ACCELERATE: 'User is recalibrating well. Introduce milestone preview: show them the next phase outcome so they can see how far they\'ve come and where they\'re going.',
    MAINTAIN: 'Keep expectation-setting language. Weekly "reality check" in tips: "Here\'s where most learners are at this point — you\'re [comparison]."',
    SIMPLIFY: 'Reframe sprint goal as a process milestone, not an outcome milestone. Reduce declared success criteria. Add "typical learner timeline" note to each task to normalise pace.',
    RECOVER: 'Sprint opens with a Coach\'s Brief that recalibrates the overall goal timeline based on actual data. Explicit statement: "You\'re not behind — the original plan was optimistic." All tasks are process-focused, no outcome metrics.'
  },

  ResourceGap: {
    ACCELERATE: 'Access to resources is not a blocker. Maintain resource links but allow them to explore alternative channels if they\'ve found better ones.',
    MAINTAIN: 'Keep curated resource links. Provide one backup resource per task in case primary is unavailable.',
    SIMPLIFY: 'All resources must be free and immediately accessible (no sign-up, no paywall). Provide offline-capable alternatives where possible.',
    RECOVER: 'Sprint uses only zero-cost, no-barrier resources. Add a "no-resource fallback" step to each task that requires only practice, not content consumption.'
  },

  EnvironmentFriction: {
    ACCELERATE: 'Environment is optimised. Introduce one "novel environment" challenge per sprint (practise in a different location) to build adaptability.',
    MAINTAIN: 'Keep environment setup step. Weekly "environment audit" tip: "Is your practice space still serving you?"',
    SIMPLIFY: 'Each task includes a "minimum viable environment" note — what is the least setup required to do this task. Tasks are designed to work in sub-optimal conditions.',
    RECOVER: 'Sprint tasks are fully environment-agnostic — can be done anywhere, anytime, with no equipment. Coach\'s Brief identifies one specific environment barrier and offers a concrete workaround.'
  },
};
