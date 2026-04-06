/**
 * Linguistic Signal Analyzer
 *
 * Detects HOW a user answers, not just WHAT they say.
 * Research basis:
 *   - Miller & Rollnick (2012) — Motivational Interviewing change talk / sustain talk
 *   - Pennebaker (2011) — LIWC linguistic markers for psychological state
 *   - Amrhein et al. (2003) — Commitment language predicts behavior change
 *
 * Used by Agent 2 when USE_LINGUISTIC_SIGNALS flag is on.
 * Signals are passed to stone-extractor.ts as a prior that shifts
 * the stone probability distribution before the LLM processes answers.
 */

import type { LinguisticSignals } from '@types-app/agents';

// ─── Hedge / ambivalence markers ─────────────────────────────────────────────
// These indicate low self-efficacy, ambivalence, or external locus of control.

const HEDGE_PHRASES: RegExp[] = [
  /\bmaybe\b/i,
  /\bperhaps\b/i,
  /\bprobably\b/i,
  /\bI guess\b/i,
  /\bI think\b/i,
  /\bsort of\b/i,
  /\bkind of\b/i,
  /\bI suppose\b/i,
  /\bI'm not sure\b/i,
  /\bsomewhat\b/i,
  /\ba bit\b/i,
  /\ba little\b/i,
  /\btry to\b/i,
  /\bhopefully\b/i,
  /\bwith any luck\b/i,
  /\baround\b/i,         // "around 30 minutes" vs "30 minutes"
  /\bif possible\b/i,
  /\bif I can\b/i,
  /\bif things work out\b/i,
];

// ─── Change-talk markers (motivation toward action) ──────────────────────────
// Amrhein et al. (2003): commitment language strongly predicts behaviour change.

const CHANGE_TALK_PHRASES: RegExp[] = [
  /\bI want\b/i,
  /\bI need\b/i,
  /\bI will\b/i,
  /\bI am going to\b/i,
  /\bI intend\b/i,
  /\bI plan\b/i,
  /\bI'm ready\b/i,
  /\bI can do\b/i,
  /\bI'm committed\b/i,
  /\bI am determined\b/i,
  /\bI desire\b/i,
  /\bI wish\b/i,
  /\bI would like\b/i,
  /\bI must\b/i,
  /\bI have to\b/i,
  /\bI'm excited\b/i,
  /\bI'm motivated\b/i,
];

// ─── Sustain-talk markers (resistance to change) ─────────────────────────────

const SUSTAIN_TALK_PHRASES: RegExp[] = [
  /\bI can't\b/i,
  /\bI cannot\b/i,
  /\bI won't\b/i,
  /\bI don't want\b/i,
  /\bI'm not ready\b/i,
  /\bit's too hard\b/i,
  /\btoo difficult\b/i,
  /\bI'm too busy\b/i,
  /\bnever have time\b/i,
  /\bI always fail\b/i,
  /\bI give up\b/i,
  /\bI doubt\b/i,
  /\bpointless\b/i,
  /\bwon't work\b/i,
  /\bno point\b/i,
  /\bI've tried before\b/i,
  /\bnever works\b/i,
  /\btoo late\b/i,
  /\bnot the right time\b/i,
];

// ─── Conditional / barrier-framing language ───────────────────────────────────

const CONDITIONAL_PHRASES: RegExp[] = [
  /\bif I could\b/i,
  /\bif I had\b/i,
  /\bwhen I have time\b/i,
  /\bonce I\b/i,
  /\bwhen things calm down\b/i,
  /\bif only\b/i,
  /\bif I get\b/i,
  /\bas soon as\b/i,
  /\bwhen I'm ready\b/i,
  /\bif circumstances\b/i,
  /\bif things were different\b/i,
];

// ─── Certainty markers (high confidence areas) ───────────────────────────────

const CERTAINTY_PHRASES: RegExp[] = [
  /\bdefinitely\b/i,
  /\babsolutely\b/i,
  /\bcertainly\b/i,
  /\bwithout doubt\b/i,
  /\bfor sure\b/i,
  /\bI know\b/i,
  /\bI'm sure\b/i,
  /\bI'm confident\b/i,
  /\bI've always\b/i,
  /\bI always\b/i,
  /\beveryday\b/i,
  /\bconsistently\b/i,
  /\bcommitted\b/i,
];

// ─── Passive voice heuristic ─────────────────────────────────────────────────
// "Things happened to me" framing → external locus of control → Inconsistency signal.
// Simple heuristic: common passive constructions (was/were/been/got + past participle).

const PASSIVE_PATTERNS: RegExp[] = [
  /\b(?:was|were|been|got|have been|has been)\s+\w+ed\b/i,
  /\bit (?:just|always) (?:happens|happened)\b/i,
  /\blife got in the way\b/i,
  /\bthings came up\b/i,
  /\bcircumstances\b/i,
  /\bout of my control\b/i,
  /\bnot my fault\b/i,
  /\bbeyond my control\b/i,
];

// ─── Tokenization helper ─────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((count, re) => {
    const matches = text.match(new RegExp(re.source, re.flags + (re.flags.includes('g') ? '' : 'g')));
    return count + (matches ? matches.length : 0);
  }, 0);
}

function extractMatchedPhrases(text: string, patterns: RegExp[]): string[] {
  const found: string[] = [];
  for (const re of patterns) {
    const global = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    const matches = text.match(global);
    if (matches) {
      found.push(...matches.map(m => m.trim()));
    }
  }
  return [...new Set(found)];
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Analyze linguistic signals in a single answer string.
 *
 * Stone signal interpretation (used by stone-extractor.ts):
 *   - hedgeDensity > 0.25  → FearOfFailure | LowConfidence prior
 *   - conditionalLanguage  → TimeConstraint | FearOfFailure prior
 *   - changeVsSustainRatio < 0.5 → Inconsistency (ambivalent about change)
 *   - passiveVoiceCount >= 2 → Inconsistency (external attribution)
 *   - answerLength 'minimal' on emotional question → Perfectionism (avoidance signal)
 *   - topicAvoidanceDetected → FearOfFailure | Perfectionism
 */
export function analyzeLinguisticSignals(answer: string): LinguisticSignals {
  const wordCount = countWords(answer);

  // ── Hedge density ──────────────────────────────────────────────────────────
  const hedgeCount = countMatches(answer, HEDGE_PHRASES);
  const hedgeDensity = wordCount > 0 ? Math.min(hedgeCount / wordCount, 1) : 0;

  // ── Change talk vs sustain talk ───────────────────────────────────────────
  const changeCount  = countMatches(answer, CHANGE_TALK_PHRASES);
  const sustainCount = countMatches(answer, SUSTAIN_TALK_PHRASES);
  const total = changeCount + sustainCount;
  // Ratio: > 1 means more change talk; < 1 means more sustain talk; 1 = neutral
  const changeVsSustainRatio = total > 0 ? changeCount / Math.max(sustainCount, 1) : 1;

  // ── Passive voice ─────────────────────────────────────────────────────────
  const passiveVoiceCount = countMatches(answer, PASSIVE_PATTERNS);

  // ── Conditional language ──────────────────────────────────────────────────
  const conditionalLanguage = CONDITIONAL_PHRASES.some(re => re.test(answer));

  // ── Certainty markers ─────────────────────────────────────────────────────
  const certaintyMarkers = extractMatchedPhrases(answer, CERTAINTY_PHRASES);

  // ── Answer length classification ──────────────────────────────────────────
  // < 8 words  = minimal (avoidance / anxiety signal)
  // 9-50 words = normal
  // > 50 words = elaborate (high engagement, possibly overexplaining)
  let answerLength: 'minimal' | 'normal' | 'elaborate';
  if (wordCount < 8) {
    answerLength = 'minimal';
  } else if (wordCount <= 50) {
    answerLength = 'normal';
  } else {
    answerLength = 'elaborate';
  }

  // ── Topic avoidance ───────────────────────────────────────────────────────
  // Minimal answer + high hedge density on what should be a reflective question
  const topicAvoidanceDetected = answerLength === 'minimal' && hedgeDensity > 0.1;

  return {
    hedgeDensity,
    changeVsSustainRatio,
    passiveVoiceCount,
    conditionalLanguage,
    certaintyMarkers,
    answerLength,
    topicAvoidanceDetected,
  };
}

/**
 * Aggregate signals across multiple answers (the full interview).
 * Returns a merged LinguisticSignals averaging numeric fields,
 * unioning string arrays, and OR-ing booleans.
 */
export function aggregateLinguisticSignals(answers: string[]): LinguisticSignals {
  if (answers.length === 0) {
    return {
      hedgeDensity: 0,
      changeVsSustainRatio: 1,
      passiveVoiceCount: 0,
      conditionalLanguage: false,
      certaintyMarkers: [],
      answerLength: 'normal',
      topicAvoidanceDetected: false,
    };
  }

  const signals = answers.map(analyzeLinguisticSignals);

  const hedgeDensity         = signals.reduce((s, x) => s + x.hedgeDensity, 0) / signals.length;
  const changeVsSustainRatio = signals.reduce((s, x) => s + x.changeVsSustainRatio, 0) / signals.length;
  const passiveVoiceCount    = signals.reduce((s, x) => s + x.passiveVoiceCount, 0);
  const conditionalLanguage  = signals.some(x => x.conditionalLanguage);
  const certaintyMarkers     = [...new Set(signals.flatMap(x => x.certaintyMarkers))];
  const topicAvoidanceDetected = signals.some(x => x.topicAvoidanceDetected);

  // Majority-vote on answer length
  const lengths = signals.map(x => x.answerLength);
  const minimal   = lengths.filter(l => l === 'minimal').length;
  const elaborate = lengths.filter(l => l === 'elaborate').length;
  const answerLength: 'minimal' | 'normal' | 'elaborate' =
    minimal > signals.length / 2 ? 'minimal' :
    elaborate > signals.length / 2 ? 'elaborate' : 'normal';

  return {
    hedgeDensity,
    changeVsSustainRatio,
    passiveVoiceCount,
    conditionalLanguage,
    certaintyMarkers,
    answerLength,
    topicAvoidanceDetected,
  };
}

/**
 * Map aggregate linguistic signals to stone type priors (0-1 weight adjustments).
 * These are additive priors fed into stone-extractor's probability computation.
 *
 * Returns a partial Record<StoneType, number> — only stones with non-zero priors.
 */
export function linguisticSignalsToStonePriors(
  signals: LinguisticSignals
): Partial<Record<string, number>> {
  const priors: Record<string, number> = {};

  // High hedge density → FearOfFailure + LowConfidence
  if (signals.hedgeDensity > 0.25) {
    priors['FearOfFailure']  = (priors['FearOfFailure']  ?? 0) + 0.2;
    priors['LowConfidence']  = (priors['LowConfidence']  ?? 0) + 0.2;
  } else if (signals.hedgeDensity > 0.12) {
    priors['LowConfidence']  = (priors['LowConfidence']  ?? 0) + 0.1;
  }

  // Conditional language → barrier framing → TimeConstraint + FearOfFailure
  if (signals.conditionalLanguage) {
    priors['TimeConstraint'] = (priors['TimeConstraint'] ?? 0) + 0.15;
    priors['FearOfFailure']  = (priors['FearOfFailure']  ?? 0) + 0.1;
  }

  // Low change/sustain ratio → ambivalent about change → Inconsistency
  if (signals.changeVsSustainRatio < 0.5) {
    priors['Inconsistency']  = (priors['Inconsistency']  ?? 0) + 0.2;
  } else if (signals.changeVsSustainRatio < 1.0) {
    priors['Inconsistency']  = (priors['Inconsistency']  ?? 0) + 0.1;
  }

  // Passive voice clusters → external attribution → Inconsistency
  if (signals.passiveVoiceCount >= 2) {
    priors['Inconsistency']  = (priors['Inconsistency']  ?? 0) + 0.15;
  }

  // Topic avoidance on emotional questions → Perfectionism | FearOfFailure
  if (signals.topicAvoidanceDetected) {
    priors['Perfectionism']  = (priors['Perfectionism']  ?? 0) + 0.15;
    priors['FearOfFailure']  = (priors['FearOfFailure']  ?? 0) + 0.1;
  }

  // Minimal answer length across interview → avoidance pattern
  if (signals.answerLength === 'minimal') {
    priors['FearOfFailure']  = (priors['FearOfFailure']  ?? 0) + 0.1;
  }

  // Cap all priors at 0.4 to prevent linguistic signals from overriding LLM judgment
  for (const key of Object.keys(priors)) {
    priors[key] = Math.min(priors[key], 0.4);
  }

  return priors;
}
