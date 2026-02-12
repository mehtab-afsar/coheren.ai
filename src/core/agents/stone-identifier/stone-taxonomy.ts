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

// --- Domain-specific variable gaps (what Agent 2 needs to uncover per domain) ---

export const DOMAIN_GAPS: Record<string, string[]> = {
  Cognitive: [
    'daily deep-focus capacity',
    'prior knowledge level',
    'preferred learning format (video vs docs vs practice)',
    'study environment quality',
    'distractions and interruptions',
  ],
  Kinesthetic: [
    'injury history and physical limitations',
    'equipment and training space access',
    'peak energy window (morning vs evening)',
    'current fitness baseline',
    'training partner or solo',
  ],
  Career: [
    'deadline urgency and stakes',
    'current network and resources',
    'decision-making authority',
    'fallback plan if this fails',
    'competing job or project obligations',
  ],
  Financial: [
    'current financial situation baseline',
    'risk tolerance',
    'existing knowledge of instruments',
    'monthly discretionary income',
    'short vs long-term liquidity needs',
  ],
  Creative: [
    'prior creative work and portfolio',
    'tools and software access',
    'public vs private output',
    'creative blocks and past abandonment patterns',
    'feedback environment (solo vs community)',
  ],
  Health: [
    'current health baseline and conditions',
    'medical constraints or guidance',
    'support system availability',
    'previous attempts and what failed',
    'stress and lifestyle factors',
  ],
  Lifestyle: [
    'current routine structure',
    'accountability mechanisms',
    'social support or resistance',
    'competing habits already in place',
    'environment design capacity',
  ],
  Hybrid: [
    'which sub-domain is primary',
    'resource allocation between domains',
    'conflicting schedule demands',
    'prior experience in each domain',
  ],
};

// Flat list of all valid stone types for validation
export const ALL_STONE_TYPES = Object.keys(STONE_TO_CATEGORY) as StoneType[];
