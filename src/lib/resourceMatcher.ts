/**
 * RESOURCE MATCHER
 *
 * Intelligently matches tasks to curated resources from the library.
 * Uses keyword matching, topic analysis, and LLM fallback.
 */

import { callEconomy } from './ai-router';
import {
  getResourcesForCategory,
  searchResourcesByTopic,
  type ResourceLink,
  type GoalResources
} from './resourceLibrary';

// ============================================
// KEYWORD MAPPING
// ============================================

/**
 * Maps common task keywords to resource topics
 */
const KEYWORD_TO_TOPIC_MAP: Record<string, string[]> = {
  // Guitar
  'chord': ['chords', 'basic_chords'],
  'strum': ['strumming'],
  'tune': ['tuning'],
  'finger': ['finger_exercises', 'technique'],
  'warm': ['warm_up'],
  'scale': ['scales', 'theory'],
  'song': ['songs', 'easy_songs'],

  // Boxing
  'jab': ['jab', 'punches'],
  'cross': ['cross', 'punches'],
  'hook': ['hook', 'punches'],
  'uppercut': ['uppercut', 'punches'],
  'stance': ['stance', 'fundamentals'],
  'footwork': ['footwork', 'movement'],
  'shadow': ['shadowboxing'],
  'combo': ['combos', 'combinations'],
  'defense': ['defense', 'blocking'],

  // Coding
  'html': ['html', 'html_basics'],
  'css': ['css', 'css_basics', 'styling'],
  'javascript': ['javascript', 'javascript_basics'],
  'react': ['react', 'frameworks'],
  'responsive': ['responsive', 'responsive_design'],
  'layout': ['layout', 'flexbox', 'grid'],
  'form': ['forms', 'html'],
  'api': ['api', 'backend'],

  // Fitness
  'push': ['push_ups', 'chest'],
  'pull': ['pull_ups', 'back'],
  'squat': ['squats', 'legs'],
  'plank': ['core', 'abs'],
  'cardio': ['cardio', 'hiit'],
  'stretch': ['flexibility', 'stretching'],
  'workout': ['workout', 'full_body'],
};

/**
 * Extracts topics from task title and description
 */
function extractTopicsFromTask(taskTitle: string, taskDescription?: string): string[] {
  const text = `${taskTitle} ${taskDescription || ''}`.toLowerCase();
  const topics: string[] = [];

  Object.entries(KEYWORD_TO_TOPIC_MAP).forEach(([keyword, topicList]) => {
    if (text.includes(keyword)) {
      topics.push(...topicList);
    }
  });

  return [...new Set(topics)]; // Remove duplicates
}

// ============================================
// RESOURCE MATCHING LOGIC
// ============================================

export interface MatchedResource {
  primary: ResourceLink | null;
  supplementary: ResourceLink[];
  matchMethod: 'library' | 'search' | 'ai_generated' | 'none';
}

/**
 * Main function: Match a task to resources
 */
export async function matchTaskToResources(
  taskTitle: string,
  taskDescription: string,
  category: string,
  skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): Promise<MatchedResource> {

  console.log(`🔍 Matching resources for: "${taskTitle}"`);

  // Step 1: Get resources for this category
  const categoryResources = getResourcesForCategory(category);

  if (!categoryResources) {
    console.warn(`⚠️ No resource library found for category: ${category}`);
    return {
      primary: null,
      supplementary: [],
      matchMethod: 'none'
    };
  }

  // Step 2: Extract topics from task
  const topics = extractTopicsFromTask(taskTitle, taskDescription);
  console.log(`📌 Extracted topics:`, topics);

  if (topics.length === 0) {
    // No keywords matched - use AI to suggest topics
    const aiTopics = await extractTopicsWithAI(taskTitle, taskDescription, category);
    topics.push(...aiTopics);
  }

  // Step 3: Search library by topics
  const matchedResources = searchResourcesByTopic(category, topics);

  if (matchedResources.length > 0) {
    console.log(`✅ Found ${matchedResources.length} resources in library`);

    // Filter by skill level
    const levelMatched = matchedResources.filter(
      r => !r.skillLevel || r.skillLevel === skillLevel || r.skillLevel === 'beginner'
    );

    const primary = levelMatched[0] || matchedResources[0];
    const supplementary = levelMatched.slice(1, 3); // Max 2 supplementary

    return {
      primary,
      supplementary,
      matchMethod: 'library'
    };
  }

  // Step 4: Fallback - Generate resource suggestions with AI
  console.log(`🤖 No library match, generating AI suggestions...`);
  return await generateResourceWithAI(taskTitle, taskDescription, category, skillLevel, categoryResources);
}

// ============================================
// AI HELPERS
// ============================================

/**
 * Use AI to extract topics when keyword matching fails
 */
async function extractTopicsWithAI(
  taskTitle: string,
  taskDescription: string,
  category: string
): Promise<string[]> {

  try {
    const prompt = `Extract 1-3 key topics/keywords from this task:

Task: ${taskTitle}
Description: ${taskDescription}
Category: ${category}

Return ONLY the topics as a comma-separated list (e.g., "footwork, defense, movement")
No explanations.`;

    const { content: response } = await callEconomy({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 50,
    });

    const topics = response.split(',').map(t => t.trim().toLowerCase());

    return topics;
  } catch (error) {
    console.error('AI topic extraction failed:', error);
    return [];
  }
}

/**
 * Use AI to generate resource recommendations when library has no match
 */
async function generateResourceWithAI(
  taskTitle: string,
  taskDescription: string,
  category: string,
  skillLevel: string,
  categoryResources: GoalResources
): Promise<MatchedResource> {

  try {
    // Give AI the available channels/platforms for this category
    const availableChannels = categoryResources.channels.map(ch => ch.name).join(', ');

    const prompt = `You are a resource curator. Suggest the BEST resource for this task.

Task: ${taskTitle}
Description: ${taskDescription}
Category: ${category}
Skill Level: ${skillLevel}

Available trusted channels: ${availableChannels}

Return ONLY this JSON (no markdown, no code blocks):
{
  "type": "video",
  "title": "Exact video title or search query",
  "searchQuery": "YouTube search keywords",
  "channel": "Channel name from available list",
  "duration": "estimate",
  "description": "What this teaches",
  "why": "Why this is the best resource for this task"
}`;

    const { content: responseText } = await callEconomy({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    // Try to parse JSON
    let resource;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resource = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // JSON parse failed
      return {
        primary: null,
        supplementary: [],
        matchMethod: 'none'
      };
    }

    // Convert AI response to ResourceLink format
    const aiResource: ResourceLink = {
      type: resource.type || 'video',
      title: resource.title || taskTitle,
      url: `https://youtube.com/results?search_query=${encodeURIComponent(resource.searchQuery || taskTitle)}`,
      platform: 'YouTube',
      channel: resource.channel,
      duration: resource.duration,
      description: resource.description || '',
      why: resource.why || 'AI recommended resource',
      skillLevel: skillLevel as 'beginner' | 'intermediate' | 'advanced' | 'all',
      topics: []
    };

    console.log(`🤖 Generated AI resource:`, aiResource.title);

    return {
      primary: aiResource,
      supplementary: [],
      matchMethod: 'ai_generated'
    };

  } catch (error) {
    console.error('AI resource generation failed:', error);
    return {
      primary: null,
      supplementary: [],
      matchMethod: 'none'
    };
  }
}

// ============================================
// BATCH MATCHING
// ============================================

/**
 * Match multiple tasks at once (for roadmap generation)
 */
export async function matchTasksToResources(
  tasks: Array<{
    title: string;
    description: string;
  }>,
  category: string,
  skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): Promise<MatchedResource[]> {

  const results: MatchedResource[] = [];

  for (const task of tasks) {
    const matched = await matchTaskToResources(
      task.title,
      task.description,
      category,
      skillLevel
    );
    results.push(matched);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
}

// ============================================
// RESOURCE RATING SYSTEM (Future feature)
// ============================================

/**
 * Track resource effectiveness
 * (To be integrated with user feedback)
 */
export interface ResourceRating {
  resourceUrl: string;
  taskId: string;
  helpful: boolean;
  userId: string;
  timestamp: Date;
}

// Placeholder for future implementation
export async function rateResource(rating: ResourceRating): Promise<void> {
  // TODO: Save to Supabase
  console.log('Resource rated:', rating);
}

/**
 * Get resources sorted by user ratings
 * (Future feature)
 */
export async function getTopRatedResources(): Promise<ResourceLink[]> {
  // TODO: Add category and topic parameters when implementing
  // TODO: Query Supabase for highest rated resources
  return [];
}
