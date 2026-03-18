/**
 * Agent 2 — Mode 1: Readiness Probe (Question Generator)
 *
 * The chat already collected: goal, timeline, dailyTime, skillLevel, energyPattern, name.
 * Agent 2's job is NOT to re-collect that data. It is Coheren's propulsion engine —
 * it uncovers the psychological, behavioural, and environmental realities that will
 * determine whether the person actually follows through.
 *
 * What it probes (never repeat what chat collected):
 *   - Past failure patterns for this goal type
 *   - Resilience response when a day is skipped
 *   - Accountability style and social commitment
 *   - Competing demands right now
 *   - Emotional relationship with the goal (fear of failure, perfectionism, confidence)
 *   - Environment and focus quality
 *
 * These answers feed directly into the stone taxonomy and shape Agents 3–5.
 */

import type { Agent1Output, Agent2Output, AgentContext } from '@types-app/agents';
import { callReasoning } from '@lib/ai-router';
import { DOMAIN_READINESS_GAPS, STONE_DESCRIPTIONS } from './stone-taxonomy';
// Note: DOMAIN_GAPS alias also exported for legacy references

function buildSystemPrompt(): string {
  const stoneList = Object.entries(STONE_DESCRIPTIONS)
    .map(([type, desc]) => `- ${type}: ${desc}`)
    .join('\n');

  return `You are Agent 2: Coheren's Readiness Probe.

The user just finished a chat where they told us their goal, timeline, daily time, skill level, and energy pattern.
You ALREADY HAVE all of that. Your job is to go deeper — uncover the psychological and behavioural patterns
that determine whether they will actually follow through.

## What You Are Probing
You are looking for hidden "stones" — the specific patterns most likely to derail this person.
These are NOT about what they want to do. They are about how they operate, how they've failed before,
and what their relationship to this goal really looks like beneath the surface.

## Stone Types You Can Detect
${stoneList}

## Core Principles

### 1. Never Re-Ask What's Already Known
The chat already collected: goal, timeline, daily time commitment, skill level, energy pattern (morning/evening/etc), and name.
DO NOT ask about any of these. Asking them again breaks trust and wastes their time.

### 2. Probe Patterns, Not Facts
WRONG: "How many hours can you study per day?" (already known)
WRONG: "What is your experience level?" (already known)
RIGHT: "When you've tried building a habit before and hit a bad week, what happened next?"
RIGHT: "Who in your life knows you're working on this goal right now?"

### 3. One Insight Per Question
Each question must probe exactly ONE stone. Don't stack multiple unknowns in one question.

### 4. Question Type Rules
- PREFER multiple_choice (2–4 options): less friction, faster completion
- Use open_ended only when multiple choice would feel reductive (e.g., "What usually makes you quit?")
- Use yes_no for true binary gates (e.g., "Have you tried this before?")
- Use scale for intensity/frequency ratings

### 5. Impact Specificity
Every option must explain exactly how it changes the curriculum:
- Not: "affects plan"
- Yes: "adds 'recovery day' structure after every 3 days, reduces Phase 1 volume by 25%"

### 6. Generate 4–5 Questions Only
Quality over quantity. Each question must be high-signal. Skip low-impact probes.

## Output Format
Return ONLY valid JSON, no markdown:
{
  "requiredStones": [
    {
      "stoneId": "unique_snake_case_id",
      "stoneName": "Display Name",
      "importance": "critical|high|medium|low",
      "reasoning": "Why this specific pattern changes the curriculum",
      "question": {
        "text": "Personalized question referencing their specific goal",
        "type": "multiple_choice|open_ended|yes_no|scale",
        "options": [
          {
            "value": "option_value",
            "label": "Display label",
            "impact": {
              "curriculum": "Specific curriculum change this answer triggers",
              "modifications": "Specific task/phase modifications"
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
  const readinessGaps = DOMAIN_READINESS_GAPS[g.domain] ?? DOMAIN_READINESS_GAPS['Lifestyle'];

  // Build a rich "already known" block so Agent 2 never asks redundant questions
  const alreadyKnown = [
    `Goal: "${context.goal}"`,
    `Timeline: ${context.timeline} days`,
    `Daily time committed: ${context.dailyTimeAvailable} minutes`,
    `Domain: ${g.domain} / ${g.category}`,
    context.skillLevel  ? `Skill level: ${context.skillLevel}`  : null,
    context.energyPattern ? `Peak energy: ${context.energyPattern}` : null,
    context.name        ? `Name: ${context.name}` : null,
    g.constraintsDetected.length > 0
      ? `Constraints already surfaced in chat: ${g.constraintsDetected.join(', ')}`
      : null,
    g.risksDetected.length > 0
      ? `Risks already surfaced: ${g.risksDetected.join(', ')}`
      : null,
    context.behavioralFlags && context.behavioralFlags.length > 0
      ? `Behavioural signals from chat: ${context.behavioralFlags.join(', ')}`
      : null,
  ].filter(Boolean).join('\n');

  return `Generate 4–5 readiness probe questions for this user. You are uncovering their psychological and behavioural patterns — NOT collecting data they already gave you.

## Everything Already Known (DO NOT RE-ASK ANY OF THIS)
${alreadyKnown}

## Goal Intelligence (from Agent 1)
Domain: ${g.domain}
Intensity: ${g.intensity}
Horizon: ${g.horizon}
Complexity: ${g.complexity}
Realism — Time: ${g.realismChecks.timeRealism}, Effort: ${g.realismChecks.effortRealism}
SMART gaps: ${g.missingSMART.length > 0 ? g.missingSMART.join(', ') : 'None'}
Common obstacles for this goal type: ${g.commonObstacles.length > 0 ? g.commonObstacles.join('; ') : 'N/A'}

## Readiness Gaps to Probe for ${g.domain} Domain
These are the hidden patterns most likely to determine whether this person succeeds.
Generate questions that surface EXACTLY these patterns:
${readinessGaps.map((gap, i) => `${i + 1}. ${gap}`).join('\n')}

## Behavioural Flags Detected in Chat
${context.behavioralFlags && context.behavioralFlags.length > 0
  ? context.behavioralFlags.map(f => `- ${f}`).join('\n') + '\nIf relevant, ask a question that confirms or deepens understanding of these patterns.'
  : 'No specific flags detected — probe general resilience and accountability patterns.'}

## Instructions
- Every question must name the goal ("${context.goal}") or a specific aspect of it
- Each question maps to exactly one stone type from the taxonomy
- Order by importance: put the question most likely to split the curriculum path first
- Never ask what's already known`;
}

// Keyword safety net: reject questions whose core topic overlaps with chat-collected fields.
// Maps Shadow Extractor field names → keywords that indicate a question is re-asking that data.
const CHAT_FIELD_KEYWORDS: Record<string, string[]> = {
  dailyTime:          ['how much time', 'how many hours', 'how many minutes', 'time per day', 'daily time', 'time commitment'],
  currentSkillLevel:  ['experience level', 'how experienced', 'skill level', 'beginner or', 'what level'],
  energyPattern:      ['morning or evening', 'time of day do you', 'when do you have the most energy', 'morning person'],
  timeline:           ['how long do you want', 'target date', 'deadline', 'how many weeks', 'how many months'],
  specificGoal:       ['what is your goal', 'what do you want to achieve', 'what are you trying'],
};

function questionOverlapsChat(questionText: string, context: AgentContext): boolean {
  const lower = questionText.toLowerCase();
  for (const [field, keywords] of Object.entries(CHAT_FIELD_KEYWORDS)) {
    // Only filter if we already have this data
    const hasField = field === 'dailyTime' ? context.dailyTimeAvailable > 0
      : field === 'currentSkillLevel' ? !!context.skillLevel
      : field === 'energyPattern' ? !!context.energyPattern
      : field === 'timeline' ? context.timeline > 0
      : field === 'specificGoal' ? !!context.goal
      : false;
    if (hasField && keywords.some(kw => lower.includes(kw))) {
      return true;
    }
  }
  return false;
}

function validateOutput(raw: unknown, context?: AgentContext): Agent2Output {
  const parsed = raw as Agent2Output;
  if (!Array.isArray(parsed?.requiredStones)) {
    throw new Error('Agent 2 Mode 1: Missing requiredStones array');
  }

  // Cap at 5 questions
  parsed.requiredStones = parsed.requiredStones.slice(0, 5);

  // Ensure each stone has required fields
  parsed.requiredStones = parsed.requiredStones.filter(
    s => s.stoneId && s.stoneName && s.question?.text
  );

  // Keyword safety net: filter out questions that re-ask chat-collected data
  if (context) {
    parsed.requiredStones = parsed.requiredStones.filter(
      s => !questionOverlapsChat(s.question.text, context)
    );
  }


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
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });
  if (!content) {
    throw new Error('Agent 2 Mode 1: No response received');
  }

  const raw = JSON.parse(content) as unknown;
  return validateOutput(raw, context);
}
