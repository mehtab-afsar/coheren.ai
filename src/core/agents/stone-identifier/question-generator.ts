/**
 * Agent 2 — Mode 1: Question Generator
 *
 * Generates 4–6 domain-aware, linguistically personalized questions
 * based on Agent 1's goal analysis.
 *
 * Rules:
 *   - Questions must be goal-specific, not generic
 *   - Use the goal text inside question phrasing (reciprocity effect)
 *   - Prefer multiple_choice to reduce friction
 *   - Never ask what's already known (timeline, goal, daily time, name)
 *   - Each question must have a clear impact on the curriculum
 */

import type { Agent1Output, Agent2Output, AgentContext } from '@types-app/agents';
import { callReasoning } from '@lib/ai-router';
import { DOMAIN_GAPS, STONE_DESCRIPTIONS } from './stone-taxonomy';

function buildSystemPrompt(): string {
  const stoneList = Object.entries(STONE_DESCRIPTIONS)
    .map(([type, desc]) => `- ${type}: ${desc}`)
    .join('\n');

  return `You are Agent 2: Stone Identifier — Question Generator mode.

Your job is to generate 4–6 targeted diagnostic questions that uncover the variables
most likely to derail the user's goal — their "stones."

## Known Stone Types
${stoneList}

## Question Generation Principles

### 1. Domain-Aware Scoping
Each domain has specific unknowns. Generate questions that address EXACTLY those unknowns.
Do NOT ask generic questions like "How motivated are you?"

### 2. Linguistic Personalization (Reciprocity Effect)
WRONG: "How many hours can you study?"
RIGHT: "Since UPSC prep demands deep concentration, how many distraction-free hours can you honestly commit daily?"

Always reference the goal. Always explain WHY you're asking (increases honest response rate).

### 3. Question Type Rules
- PREFER multiple_choice (2–4 options) — less friction, higher completion
- Use open_ended only for truly free-form (e.g., "What usually stops you?")
- Use scale for intensity ratings
- Use yes_no only for binary gates (e.g., "Do you have gym access?")

### 4. Impact Specificity
Every option MUST explain how it changes the curriculum:
- Not: "affects plan"
- Yes: "reduces weekly volume by 20%, adds recovery days, avoids compound movements"

### 5. What NOT to Ask
- Time commitment (already known)
- Daily time (already known)
- Timeline (already known)
- Goal or purpose (already known)
- General skill level (infer from analysis)

## Output
Return ONLY valid JSON, no markdown:
{
  "requiredStones": [
    {
      "stoneId": "unique_snake_case_id",
      "stoneName": "Display Name",
      "importance": "critical|high|medium|low",
      "reasoning": "Why this changes the curriculum (be specific)",
      "question": {
        "text": "Personalized question referencing the goal",
        "type": "multiple_choice|open_ended|yes_no|scale",
        "options": [
          {
            "value": "option_value",
            "label": "Display label",
            "impact": {
              "curriculum": "Specific curriculum change",
              "modifications": "Specific modifications"
            }
          }
        ]
      }
    }
  ]
}`;
}

function buildUserPrompt(context: AgentContext, goalAnalysis: Agent1Output): string {
  const g = goalAnalysis.goalAnalysis;
  const domainGaps = DOMAIN_GAPS[g.domain] ?? DOMAIN_GAPS['Lifestyle'];

  return `Generate 4–6 targeted diagnostic questions for this user.

## Goal Analysis
Goal: "${context.goal}"
Domain: ${g.domain}
Category: ${g.category}
Horizon: ${g.horizon}
Intensity: ${g.intensity}
Complexity: ${g.complexity}
Constraints Already Detected: ${g.constraintsDetected.length > 0 ? g.constraintsDetected.join(', ') : 'None'}
Risks Already Detected: ${g.risksDetected.length > 0 ? g.risksDetected.join(', ') : 'None'}
Missing SMART: ${g.missingSMART.length > 0 ? g.missingSMART.join(', ') : 'None'}

## Critical Variables for ${g.domain} Domain
These are the unknowns most likely to derail progress — generate questions that uncover them:
${domainGaps.map((gap, i) => `${i + 1}. ${gap}`).join('\n')}

## Already Known (DO NOT ASK)
- Goal: "${context.goal}"
- Timeline: ${context.timeline} days
- Daily time: ${context.dailyTimeAvailable} minutes
- General complexity: ${g.complexity}

## Instruction
Generate GOAL-SPECIFIC questions. Every question must reference "${context.goal}" or related specifics.
Prioritize questions that would create SIGNIFICANTLY different curriculum paths based on the answer.
Order by importance (critical first).`;
}

function validateOutput(raw: unknown): Agent2Output {
  const parsed = raw as Agent2Output;
  if (!Array.isArray(parsed?.requiredStones)) {
    throw new Error('Agent 2 Mode 1: Missing requiredStones array');
  }

  // Cap at 6 questions max
  parsed.requiredStones = parsed.requiredStones.slice(0, 6);

  // Ensure each stone has required fields
  parsed.requiredStones = parsed.requiredStones.filter(
    s => s.stoneId && s.stoneName && s.question?.text
  );

  return parsed;
}

export async function generateQuestions(
  context: AgentContext,
  goalAnalysis: Agent1Output
): Promise<Agent2Output> {
  const { content } = await callReasoning({
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(context, goalAnalysis) },
    ],
    temperature: 0.35,  // Slightly creative to personalize language, not too random
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });
  if (!content) {
    throw new Error('Agent 2 Mode 1: No response received');
  }

  const raw = JSON.parse(content) as unknown;
  return validateOutput(raw);
}
