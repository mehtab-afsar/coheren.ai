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
  ReadinessProfile,
  LinguisticSignals,
  ChangeStage,
} from '@types-app/agents';
import { callReasoning, callWithTools } from '@lib/ai-router';
import type { GroqTool } from '@lib/ai-router';
import { flags } from '@config/feature-flags';
import { STONE_DESCRIPTIONS, STONE_TO_CATEGORY, ALL_STONE_TYPES } from './stone-taxonomy';
import { aggregateLinguisticSignals, linguisticSignalsToStonePriors } from './linguistic-analyzer';
import { interpretReadiness } from './interview-engine';
import { lowConfidenceSeverityFromRuler } from './scales';

// ─── Tool Schemas ─────────────────────────────────────────────────────────────

const STONE_TYPE_ENUM = ALL_STONE_TYPES as unknown as string[];

const EXTRACT_STONES_TOOL: GroqTool = {
  type: 'function',
  function: {
    name: 'extract_stone_profile',
    description: 'Extract behavioral stone profile from user diagnostic answers.',
    parameters: {
      type: 'object',
      properties: {
        stoneProfile: {
          type: 'object',
          properties: {
            userArchetype: { type: 'string' },
            primaryStone:  { type: 'string', enum: STONE_TYPE_ENUM },
            stones: {
              type: 'array',
              minItems: 1,
              maxItems: 4,
              items: {
                type: 'object',
                properties: {
                  type:       { type: 'string', enum: STONE_TYPE_ENUM },
                  category:   { type: 'string', enum: ['Logistical', 'Psychological', 'Cognitive', 'Behavioural'] },
                  trigger:    { type: 'string' },
                  severity:   { type: 'string', enum: ['Low', 'Moderate', 'High', 'Critical'] },
                  riskImpact: { type: 'number', minimum: 0, maximum: 1 },
                },
                required: ['type', 'category', 'trigger', 'severity', 'riskImpact'],
              },
            },
            agent3Guidance: { type: 'array', items: { type: 'string' }, minItems: 1 },
            agent5Note:     { type: 'string' },
            confidence:     { type: 'number', minimum: 0, maximum: 1 },
          },
          required: ['userArchetype', 'primaryStone', 'stones', 'agent3Guidance', 'agent5Note', 'confidence'],
        },
      },
      required: ['stoneProfile'],
    },
  },
};

const EXTRACT_PRELIMINARY_TOOL: GroqTool = {
  type: 'function',
  function: {
    name: 'extract_preliminary_stones',
    description: 'Perform preliminary stone analysis and generate follow-up questions.',
    parameters: {
      type: 'object',
      properties: {
        preliminaryStones: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type:       { type: 'string', enum: STONE_TYPE_ENUM },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['type', 'confidence'],
          },
        },
        contradictionDetected: { type: 'boolean' },
        contradictionNote:     { type: 'string' },
        followUpQuestions: {
          type: 'array',
          maxItems: 4,
          items: {
            type: 'object',
            properties: {
              id:       { type: 'string' },
              question: { type: 'string' },
              type:     { type: 'string' },
              resolves: { type: 'string' },
              options: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    value:    { type: 'string' },
                    label:    { type: 'string' },
                    pointsTo: { type: 'string' },
                  },
                  required: ['value', 'label'],
                },
              },
            },
            required: ['id', 'question', 'type', 'resolves', 'options'],
          },
        },
      },
      required: ['preliminaryStones', 'contradictionDetected', 'followUpQuestions'],
    },
  },
};

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
- Return ONLY valid JSON, no markdown
- **CRITICAL — "never_tried" handling**: If any answer value is exactly "never_tried", the user has ZERO prior history with this goal. Do NOT assign Inconsistency or ProcrastinationPattern based on that answer alone — those require an observed failure pattern. Assign LowConfidence or SkillGap instead (first-timers lack self-efficacy data, not discipline). Use archetype "Ambitious First-Timer" or similar. Other answers may still reveal real stones — evaluate them independently.`;
}

function buildUserPrompt(
  context:          AgentContext,
  goalAnalysis:     Agent1Output,
  answers:          StoneAnswer[],
  readinessProfile?: ReadinessProfile,
  linguisticSignals?: LinguisticSignals
): string {
  const g = goalAnalysis.goalAnalysis;

  const answersText = answers
    .map(a => {
      const answerStr = typeof a.answer === 'object' ? JSON.stringify(a.answer) : a.answer;
      const impactHint = a.impact && Object.keys(a.impact).length > 0
        ? ` [Pre-classified impact: ${JSON.stringify(a.impact)}]`
        : '';
      const commentHint = a.comment ? ` [User added: "${a.comment}" — high-signal modifier]` : '';
      return `Q (${a.stoneId}): ${answerStr}${impactHint}${commentHint}`;
    })
    .join('\n');

  // ── Readiness ruler section (Miller & Rollnick, USE_READINESS_RULER) ──────
  let readinessSection = '';
  if (flags.USE_READINESS_RULER && readinessProfile) {
    const { flags: rFlags } = interpretReadiness(readinessProfile.importance, readinessProfile.selfEfficacy);
    readinessSection = `
## Readiness Ruler (Miller & Rollnick)
Importance (1-10): ${readinessProfile.importance}
Self-Efficacy (1-10): ${readinessProfile.selfEfficacy}
Interpretation signals: ${rFlags.join(', ') || 'none'}
NOTE: Low importance (<6) suggests UnrealisticExpectations. Low self-efficacy (<5) escalates LowConfidence. High importance + low self-efficacy is the classic FearOfFailure signature. Both ≥8 reduces Inconsistency likelihood.`;
  }

  // ── Linguistic signals section (USE_LINGUISTIC_SIGNALS) ──────────────────
  let linguisticSection = '';
  if (flags.USE_LINGUISTIC_SIGNALS && linguisticSignals) {
    const priors = linguisticSignalsToStonePriors(linguisticSignals);
    const priorsText = Object.entries(priors)
      .map(([stone, delta]) => `${stone}: ${(delta ?? 0) > 0 ? '+' : ''}${((delta ?? 0) * 100).toFixed(0)}%`)
      .join(', ');
    linguisticSection = `
## Linguistic Signals (HOW the user answered)
Hedge density: ${(linguisticSignals.hedgeDensity * 100).toFixed(0)}% (>25% = ambivalence/FearOfFailure/LowConfidence)
Change vs sustain talk ratio: ${linguisticSignals.changeVsSustainRatio.toFixed(2)} (>1 = change-oriented)
Passive voice count: ${linguisticSignals.passiveVoiceCount} (≥2 = external attribution → Inconsistency)
Conditional language: ${linguisticSignals.conditionalLanguage ? 'Yes (barrier-framing detected)' : 'No'}
Answer length pattern: ${linguisticSignals.answerLength}
Topic avoidance detected: ${linguisticSignals.topicAvoidanceDetected ? 'Yes (Perfectionism/FearOfFailure signal)' : 'No'}
Stone priors from linguistics: ${priorsText || 'none'}
NOTE: These are probabilistic signals, not verdicts. Weigh against answer content.`;
  }

  return `Extract the stone profile from these answers.

## Goal Context
Goal: "${context.goal}"
Domain: ${g.domain}
Intensity: ${g.intensity}
Horizon: ${g.horizon}
Risks from goal analysis: ${g.risksDetected.join(', ') || 'None'}
Constraints from goal analysis: ${g.constraintsDetected.join(', ') || 'None'}
${readinessSection}${linguisticSection}
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

function validateOutput(
  raw:              unknown,
  readinessProfile?: ReadinessProfile,
  linguisticSignals?: LinguisticSignals,
  changeStage?:      ChangeStage
): Agent2ProfileOutput {
  const parsed = raw as Agent2ProfileOutput;
  const p = parsed?.stoneProfile;

  if (!p || typeof p !== 'object') {
    throw new Error('Agent 2 Mode 2: Missing stoneProfile in response');
  }

  // Validate primaryStone against taxonomy
  if (!ALL_STONE_TYPES.includes(p.primaryStone)) {
    p.primaryStone = 'LowConfidence'; // Safe default (avoids wrongly labelling first-timers as inconsistent)
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

  // Preserve research-backed enrichment fields
  if (readinessProfile)  p.readinessProfile  = readinessProfile;
  if (linguisticSignals) p.linguisticSignals = linguisticSignals;
  if (changeStage)       p.changeStage       = changeStage;

  // ── Deterministic severity for scale-backed stones ────────────────────────
  // LowConfidence is backed by a real measure — the self-efficacy ruler collected in
  // onboarding (1–10). When it carries signal, its severity is COMPUTED from the score
  // (see scales.ts), not left to the LLM's label. Un-scaled stones stay LLM-inferred.
  if (readinessProfile && typeof readinessProfile.selfEfficacy === 'number') {
    const measured = lowConfidenceSeverityFromRuler(readinessProfile.selfEfficacy);
    if (measured) {
      const lc = p.stones.find(s => s.type === 'LowConfidence');
      if (lc) {
        lc.severity = measured;
        lc.measured = true;
      }
    }
  }

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
    .map(a => {
      const answerStr = typeof a.answer === 'object' ? JSON.stringify(a.answer) : a.answer;
      const impactHint = a.impact && Object.keys(a.impact).length > 0
        ? ` [Pre-classified impact: ${JSON.stringify(a.impact)}]`
        : '';
      return `Q (${a.stoneId}): ${answerStr}${impactHint}`;
    })
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

  const callMessages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    { role: 'user'   as const, content: prompt },
  ];

  let raw: StoneRound2Output;
  if (flags.USE_TOOL_CALLING) {
    const args = await callWithTools(
      { messages: callMessages, temperature: 0.2, max_tokens: 1000, tools: [EXTRACT_PRELIMINARY_TOOL], tool_name: 'extract_preliminary_stones' },
      'reasoning'
    );
    try {
      raw = JSON.parse(args) as StoneRound2Output;
    } catch (e) {
      throw new Error(`Agent 2 preliminary (tool): invalid JSON — ${(e as Error).message}`);
    }
  } else {
    const { content } = await callReasoning({
      messages: callMessages,
      temperature: 0.2,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });
    if (!content) throw new Error('Agent 2 preliminary extraction: No response');
    try {
      raw = JSON.parse(content) as StoneRound2Output;
    } catch (e) {
      throw new Error(`Agent 2 preliminary (reasoning): invalid JSON — ${(e as Error).message}`);
    }
  }

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

/**
 * Detect the user's Transtheoretical Model (TTM) stage of change
 * from their answers and readiness profile.
 *
 * Research: Prochaska & DiClemente (1983)
 * Stage determines whether Agent 3 builds a skills curriculum (Preparation/Action)
 * or a motivation-activation phase 0 (Precontemplation/Contemplation).
 */
export function detectChangeStage(
  answers:          StoneAnswer[],
  readiness?:       ReadinessProfile,
  linguisticSignals?: LinguisticSignals
): ChangeStage {
  const importance    = readiness?.importance   ?? 5;
  const selfEfficacy  = readiness?.selfEfficacy ?? 5;
  const hedgeDensity  = linguisticSignals?.hedgeDensity ?? 0;
  const sustain       = (linguisticSignals?.changeVsSustainRatio ?? 1) < 0.8;

  // Combine answer text for keyword signals
  const allAnswerText = answers
    .map(a => (typeof a.answer === 'string' ? a.answer : JSON.stringify(a.answer)))
    .join(' ')
    .toLowerCase();

  const hasStarted   = /already started|been doing|currently|i do|i am doing/.test(allAnswerText);
  const hasPlan      = /i plan|i have a plan|i know what|next week|i've mapped/.test(allAnswerText);
  const noAttempts   = /never tried|never done|don't know where|no idea|never started/.test(allAnswerText);
  const manyAttempts = /tried many|tried several|multiple times|always fail|tried before and/.test(allAnswerText);

  // Action: already started, asks about optimization
  if (hasStarted && importance >= 7 && selfEfficacy >= 6) return 'action';

  // Precontemplation: low importance, no prior attempts, no plan awareness
  if (importance < 4 && noAttempts && !hasPlan) return 'precontemplation';

  // Contemplation: aware, ambivalent, not yet planning
  if (importance < 6 && sustain && hedgeDensity > 0.15) return 'contemplation';
  if (importance < 6 && manyAttempts && selfEfficacy < 5) return 'contemplation';

  // Preparation: ready to start, has a plan or prior attempt knowledge
  if (importance >= 7 && (hasPlan || manyAttempts) && selfEfficacy >= 5) return 'preparation';

  // Default to preparation (most users who complete onboarding are at least in prep)
  return 'preparation';
}

export async function extractStones(
  context:      AgentContext,
  goalAnalysis: Agent1Output,
  answers:      StoneAnswer[],
  enrichment?: {
    readinessProfile?:  ReadinessProfile;
    answerTexts?:       string[];   // Raw open-ended answer strings for linguistic analysis
    changeStage?:       ChangeStage;
  }
): Promise<Agent2ProfileOutput> {
  // ── Compute linguistic signals from raw answer text if flag is on ──────────
  let linguisticSignals: LinguisticSignals | undefined;
  if (flags.USE_LINGUISTIC_SIGNALS && enrichment?.answerTexts?.length) {
    linguisticSignals = aggregateLinguisticSignals(enrichment.answerTexts);
  }

  // ── Detect TTM change stage ───────────────────────────────────────────────
  const changeStage: ChangeStage = enrichment?.changeStage
    ?? detectChangeStage(answers, enrichment?.readinessProfile, linguisticSignals);

  const callMessages = [
    { role: 'system' as const, content: buildSystemPrompt() },
    { role: 'user'   as const, content: buildUserPrompt(
        context,
        goalAnalysis,
        answers,
        enrichment?.readinessProfile,
        linguisticSignals
      )
    },
  ];

  let raw: unknown;
  if (flags.USE_TOOL_CALLING) {
    const args = await callWithTools(
      { messages: callMessages, temperature: 0.2, max_tokens: 1200, tools: [EXTRACT_STONES_TOOL], tool_name: 'extract_stone_profile' },
      'reasoning'
    );
    try {
      raw = JSON.parse(args) as unknown;
    } catch (e) {
      throw new Error(`Agent 2 Mode 2 (tool): invalid JSON — ${(e as Error).message}`);
    }
  } else {
    const { content } = await callReasoning({
      messages: callMessages,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
    });
    if (!content) throw new Error('Agent 2 Mode 2: No response received');
    try {
      raw = JSON.parse(content) as unknown;
    } catch (e) {
      throw new Error(`Agent 2 Mode 2 (reasoning): invalid JSON — ${(e as Error).message}`);
    }
  }

  return validateOutput(raw, enrichment?.readinessProfile, linguisticSignals, changeStage);
}
