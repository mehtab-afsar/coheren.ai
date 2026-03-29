/**
 * Agent 2 — Mode 2: Stone Extractor
 *
 * Takes user answers to the diagnostic questions and maps them
 * to the stone taxonomy. Produces a behavioral profile (StoneProfile)
 * that downstream agents (3 and 5) use to personalize the curriculum.
 *
 * Runs AFTER the user has answered Mode 1 questions.
 */

import type {
  Agent1Output,
  Agent2ProfileOutput,
  AgentContext,
  StoneAnswer,
  StoneRound2Output,
  PreliminaryStone,
  CrossValidationResult,
  StoneType,
} from '@types-app/agents';
import { callReasoning } from '@lib/ai-router';
import { STONE_DESCRIPTIONS, STONE_TO_CATEGORY, ALL_STONE_TYPES } from './stone-taxonomy';

function buildSystemPrompt(): string {
  const taxonomyList = Object.entries(STONE_DESCRIPTIONS)
    .map(([type, desc]) => `- ${type} (${STONE_TO_CATEGORY[type as keyof typeof STONE_TO_CATEGORY]}): ${desc}`)
    .join('\n');

  return `You are Agent 2: Stone Identifier — Stone Extractor mode.

Your job is to analyze the user's answers to diagnostic questions and extract their
behavioral/psychological profile — their "stones."

## Stone Taxonomy (ONLY use stones from this list)
${taxonomyList}

## Extraction Process

### Step 1: Semantic Interpretation
Read each answer carefully. Look for:
- Failure patterns: "I always quit after...", "I tried before but..."
- Emotional signals: fear, frustration, hesitation, overconfidence
- Constraint signals: "I don't have...", "My schedule..."
- Cognitive signals: "I get overwhelmed", "I can't focus when..."
- Behavioural signals: "I keep planning but never...", "I do it for a while then..."

### Step 2: Stone Mapping
Map each signal to a stone from the taxonomy. One answer can reveal multiple stones.

### Step 3: Severity Estimation
- Low: Occasional issue, manageable with minor adjustments
- Moderate: Recurring pattern, needs active curriculum accommodation
- High: Strong pattern, significantly changes curriculum structure
- Critical: Dominant blocker, must be the central focus

### Step 4: Risk Impact
0.0 = This stone has minimal impact on goal success
0.5 = This stone will likely cause problems without accommodation
1.0 = This stone WILL derail the goal if not addressed

### Step 5: Archetype Assignment
Assign a user archetype that captures their dominant pattern.
Examples:
- "Motivated but Volatility-Prone" (high motivation, inconsistency stone)
- "The Analytical Procrastinator" (overthinking, perfectionism)
- "The Ambitious Beginner" (skill gap, unrealistic expectations)
- "The Constrained Achiever" (time/resource constraints, high motivation)
- "The Burned-Out Restarter" (inconsistency, cognitive fatigue)
- "The Fragile Starter" (fear of failure, low confidence)

### Step 6: Downstream Guidance
agent3Guidance: Specific instructions for the curriculum builder
  - e.g., "Use 14-day micro-sprints to combat inconsistency"
  - e.g., "Reduce week 1 intensity by 30% to build confidence"
agent5Note: Predictive note for the recalibrator
  - e.g., "Expect motivation dip at day 10-14 based on inconsistency pattern"
  - e.g., "Monitor for overtraining signals by week 3"

## Rules
- ONLY use stone types from the provided taxonomy
- Pick 2–4 stones maximum (avoid over-classification)
- The primaryStone must be the single highest-risk stone
- Return ONLY valid JSON, no markdown`;
}

function buildUserPrompt(
  context: AgentContext,
  goalAnalysis: Agent1Output,
  answers: StoneAnswer[]
): string {
  const g = goalAnalysis.goalAnalysis;

  const answersText = answers
    .map(a => {
      const base = `Q (${a.stoneId}): ${typeof a.answer === 'object' ? JSON.stringify(a.answer) : a.answer}`;
      return a.comment ? `${base} [User added: "${a.comment}" — treat as high-signal modifier that can deepen or override the default stone assignment]` : base;
    })
    .join('\n');

  return `Extract the stone profile from these answers.

## Goal Context
Goal: "${context.goal}"
Domain: ${g.domain}
Intensity: ${g.intensity}
Horizon: ${g.horizon}
Risks from goal analysis: ${g.risksDetected.join(', ') || 'None'}
Constraints from goal analysis: ${g.constraintsDetected.join(', ') || 'None'}

## User's Answers
${answersText}

Return a JSON object with this exact schema:
{
  "stoneProfile": {
    "userArchetype": "short descriptive archetype label",
    "primaryStone": "one StoneType from taxonomy",
    "stones": [
      {
        "type": "StoneType",
        "category": "Logistical|Psychological|Cognitive|Behavioural",
        "trigger": "specific trigger identified from their answer",
        "severity": "Low|Moderate|High|Critical",
        "riskImpact": 0.0
      }
    ],
    "agent3Guidance": [
      "specific curriculum instruction 1",
      "specific curriculum instruction 2"
    ],
    "agent5Note": "predictive note about when/how they might struggle",
    "confidence": 0.0
  }
}`;
}

function validateOutput(raw: unknown): Agent2ProfileOutput {
  const parsed = raw as Agent2ProfileOutput;
  const p = parsed?.stoneProfile;

  if (!p || typeof p !== 'object') {
    throw new Error('Agent 2 Mode 2: Missing stoneProfile in response');
  }

  // Validate primaryStone against taxonomy
  if (!ALL_STONE_TYPES.includes(p.primaryStone)) {
    p.primaryStone = 'Inconsistency'; // Safe default
  }

  // Validate and fix each stone
  p.stones = (p.stones ?? [])
    .filter(s => ALL_STONE_TYPES.includes(s.type))
    .map(s => ({
      ...s,
      category: STONE_TO_CATEGORY[s.type] ?? 'Behavioural',
      riskImpact: Math.min(1, Math.max(0, s.riskImpact ?? 0.5)),
    }))
    .slice(0, 4); // Max 4 stones

  p.agent3Guidance = p.agent3Guidance ?? [];
  p.agent5Note = p.agent5Note ?? '';
  p.confidence = Math.min(1, Math.max(0, p.confidence ?? 0.6));
  p.userArchetype = p.userArchetype ?? 'Unknown Archetype';

  return parsed;
}

/**
 * Preliminary extraction pass — runs after Round 1 answers to determine confidence levels
 * and which stones need disambiguation via follow-up questions.
 *
 * This is a lightweight LLM call that returns preliminary stone guesses with confidence.
 * Used to decide which Round 2 follow-up questions to show.
 */
export async function extractPreliminary(
  context: AgentContext,
  goalAnalysis: Agent1Output,
  round1Answers: StoneAnswer[]
): Promise<StoneRound2Output> {
  const g = goalAnalysis.goalAnalysis;
  const answersText = round1Answers
    .map(a => `Q (${a.stoneId}): ${typeof a.answer === 'object' ? JSON.stringify(a.answer) : a.answer}`)
    .join('\n');

  const prompt = `Perform a PRELIMINARY stone analysis on these Round 1 answers.
Do not give a final profile — just estimate which stones are present and how confident you are.
Then produce 3-4 targeted follow-up questions to resolve the low-confidence stones.

Goal: "${context.goal}" | Domain: ${g.domain}

Round 1 Answers:
${answersText}

Return JSON:
{
  "preliminaryStones": [
    { "type": "StoneType", "confidence": 0.0 }
  ],
  "contradictionDetected": false,
  "contradictionNote": null,
  "followUpQuestions": [
    {
      "id": "unique_id",
      "question": "Clarifying question text",
      "type": "multiple_choice",
      "resolves": "Which ambiguity this resolves (e.g. TimeConstraint vs ProcrastinationPattern)",
      "options": [
        { "value": "option_value", "label": "Display label", "pointsTo": "StoneType" }
      ]
    }
  ]
}`;

  const { content } = await callReasoning({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    max_tokens: 1000,
    response_format: { type: 'json_object' },
  });

  if (!content) throw new Error('Agent 2 preliminary extraction: No response');

  const raw = JSON.parse(content) as StoneRound2Output;

  // Validate preliminary stones
  const validatedPrelim: PreliminaryStone[] = (raw.preliminaryStones ?? [])
    .filter(s => ALL_STONE_TYPES.includes(s.type))
    .map(s => ({ type: s.type, confidence: Math.min(1, Math.max(0, s.confidence ?? 0.5)) }))
    .slice(0, 5);

  // Validate follow-up questions — cap at 4
  const validatedFollowUps = (raw.followUpQuestions ?? [])
    .slice(0, 4)
    .map(q => ({
      ...q,
      options: (q.options ?? []).slice(0, 5),
    }));

  return {
    preliminaryStones: validatedPrelim,
    followUpQuestions: validatedFollowUps,
    contradictionDetected: raw.contradictionDetected ?? false,
    contradictionNote: raw.contradictionNote ?? undefined,
  };
}

/**
 * Cross-validation pass — detects contradictions between Round 1 + Round 2 answers
 * and corrects the preliminary stone profile.
 *
 * Example: User said "no time" but Round 2 shows they fill time with low-priority tasks
 * → reclassify from TimeConstraint → ProcrastinationPattern.
 */
export function crossValidateStones(
  preliminary: PreliminaryStone[],
  round2Answers: StoneAnswer[]
): CrossValidationResult {
  // Build a vote map: how many Round 2 answers point to each stone
  const votes: Partial<Record<StoneType, number>> = {};
  for (const answer of round2Answers) {
    const pointsTo = answer.impact?.pointsTo as StoneType | undefined;
    if (pointsTo && ALL_STONE_TYPES.includes(pointsTo)) {
      votes[pointsTo] = (votes[pointsTo] ?? 0) + 1;
    }
  }

  // Detect TimeConstraint ↔ ProcrastinationPattern confusion (most common)
  let contradictionResolved: string | null = null;
  let correctedPrimary = preliminary[0]?.type ?? 'Inconsistency';
  const correctedPrelim = [...preliminary];

  const timeIdx = correctedPrelim.findIndex(s => s.type === 'TimeConstraint');
  const procIdx = correctedPrelim.findIndex(s => s.type === 'ProcrastinationPattern');
  const timeVotes = votes['TimeConstraint'] ?? 0;
  const procVotes = votes['ProcrastinationPattern'] ?? 0;

  if (timeIdx !== -1 && procVotes > timeVotes) {
    // Evidence points more to procrastination than actual time shortage
    correctedPrelim[timeIdx] = { type: 'ProcrastinationPattern', confidence: 0.75 };
    if (procIdx !== -1) correctedPrelim.splice(procIdx, 1);
    contradictionResolved = 'TimeConstraint reclassified as ProcrastinationPattern based on Round 2 evidence';
  }

  // Perfectionism ↔ FearOfFailure disambiguation
  const perfIdx = correctedPrelim.findIndex(s => s.type === 'Perfectionism');
  const fearIdx = correctedPrelim.findIndex(s => s.type === 'FearOfFailure');
  const perfVotes = votes['Perfectionism'] ?? 0;
  const fearVotes = votes['FearOfFailure'] ?? 0;
  if (perfIdx !== -1 && fearVotes > perfVotes && fearIdx === -1) {
    correctedPrelim[perfIdx] = { type: 'FearOfFailure', confidence: 0.7 };
    contradictionResolved = contradictionResolved ?? 'Perfectionism reclassified as FearOfFailure';
  }

  // Boost confidence for stones that had Round 2 votes
  for (const stone of correctedPrelim) {
    const v = votes[stone.type] ?? 0;
    stone.confidence = Math.min(1, stone.confidence + v * 0.1);
  }

  // Re-sort by confidence descending
  correctedPrelim.sort((a, b) => b.confidence - a.confidence);
  correctedPrimary = correctedPrelim[0]?.type ?? 'Inconsistency';

  // Build a corrected profile stub (full extraction still happens in extractStones)
  const correctedProfile: import('@types-app/agents').StoneProfile = {
    userArchetype: 'Pending full extraction',
    primaryStone: correctedPrimary,
    stones: correctedPrelim.map(s => ({
      type: s.type,
      category: STONE_TO_CATEGORY[s.type] ?? 'Behavioural',
      trigger: '',
      severity: (s.confidence > 0.75 ? 'High' : s.confidence > 0.5 ? 'Moderate' : 'Low') as import('@types-app/agents').StoneSeverity,
      riskImpact: s.confidence,
    })),
    agent3Guidance: [],
    agent5Note: '',
    confidence: correctedPrelim[0]?.confidence ?? 0.6,
  };

  const originalConfidence = preliminary[0]?.confidence ?? 0.5;
  const newConfidence = correctedPrelim[0]?.confidence ?? 0.6;

  return {
    correctedPrimary,
    correctedProfile,
    contradictionResolved,
    confidenceImprovement: newConfidence - originalConfidence,
  };
}

export async function extractStones(
  context: AgentContext,
  goalAnalysis: Agent1Output,
  answers: StoneAnswer[]
): Promise<Agent2ProfileOutput> {
  const { content } = await callReasoning({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(context, goalAnalysis, answers) },
    ],
    temperature: 0.2,  // Analytical — consistent stone mapping
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });
  if (!content) {
    throw new Error('Agent 2 Mode 2: No response received');
  }

  const raw = JSON.parse(content) as unknown;
  return validateOutput(raw);
}
