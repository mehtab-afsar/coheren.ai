/**
 * Agent 2: Stone Identifier
 *
 * Two-mode agent:
 *
 * MODE 1 — identifyStones()
 *   Input:  AgentContext + Agent1Output (goal analysis)
 *   Output: Agent2Output (questions to render in UI)
 *   When:   Before user answers — generates the diagnostic interview
 *
 * MODE 2 — extractStones()
 *   Input:  AgentContext + Agent1Output + StoneAnswer[] (user's answers)
 *   Output: Agent2ProfileOutput (behavioral stone profile)
 *   When:   After user answers — maps responses to stone taxonomy
 *
 * Downstream consumers:
 *   - Agent 3 reads stoneProfile.agent3Guidance to shape curriculum
 *   - Agent 5 reads stoneProfile.agent5Note to predict recalibration needs
 */

export { generateQuestions as identifyStones } from './question-generator';
export { extractStones } from './stone-extractor';
export { STONE_CATEGORIES, STONE_TO_CATEGORY, STONE_DESCRIPTIONS, DOMAIN_GAPS, ALL_STONE_TYPES } from './stone-taxonomy';
