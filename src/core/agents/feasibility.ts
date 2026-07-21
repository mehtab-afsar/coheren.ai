/**
 * Goal feasibility — the external time anchor the engine was missing.
 *
 * Agent 1 previously *opined* on whether a goal fits the timeline (LLM mood at
 * temperature 0.2). This computes it: availableHours = days × minutes / 60, vs a
 * coarse hours-to-BASIC-competence anchor per goal type. The point isn't precision
 * — it's catching fantasy timelines ("fluent Japanese in 2 weeks @10min ≈ 2.3h")
 * deterministically, so we can flag them and offer a rescoped goal instead of
 * quietly building a 90-day fantasy plan.
 *
 * Anchors are rough, literature-informed ranges for *basic working competence*
 * (not mastery): e.g. conversational language ≈ 150–600h, an instrument ≈ 100–200h.
 */

interface CompetenceBand {
  /** Human label for the skill (used in messaging). */
  label: string;
  /** Rough hours to basic working competence. */
  hoursToBasic: number;
  /** A concrete smaller goal to suggest when the timeline is unrealistic. */
  rescope: string;
}

// Ordered — first keyword match wins.
const COMPETENCE_BANDS: Array<{ match: RegExp; band: CompetenceBand }> = [
  { match: /\b(language|fluent|fluency|spanish|french|japanese|german|mandarin|chinese|italian|portuguese|korean|arabic)\b/i,
    band: { label: 'a new language', hoursToBasic: 250, rescope: 'survival basics — ~150 essential phrases + everyday listening' } },
  { match: /\b(guitar|piano|violin|instrument|drums|ukulele|bass|cello)\b/i,
    band: { label: 'a musical instrument', hoursToBasic: 120, rescope: 'play 3 simple songs cleanly' } },
  { match: /\b(marathon|half.?marathon|10k|5k|run|running|jog)\b/i,
    band: { label: 'endurance running', hoursToBasic: 120, rescope: 'build to a comfortable 5K' } },
  { match: /\b(box|boxing|martial|karate|mma|muay thai|kickbox|judo|bjj|jiu.?jitsu)\b/i,
    band: { label: 'a combat sport', hoursToBasic: 120, rescope: 'solid fundamentals — stance, footwork, the core strikes' } },
  { match: /\b(cod(e|ing)|program+(ing|er)?|python|javascript|typescript|web ?dev|software|app|full.?stack)\b/i,
    band: { label: 'programming', hoursToBasic: 200, rescope: 'build one small working project end-to-end' } },
  { match: /\b(exam|gcse|sat|a.?level|test|certification|upsc|gre|gmat|mcat|lsat)\b/i,
    band: { label: 'exam prep', hoursToBasic: 150, rescope: 'master the 3 highest-weight topics first' } },
  { match: /\b(draw|drawing|paint|painting|art|sketch|illustrat)\b/i,
    band: { label: 'drawing', hoursToBasic: 150, rescope: 'a daily sketch habit + confident basic forms' } },
  { match: /\b(writ(e|ing)|novel|blog|screenplay|essay|copywrit)\b/i,
    band: { label: 'a writing practice', hoursToBasic: 100, rescope: 'a daily 200-word writing habit' } },
  { match: /\b(fitness|gym|strength|muscle|weight|lift|fit)\b/i,
    band: { label: 'a fitness habit', hoursToBasic: 60, rescope: 'a consistent 3×/week routine you can actually hold' } },
  { match: /\b(meditat|mindful|breathwork)\b/i,
    band: { label: 'a meditation habit', hoursToBasic: 30, rescope: 'a daily 10-minute sit' } },
  { match: /\b(cook|cooking|bake|baking|chef)\b/i,
    band: { label: 'cooking', hoursToBasic: 80, rescope: 'nail 5 reliable weeknight meals' } },
  { match: /\b(chess)\b/i,
    band: { label: 'chess', hoursToBasic: 120, rescope: 'solid openings + basic tactics' } },
];

const DEFAULT_BAND: CompetenceBand = {
  label: 'this skill',
  hoursToBasic: 120,
  rescope: 'a focused first milestone you can actually reach in the time you have',
};

export type FeasibilityVerdict = 'comfortable' | 'tight' | 'unrealistic';

export interface FeasibilityAssessment {
  availableHours: number;   // days × minutes / 60, rounded
  requiredHours: number;    // anchor for basic competence
  ratio: number;            // available / required
  verdict: FeasibilityVerdict;
  skillLabel: string;
  /** Present only when verdict === 'unrealistic'. */
  rescopedGoalSuggestion?: string;
}

/**
 * Compute deterministic feasibility from days × minutes vs an hours-to-competence
 * anchor. `comfortable` ≥ 0.8× the anchor, `tight` ≥ 0.35×, else `unrealistic`.
 */
export function assessFeasibility(input: {
  goalText: string;
  timelineDays: number;
  dailyMinutes: number;
}): FeasibilityAssessment {
  const band = COMPETENCE_BANDS.find(b => b.match.test(input.goalText))?.band ?? DEFAULT_BAND;
  const availableHours = Math.max(0, (input.timelineDays * input.dailyMinutes) / 60);
  const requiredHours = band.hoursToBasic;
  const ratio = requiredHours > 0 ? availableHours / requiredHours : 1;

  let verdict: FeasibilityVerdict;
  if (ratio >= 0.8) verdict = 'comfortable';
  else if (ratio >= 0.35) verdict = 'tight';
  else verdict = 'unrealistic';

  return {
    availableHours: Math.round(availableHours),
    requiredHours,
    ratio: Math.round(ratio * 100) / 100,
    verdict,
    skillLabel: band.label,
    rescopedGoalSuggestion: verdict === 'unrealistic' ? band.rescope : undefined,
  };
}
