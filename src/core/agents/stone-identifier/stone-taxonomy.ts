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
    'Past study/learning attempts — what caused them to stall or stop (Inconsistency / ProcrastinationPattern)',
    'Response when understanding breaks down — do they push through, seek help, or quietly disengage (FocusFragility / LowConfidence)',
    'Real study environment quality — interruptions, noise, comfortable setup, or friction every session (EnvironmentFriction)',
    'Perfectionism tendency — do they rewrite notes endlessly, delay starting until conditions are perfect (Perfectionism)',
    'Accountability style — do they need external check-ins or are they reliably self-directed (Inconsistency)',
  ],
  Kinesthetic: [
    'Past injury, burnout, or overtraining history — patterns of going too hard then stopping (Overcommitment / Inconsistency)',
    'Response to a missed workout — skip and restart next week, or find a minimal version same day (ProcrastinationPattern)',
    'Training environment reliability — home, gym, outdoor, and how easily disrupted (EnvironmentFriction)',
    'Solo vs. structured accountability preference — self-motivated or needs external commitment (Inconsistency)',
    'Emotional relationship with effort and discomfort — avoidance of pain, or willing to push through it (FearOfFailure)',
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
    'Previous behaviour change attempts (diet, sleep, wellness) — how far they got and what broke it (Inconsistency)',
    'Response to relapse or setback — shame-spiral and restart from zero, or small correction and continue (ProcrastinationPattern / Inconsistency)',
    'Social support or resistance — family/friends who actively support, are neutral, or undermine the change (EnvironmentFriction)',
    'Stress-behaviour link — do they fall back on old habits during high-stress periods (Inconsistency / CognitiveFatigue)',
    'All-or-nothing thinking — do they tend to abandon a goal entirely after one bad day (Perfectionism / Inconsistency)',
  ],
  Lifestyle: [
    'Previous habit-building attempts — what phase they typically reach before the habit collapses (Inconsistency)',
    'Resilience after a skip — do they restart the next day or does a missed day spiral into weeks off (ProcrastinationPattern)',
    'Accountability preference — solo discipline, accountability partner, app tracking, or public commitment (Inconsistency)',
    'Competing habits and routines already in place — what would this habit displace (Overcommitment / TimeConstraint)',
    'Environmental support — does their physical environment make the new habit easy or does it resist it (EnvironmentFriction)',
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
