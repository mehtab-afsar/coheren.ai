/**
 * CONSIST RAG — Main Export
 *
 * Retrieval priority:
 *   1. retrieveKnowledgeWithFallback() — async, semantic (Jina + pgvector) with static fallback
 *   2. retrieveKnowledge()             — sync, static keyword scoring (always available)
 *   3. searchKnowledge()               — sync, static keyword filter
 */

export {
  retrieveKnowledge,
  retrieveKnowledgeWithFallback,
  searchKnowledge,
  getFullKnowledgeContext,
  type UserContext,
  type KnowledgeCategory,
} from './knowledge-base';

export {
  buildScienceBackedPrompt,
  buildOnboardingPrompt,
  getQuickPrompt,
  COACHING_PERSONAS,
} from './prompt-builder';

// Direct semantic retriever — for agents that build their own query string
export { retrieveKnowledgeSemantic } from './semantic-retriever';
