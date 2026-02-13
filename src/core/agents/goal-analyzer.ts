/**
 * Agent 1: Goal Analyzer
 *
 * Responsibilities:
 *   - Transform unstructured human intention into structured goal metadata
 *   - Classify domain + category with diagnostic branching
 *   - SMART validation with shadow self-check
 *   - Clarity & ambiguity scoring
 *   - Realism assessment (time + effort) — conservative bias
 *   - Hidden constraint detection
 *   - Risk flagging
 *   - Confidence scoring
 *
 * Rules:
 *   - Returns structured JSON only — no advice, no motivation
 *   - Conservative on realism (better to under-promise)
 *   - Powers everything downstream — must be accurate
 */

import type { Agent1Output, AgentContext } from '@types-app/agents';
import { callReasoning } from '@lib/ai-router';

const SYSTEM_PROMPT = `You are Agent 1: Goal Analyzer — a precision intelligence module.

Your sole job is to transform a human's stated goal into machine-usable structured metadata.

## Domain Classification
Classify into exactly one primary domain:
- "Cognitive"    → learning, exams, programming, languages, studying, research
- "Kinesthetic"  → sports, fitness, martial arts, dance, physical skills
- "Career"       → job search, promotion, business, entrepreneurship, freelancing
- "Financial"    → saving, investing, income, debt, net worth
- "Creative"     → writing, music, art, video, design, content creation
- "Health"       → mental health, sleep, nutrition, medical recovery
- "Lifestyle"    → habits, routines, relationships, travel, productivity
- "Hybrid"       → spans multiple domains (e.g. "fitness YouTuber" = Kinesthetic + Creative)

## Horizon Classification
- "Short-term"   → under 3 months
- "Mid-term"     → 3 months to 1 year
- "Long-term"    → over 1 year

## Intensity Classification
- "Low"      → 15-30 min/day
- "Moderate" → 30-60 min/day
- "High"     → 60-120 min/day
- "Extreme"  → 2+ hours/day

## SMART Validation — Strict
- specific:    Is the target outcome clearly defined (what, to what level)?
- measurable:  Can progress be objectively tracked or quantified?
- achievable:  Is it within plausible human limits given timeline and effort?
- relevant:    Does it match the user's apparent context and life stage?
- timeBound:   Is there a deadline, horizon, or timeline stated or implied?

## Realism Checks — Be Conservative
UNREALISTIC time: "fluent language in 1 month", "top exam in 6 weeks", "6-pack in 2 weeks"
OPTIMISTIC time: "run a marathon in 2 months (beginner)", "build a startup in 3 months"
UNREALISTIC effort: "world-class with casual practice", "get ripped without diet changes"

## Constraint Detection
Extract from phrases like: "while working full-time", "as a student", "no equipment",
"only 20 minutes a day", "I've never done X before"

## Risk Detection — Flag any of:
- Burnout risk (extreme intensity + long timeline)
- Vague fantasy (no concrete measurable outcome)
- Over-ambition (goal scope >> stated timeline)
- Conflicting priorities (multiple incompatible goals)
- Experience gap (advanced goal with zero background)

## Scoring
clarityScore 0.0–1.0: 1.0=perfectly defined, 0.5=partially defined, 0.0="be better"
ambiguityScore 0.0–1.0: 0.0=crystal clear, 1.0=contradictory/undecipherable
confidence 0.0–1.0: Your confidence this analysis is accurate given available information

## Rules
- Return ONLY valid JSON — no markdown, no explanation, no commentary
- Be analytical and precise, never motivational
- Never hallucinate context not present in the input`;

function buildUserPrompt(context: AgentContext): string {
  return `Analyze this goal:

Goal: "${context.goal}"
User's Timeline: ${context.timeline} days
Daily Time Available: ${context.dailyTimeAvailable} minutes

Return a JSON object with this exact schema:
{
  "goalAnalysis": {
    "goal": "normalized goal statement",
    "domain": "Cognitive|Kinesthetic|Career|Financial|Creative|Health|Lifestyle|Hybrid",
    "subDomains": ["additional domain if Hybrid, else empty array"],
    "category": "specific category within domain",
    "horizon": "Short-term|Mid-term|Long-term",
    "intensity": "Low|Moderate|High|Extreme",
    "clarityScore": 0.0,
    "ambiguityScore": 0.0,
    "confidence": 0.0,
    "smartStatus": {
      "specific": true,
      "measurable": true,
      "achievable": true,
      "relevant": true,
      "timeBound": true
    },
    "missingSMART": ["specific|measurable|achievable|relevant|timeBound"],
    "realismChecks": {
      "timeRealism": "Realistic|Optimistic|Unrealistic|Unknown",
      "effortRealism": "Realistic|Optimistic|Unrealistic|Unknown"
    },
    "constraintsDetected": [],
    "risksDetected": [],
    "complexity": "beginner|intermediate|advanced",
    "learningTypes": ["physical|cognitive|creative|social|mental"],
    "typicalTimeline": {
      "minimum": "X weeks",
      "realistic": "X-Y months",
      "mastery": "X-Y years"
    },
    "keyMilestones": ["milestone 1", "milestone 2"],
    "successCriteria": ["criteria 1", "criteria 2"],
    "prerequisites": ["prereq 1"],
    "commonObstacles": ["obstacle 1", "obstacle 2"]
  }
}`;
}

function validateAndNormalize(raw: unknown): Agent1Output {
  const parsed = raw as Agent1Output;
  const g = parsed?.goalAnalysis;

  if (!g || typeof g !== 'object') {
    throw new Error('Agent 1: Missing goalAnalysis in response');
  }

  // Enforce valid domain
  const validDomains = ['Cognitive', 'Kinesthetic', 'Career', 'Financial', 'Creative', 'Health', 'Lifestyle', 'Hybrid'];
  if (!validDomains.includes(g.domain)) g.domain = 'Cognitive';

  // Enforce valid horizon
  const validHorizons = ['Short-term', 'Mid-term', 'Long-term'];
  if (!validHorizons.includes(g.horizon)) g.horizon = 'Mid-term';

  // Enforce valid intensity
  const validIntensities = ['Low', 'Moderate', 'High', 'Extreme'];
  if (!validIntensities.includes(g.intensity)) g.intensity = 'Moderate';

  // Clamp scores to [0, 1]
  g.clarityScore = Math.min(1, Math.max(0, g.clarityScore ?? 0.5));
  g.ambiguityScore = Math.min(1, Math.max(0, g.ambiguityScore ?? 0.5));
  g.confidence = Math.min(1, Math.max(0, g.confidence ?? 0.5));

  // Ensure arrays
  g.subDomains ??= [];
  g.missingSMART ??= [];
  g.constraintsDetected ??= [];
  g.risksDetected ??= [];
  g.keyMilestones ??= [];
  g.successCriteria ??= [];
  g.prerequisites ??= [];
  g.commonObstacles ??= [];
  g.learningTypes ??= [];

  // Ensure smartStatus
  g.smartStatus ??= { specific: false, measurable: false, achievable: true, relevant: true, timeBound: false };

  // Sync missingSMART from smartStatus (source of truth)
  const smartKeys = ['specific', 'measurable', 'achievable', 'relevant', 'timeBound'] as const;
  g.missingSMART = smartKeys.filter(k => !g.smartStatus[k]);

  // Ensure realismChecks
  const validRealism = ['Realistic', 'Optimistic', 'Unrealistic', 'Unknown'];
  g.realismChecks ??= { timeRealism: 'Unknown', effortRealism: 'Unknown' };
  if (!validRealism.includes(g.realismChecks.timeRealism)) g.realismChecks.timeRealism = 'Unknown';
  if (!validRealism.includes(g.realismChecks.effortRealism)) g.realismChecks.effortRealism = 'Unknown';

  // Ensure typicalTimeline
  g.typicalTimeline ??= { minimum: 'Unknown', realistic: 'Unknown', mastery: 'Unknown' };

  // Ensure complexity
  const validComplexity = ['beginner', 'intermediate', 'advanced'];
  if (!validComplexity.includes(g.complexity)) g.complexity = 'beginner';

  return parsed;
}

export async function analyzeGoal(context: AgentContext): Promise<Agent1Output> {
  const { content } = await callReasoning({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(context) },
    ],
    temperature: 0.2,  // Low: analytical precision, not creative
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });
  if (!content) {
    throw new Error('Agent 1: No response received from model');
  }

  const raw = JSON.parse(content) as unknown;
  return validateAndNormalize(raw);
}
