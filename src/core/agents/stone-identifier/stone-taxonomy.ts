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
