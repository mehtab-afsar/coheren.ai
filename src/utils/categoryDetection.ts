import type { GoalCategory } from '../types';

/**
 * Detect goal category from user's goal description
 * Uses keyword matching to infer the category
 */

const categoryKeywords: Record<GoalCategory, string[]> = {
  Fitness: [
    'fitness', 'gym', 'workout', 'exercise', 'boxing', 'running', 'yoga',
    'weightlifting', 'cardio', 'strength', 'muscle', 'athletic', 'sport',
    'train', 'swimming', 'cycling', 'marathon', 'CrossFit', 'pilates',
    'health', 'body', 'physique', 'shape', 'active', 'jog', 'lift'
  ],

  Exam: [
    'exam', 'test', 'upsc', 'gmat', 'sat', 'gre', 'certification', 'license',
    'qualify', 'assessment', 'competitive', 'entrance', 'board', 'finals',
    'midterm', 'bar exam', 'medical', 'engineering', 'civil service',
    'interview prep', 'placement', 'university', 'college admission'
  ],

  Hobby: [
    'cooking', 'baking', 'photography', 'gardening', 'painting', 'drawing',
    'sketching', 'craft', 'knitting', 'woodwork', 'pottery', 'sculpting',
    'origami', 'calligraphy', 'dance', 'singing', 'instrument', 'guitar',
    'piano', 'drums', 'violin', 'magic', 'collection', 'model', 'diy'
  ],

  Learning: [
    'learn', 'language', 'spanish', 'french', 'german', 'chinese', 'japanese',
    'programming', 'coding', 'python', 'javascript', 'web dev', 'software',
    'design', 'photoshop', 'illustrator', 'video editing', 'animation',
    'public speaking', 'presentation', 'communication', 'skill', 'course',
    'study', 'master', 'understand', 'knowledge', 'education'
  ],

  Habit: [
    'habit', 'routine', 'daily', 'consistent', 'reading', 'meditation',
    'mindfulness', 'journaling', 'writing', 'wake up early', 'sleep',
    'hydration', 'water', 'stretching', 'gratitude', 'affirmation',
    'productivity', 'organize', 'clean', 'declutter', 'morning routine',
    'evening routine', 'track', 'log', 'regular', 'practice'
  ],

  Creative: [
    'write', 'book', 'novel', 'story', 'blog', 'article', 'content',
    'podcast', 'youtube', 'channel', 'video', 'film', 'movie', 'screenplay',
    'music', 'compose', 'produce', 'song', 'album', 'art', 'create',
    'project', 'portfolio', 'startup', 'app', 'website', 'game', 'design',
    'business', 'brand', 'launch', 'publish', 'release'
  ]
};

/**
 * Detect category from goal text
 * Returns the most likely category based on keyword matches
 */
export function detectCategory(goalText: string): GoalCategory {
  const normalized = goalText.toLowerCase().trim();

  // Count matches for each category
  const scores: Record<GoalCategory, number> = {
    Fitness: 0,
    Exam: 0,
    Hobby: 0,
    Learning: 0,
    Habit: 0,
    Creative: 0
  };

  // Score each category based on keyword matches
  Object.entries(categoryKeywords).forEach(([category, keywords]) => {
    keywords.forEach(keyword => {
      if (normalized.includes(keyword.toLowerCase())) {
        scores[category as GoalCategory]++;
      }
    });
  });

  // Find category with highest score
  let maxCategory: GoalCategory = 'Fitness'; // Default
  let maxScore = 0;

  Object.entries(scores).forEach(([category, score]) => {
    if (score > maxScore) {
      maxScore = score;
      maxCategory = category as GoalCategory;
    }
  });

  // If no matches, try to infer from common patterns
  if (maxScore === 0) {
    if (normalized.includes('learn') || normalized.includes('study')) {
      return 'Learning';
    }
    if (normalized.includes('build') || normalized.includes('create')) {
      return 'Creative';
    }
    if (normalized.includes('everyday') || normalized.includes('daily')) {
      return 'Habit';
    }
  }

  return maxCategory;
}

/**
 * Get category-specific questions based on detected category
 */
export function getCategoryQuestions(category: GoalCategory): string[] {
  const questionMap: Record<GoalCategory, string[]> = {
    Fitness: [
      "If you had to jog for 10 minutes right now, how would that feel? (Easy / Doable / Very difficult)",
      "Do you have any injuries or physical limitations I should know about?",
      "Where will you be training? (Gym / Home / Outdoors / Mix)"
    ],

    Exam: [
      "When is your exam date? (Or how many months do you have?)",
      "Is this your first attempt, or have you studied for this before?",
      "How many hours per day can you realistically study?"
    ],

    Hobby: [
      "Are you a complete beginner, or have you tried this before?",
      "Do you have the basic equipment/tools you need?",
      "What's your goal - just for fun, or do you want to get really good?"
    ],

    Learning: [
      "Why do you want to learn this? (helps me personalize your path)",
      "Any prior experience with this?",
      "What level do you want to reach? (Basic / Conversational / Professional)"
    ],

    Habit: [
      "Have you tried building this habit before?",
      "What's your target? (e.g., 15 min/day, once daily, etc.)"
    ],

    Creative: [
      "What's the specific project you want to create?",
      "When do you want to finish or launch this?",
      "Any experience with this type of creative work?"
    ]
  };

  return questionMap[category];
}
