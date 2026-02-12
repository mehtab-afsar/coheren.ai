/**
 * Agent 2 — Mode 2: Stone Extractor
 *
 * Takes user answers to the diagnostic questions and maps them
 * to the stone taxonomy. Produces a behavioral profile (StoneProfile)
 * that downstream agents (3 and 5) use to personalize the curriculum.
 *
 * Runs AFTER the user has answered Mode 1 questions.
 */

import type { Agent1Output, Agent2ProfileOutput, AgentContext, StoneAnswer } from '@types-app/agents';
import { callGroqWithFallback } from '@lib/groq-client';
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
    .map(a => `Q (${a.stoneId}): ${typeof a.answer === 'object' ? JSON.stringify(a.answer) : a.answer}`)
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

export async function extractStones(
  context: AgentContext,
  goalAnalysis: Agent1Output,
  answers: StoneAnswer[]
): Promise<Agent2ProfileOutput> {
  const response = await callGroqWithFallback({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(context, goalAnalysis, answers) },
    ],
    temperature: 0.2,  // Analytical — consistent stone mapping
    max_tokens: 1200,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Agent 2 Mode 2: No response received');
  }

  const raw = JSON.parse(content) as unknown;
  return validateOutput(raw);
}
