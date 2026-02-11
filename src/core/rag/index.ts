/**
 * CONSIST RAG - Main Export
 * Science-backed AI coaching through knowledge retrieval
 */

export {
  retrieveKnowledge,
  searchKnowledge,
  getFullKnowledgeContext,
  type UserContext,
  type KnowledgeCategory
} from './knowledge-base';

export { buildScienceBackedPrompt, COACHING_PERSONAS } from './prompt-builder';
