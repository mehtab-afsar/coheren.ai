/**
 * COHEREN RESOURCE LIBRARY
 *
 * Curated learning resources for various goal categories.
 * Each resource has been manually vetted for quality, beginner-friendliness, and accuracy.
 *
 * Philosophy:
 * - Quality over quantity (5 great resources > 50 mediocre ones)
 * - Free resources only (no paywalls)
 * - Beginner-friendly creators prioritized
 * - Updated regularly based on user ratings
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ResourceType = 'video' | 'article' | 'interactive' | 'image' | 'pdf' | 'tool' | 'playlist';

export interface ResourceLink {
  type: ResourceType;
  title: string;
  url: string;
  platform?: string; // YouTube, article site, etc.
  channel?: string; // For videos
  duration?: string; // For videos
  thumbnail?: string;
  description: string;
  why: string; // Why this resource is recommended
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  topics?: string[]; // Tags for matching
  timestamps?: Record<string, string>; // For videos with sections
  rating?: number; // User rating (0-5)
  views?: string; // For credibility
}

export interface CuratedChannel {
  name: string;
  channelId: string;
  channelUrl: string;
  why: string;
  topics: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'all';
  bestFor: string;
}

export interface GoalResources {
  channels: CuratedChannel[];
  playlists: ResourceLink[];
  articles: ResourceLink[];
  tools: ResourceLink[];
  keyResources: Record<string, ResourceLink[]>; // Specific topics
}

// ============================================
// GUITAR RESOURCES
// ============================================

export const GUITAR_RESOURCES: GoalResources = {
  channels: [
    {
      name: "JustinGuitar",
      channelId: "UCBNvgoGBUB1NvDlJq53i5tg",
      channelUrl: "https://youtube.com/@justinguitar",
      why: "Gold standard for guitar education. Free structured course from beginner to advanced.",
      topics: ["chords", "strumming", "theory", "songs", "technique"],
      bestFor: "Complete beginners and structured learning",
      skillLevel: "all" as const
    },
    {
      name: "Marty Music",
      channelId: "UCmnlTWVJysjWPFiZhQ5uudg",
      channelUrl: "https://youtube.com/@MartyMusic",
      why: "Popular song tutorials, easy to follow, great for motivation",
      topics: ["songs", "easy_songs", "tutorials"],
      skillLevel: "beginner",
      bestFor: "Learning popular songs quickly"
    },
    {
      name: "GuitarLessons365",
      channelId: "UCkERVCt9oby0YAGZalj_CrQ",
      channelUrl: "https://youtube.com/@GuitarLessons365Song",
      why: "Detailed technique breakdowns, multiple camera angles",
      topics: ["technique", "theory", "songs"],
      skillLevel: "intermediate",
      bestFor: "Understanding technique deeply"
    },
    {
      name: "Andy Guitar",
      channelId: "UCj_b2Cww6R_kImZ6OIY0x9w",
      channelUrl: "https://youtube.com/@AndyGuitar",
      why: "Energetic teaching style, great for beginners",
      topics: ["chords", "songs", "strumming"],
      skillLevel: "beginner",
      bestFor: "Fun, engaging lessons"
    }
  ],

  playlists: [
    {
      type: "playlist",
      title: "JustinGuitar Beginner Course - Grade 1",
      url: "https://youtube.com/playlist?list=PLF0ED615F90B85F56",
      platform: "YouTube",
      channel: "JustinGuitar",
      description: "Complete beginner course covering first chords, strumming, and songs",
      why: "Most comprehensive free guitar course. Millions have learned from this.",
      skillLevel: "beginner",
      topics: ["chords", "strumming", "fundamentals"]
    }
  ],

  articles: [
    {
      type: "article",
      title: "Guitar Chord Library",
      url: "https://www.justinguitar.com/guitar-lessons/beginner-guitar-chords-bc-101",
      platform: "JustinGuitar.com",
      description: "Visual chord diagrams for all basic chords",
      why: "Clear diagrams showing finger placement for every chord",
      skillLevel: "beginner",
      topics: ["chords", "reference"]
    },
    {
      type: "article",
      title: "How to Read Guitar Tabs",
      url: "https://www.ultimate-guitar.com/lessons/for_beginners/absolute_beginners_guide_to_reading_guitar_tab.html",
      platform: "Ultimate Guitar",
      description: "Complete guide to reading guitar tablature",
      why: "Essential skill for learning songs online",
      skillLevel: "beginner",
      topics: ["tabs", "reading_music"]
    }
  ],

  tools: [
    {
      type: "interactive",
      title: "Guitar Tuner Online",
      url: "https://tuner-online.com/",
      description: "Free online guitar tuner using your device microphone",
      why: "Essential tool - your guitar must be in tune to sound good",
      skillLevel: "beginner",
      topics: ["tuning", "tool"]
    },
    {
      type: "interactive",
      title: "Chord Chart Generator",
      url: "https://www.scales-chords.com/chordid.php",
      description: "Interactive chord finder and builder",
      why: "Helps visualize and understand chord construction",
      skillLevel: "intermediate",
      topics: ["chords", "theory"]
    }
  ],

  keyResources: {
    "basic_chords": [
      {
        type: "video",
        title: "Your First Guitar Chords - A, D, E",
        url: "https://youtube.com/watch?v=2NPPfJd-9EA",
        platform: "YouTube",
        channel: "JustinGuitar",
        duration: "8:42",
        description: "Learn your first three guitar chords with proper finger placement",
        why: "Perfect starting point. These 3 chords unlock hundreds of songs.",
        skillLevel: "beginner",
        topics: ["chords", "A_chord", "D_chord", "E_chord"],
        timestamps: {
          "A chord": "0:45",
          "D chord": "3:20",
          "E chord": "5:50",
          "Practice tips": "7:30"
        }
      },
      {
        type: "image",
        title: "Beginner Chord Chart",
        url: "https://www.justinguitar.com/images/lessons/bc-101-beginner-guitar-chords.jpg",
        description: "Visual reference chart for first 8 chords",
        why: "Print this out and keep it next to you while practicing",
        skillLevel: "beginner",
        topics: ["chords", "reference"]
      }
    ],

    "strumming": [
      {
        type: "video",
        title: "Beginner Strumming Patterns",
        url: "https://youtube.com/watch?v=LXUe34fGgZU",
        platform: "YouTube",
        channel: "JustinGuitar",
        duration: "10:15",
        description: "Essential strumming patterns every guitarist needs",
        why: "Makes the difference between sounding amateur and musical",
        skillLevel: "beginner",
        topics: ["strumming", "rhythm"]
      }
    ],

    "finger_exercises": [
      {
        type: "video",
        title: "5 Minute Finger Warm-Up",
        url: "https://youtube.com/watch?v=zOHvEa3H4WE",
        platform: "YouTube",
        channel: "GuitarLessons365",
        duration: "5:32",
        description: "Daily finger dexterity exercises",
        why: "Builds finger strength and independence. Do this before every practice.",
        skillLevel: "beginner",
        topics: ["technique", "warm_up", "finger_dexterity"]
      }
    ],

    "tuning": [
      {
        type: "video",
        title: "How to Tune a Guitar for Absolute Beginners",
        url: "https://youtube.com/watch?v=y_xQa3qxTH4",
        platform: "YouTube",
        channel: "Andy Guitar",
        duration: "4:18",
        description: "Step-by-step tuning guide using free online tuner",
        why: "An out-of-tune guitar will sound terrible no matter how well you play",
        skillLevel: "beginner",
        topics: ["tuning", "maintenance"]
      }
    ]
  }
};

// ============================================
// BOXING RESOURCES
// ============================================

export const BOXING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "FightTips",
      channelId: "UC3QK8r-pp_tJE93VP2xrMqg",
      channelUrl: "https://youtube.com/@FightTips",
      why: "Clear technique breakdowns, beginner-friendly, covers all fundamentals",
      topics: ["punches", "footwork", "defense", "combos", "conditioning"],
      skillLevel: "beginner",
      bestFor: "Learning proper technique from scratch"
    },
    {
      name: "Tony Jeffries",
      channelId: "UCCGWYDJBlIg30T5lNVJKP5w",
      channelUrl: "https://youtube.com/@TonyJeffries",
      why: "Olympic bronze medalist, specializes in home training without equipment",
      topics: ["home_training", "shadowboxing", "technique", "no_equipment"],
      bestFor: "Training at home without a gym",
      skillLevel: "all" as const
    },
    {
      name: "Precision Striking",
      channelId: "UCCOuKzj_z5dS2VJrnmV3TYQ",
      channelUrl: "https://youtube.com/@precisionstriking",
      why: "Technical deep dives, explains the 'why' behind every movement",
      topics: ["technique", "defense", "advanced_concepts"],
      skillLevel: "intermediate",
      bestFor: "Understanding boxing mechanics deeply"
    },
    {
      name: "Coach Anthony",
      channelId: "UCMZDl_ou8C9bihGSYwVw4CA",
      channelUrl: "https://youtube.com/@CoachAnthonyBoxing",
      why: "Professional boxing coach, great for beginners",
      topics: ["fundamentals", "drills", "technique"],
      skillLevel: "beginner",
      bestFor: "Structured fundamentals training"
    }
  ],

  playlists: [
    {
      type: "playlist",
      title: "Complete Beginner Boxing Course",
      url: "https://youtube.com/playlist?list=PLdUKz32tUG1IJAKa1g5qcPSXLdPM8jn_q",
      platform: "YouTube",
      channel: "FightTips",
      description: "15-video series covering all boxing fundamentals",
      why: "Most comprehensive free boxing course online",
      skillLevel: "beginner",
      topics: ["fundamentals", "complete_course"]
    }
  ],

  articles: [
    {
      type: "article",
      title: "Boxing Stance Guide",
      url: "https://www.expertboxing.com/boxing-basics/boxing-stance",
      platform: "ExpertBoxing",
      description: "Detailed guide to proper boxing stance with diagrams",
      why: "Everything in boxing starts with proper stance",
      skillLevel: "beginner",
      topics: ["stance", "fundamentals"]
    }
  ],

  tools: [
    {
      type: "tool",
      title: "Interval Timer for Boxing Rounds",
      url: "https://www.intervaltimer.com/timers/boxing-timer",
      description: "Customizable round timer for training",
      why: "Simulates real boxing rounds (3 min work, 1 min rest)",
      topics: ["training", "tool"]
    }
  ],

  keyResources: {
    "stance": [
      {
        type: "video",
        title: "Perfect Boxing Stance for Beginners",
        url: "https://youtube.com/watch?v=hbWxRI50o28",
        platform: "YouTube",
        channel: "FightTips",
        duration: "6:45",
        description: "How to stand correctly in boxing with common mistakes to avoid",
        why: "Your stance is the foundation of everything in boxing",
        skillLevel: "beginner",
        topics: ["stance", "fundamentals"],
        timestamps: {
          "Feet position": "0:50",
          "Hand position": "2:30",
          "Common mistakes": "4:45"
        }
      }
    ],

    "jab": [
      {
        type: "video",
        title: "How to Throw a Jab - Complete Breakdown",
        url: "https://youtube.com/watch?v=8wvaXD_SwXc",
        platform: "YouTube",
        channel: "Tony Jeffries",
        duration: "8:22",
        description: "Olympic boxer teaches proper jab technique from stance to follow-through",
        why: "The jab is boxing's most important punch. Learn it right from the start.",
        skillLevel: "beginner",
        topics: ["jab", "punches", "technique"],
        timestamps: {
          "Mechanics": "1:15",
          "Power generation": "3:40",
          "Common mistakes": "6:20",
          "Drill": "7:30"
        }
      },
      {
        type: "video",
        title: "Shadowboxing Jab Drill (Follow Along)",
        url: "https://youtube.com/watch?v=N0HFNEoJmSU",
        platform: "YouTube",
        channel: "Coach Anthony",
        duration: "5:00",
        description: "Follow-along drill focusing only on jab practice",
        why: "Practice jab form in real-time with a coach",
        skillLevel: "beginner",
        topics: ["jab", "shadowboxing", "drill"]
      }
    ],

    "cross": [
      {
        type: "video",
        title: "How to Throw a Cross (Straight Right)",
        url: "https://youtube.com/watch?v=kL7gWFURTP0",
        platform: "YouTube",
        channel: "FightTips",
        duration: "7:15",
        description: "Proper cross technique with hip rotation and power generation",
        why: "Your power punch. Learn to generate knockout power safely.",
        skillLevel: "beginner",
        topics: ["cross", "punches", "power"]
      }
    ],

    "footwork": [
      {
        type: "video",
        title: "Basic Boxing Footwork for Beginners",
        url: "https://youtube.com/watch?v=k29znXMp_yA",
        platform: "YouTube",
        channel: "Precision Striking",
        duration: "9:30",
        description: "Forward, backward, lateral movement while maintaining stance",
        why: "Good footwork makes you hard to hit and positions you to land punches",
        skillLevel: "beginner",
        topics: ["footwork", "movement", "defense"]
      }
    ],

    "shadowboxing": [
      {
        type: "video",
        title: "Beginner Shadowboxing Workout (15 Min)",
        url: "https://youtube.com/watch?v=cXKvQ3Wt_2Q",
        platform: "YouTube",
        channel: "Tony Jeffries",
        duration: "15:00",
        description: "Complete follow-along shadowboxing session for beginners",
        why: "Practice technique without equipment. Perfect for home training.",
        skillLevel: "beginner",
        topics: ["shadowboxing", "workout", "no_equipment"]
      }
    ]
  }
};

// ============================================
// WEB DEVELOPMENT RESOURCES
// ============================================

export const CODING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "freeCodeCamp",
      channelId: "UC8butISFwT-Wl7EV0hUK0BQ",
      channelUrl: "https://youtube.com/@freecodecamp",
      why: "Comprehensive courses, completely free, no fluff",
      topics: ["html", "css", "javascript", "react", "backend", "full_stack"],
      bestFor: "Complete beginners and structured learning paths",
      skillLevel: "all" as const
    },
    {
      name: "Web Dev Simplified",
      channelId: "UCFbNIlppjAuEX4znoulh0Cw",
      channelUrl: "https://youtube.com/@WebDevSimplified",
      why: "Complex topics explained simply, great for understanding concepts",
      topics: ["javascript", "react", "css", "web_concepts"],
      skillLevel: "beginner",
      bestFor: "Understanding web dev concepts clearly"
    },
    {
      name: "The Net Ninja",
      channelId: "UCW5YeuERMmlnqo4oq8vwUpg",
      channelUrl: "https://youtube.com/@NetNinja",
      why: "Project-based tutorials, great teaching style",
      topics: ["javascript", "react", "node", "mongodb", "full_stack"],
      skillLevel: "intermediate",
      bestFor: "Building real projects"
    },
    {
      name: "Traversy Media",
      channelId: "UC29ju8bIPH5as8OGnQzwJyA",
      channelUrl: "https://youtube.com/@TraversyMedia",
      why: "Crash courses on every web technology, practical focus",
      topics: ["html", "css", "javascript", "frameworks", "tools"],
      bestFor: "Quick intros to new technologies",
      skillLevel: "all" as const
    }
  ],

  playlists: [],

  articles: [
    {
      type: "article",
      title: "MDN Web Docs - HTML Basics",
      url: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web/HTML_basics",
      platform: "MDN",
      description: "The definitive guide to HTML from Mozilla",
      why: "Most authoritative web development documentation",
      skillLevel: "beginner",
      topics: ["html", "reference"]
    },
    {
      type: "article",
      title: "CSS-Tricks Complete Guide to Flexbox",
      url: "https://css-tricks.com/snippets/css/a-guide-to-flexbox/",
      platform: "CSS-Tricks",
      description: "Visual guide to CSS Flexbox layout",
      why: "The best Flexbox reference. Bookmark this.",
      skillLevel: "beginner",
      topics: ["css", "flexbox", "layout"]
    },
    {
      type: "article",
      title: "JavaScript.info - The Modern JavaScript Tutorial",
      url: "https://javascript.info/",
      platform: "javascript.info",
      description: "Complete modern JavaScript course in article form",
      why: "Most comprehensive free JavaScript resource",
      topics: ["javascript", "complete_course"]
    }
  ],

  tools: [
    {
      type: "interactive",
      title: "CodePen",
      url: "https://codepen.io/",
      description: "Online code editor for HTML/CSS/JS",
      why: "Test code instantly without setting up anything",
      topics: ["tool", "practice"]
    },
    {
      type: "interactive",
      title: "VS Code Online",
      url: "https://vscode.dev/",
      description: "Full VS Code in your browser",
      why: "Professional code editor, free, runs in browser",
      topics: ["tool", "editor"]
    },
    {
      type: "interactive",
      title: "Can I Use",
      url: "https://caniuse.com/",
      description: "Browser compatibility checker",
      why: "Check if a feature works across browsers",
      skillLevel: "intermediate",
      topics: ["tool", "compatibility"]
    }
  ],

  keyResources: {
    "html_basics": [
      {
        type: "video",
        title: "HTML Crash Course for Absolute Beginners",
        url: "https://youtube.com/watch?v=UB1O30fR-EE",
        platform: "YouTube",
        channel: "Traversy Media",
        duration: "60:00",
        description: "Complete HTML fundamentals in one hour",
        why: "Everything you need to start writing HTML",
        skillLevel: "beginner",
        topics: ["html", "crash_course"],
        timestamps: {
          "HTML structure": "5:00",
          "Tags and elements": "12:30",
          "Forms": "35:00",
          "Semantic HTML": "48:00"
        }
      }
    ],

    "css_basics": [
      {
        type: "video",
        title: "CSS Crash Course for Absolute Beginners",
        url: "https://youtube.com/watch?v=yfoY53QXEnI",
        platform: "YouTube",
        channel: "Traversy Media",
        duration: "85:00",
        description: "Complete CSS fundamentals including Flexbox and Grid",
        why: "Everything needed to style modern websites",
        skillLevel: "beginner",
        topics: ["css", "styling", "layout"]
      }
    ],

    "javascript_basics": [
      {
        type: "video",
        title: "JavaScript Tutorial for Beginners - Full Course",
        url: "https://youtube.com/watch?v=PkZNo7MFNFg",
        platform: "YouTube",
        channel: "freeCodeCamp",
        duration: "180:00",
        description: "3-hour complete JavaScript course for beginners",
        why: "Most popular JavaScript tutorial online. 12M+ views.",
        skillLevel: "beginner",
        topics: ["javascript", "programming", "complete_course"]
      }
    ],

    "responsive_design": [
      {
        type: "video",
        title: "Responsive Web Design - Full Course",
        url: "https://youtube.com/watch?v=srvUrASNj0s",
        platform: "YouTube",
        channel: "freeCodeCamp",
        duration: "240:00",
        description: "Learn to build websites that work on all screen sizes",
        why: "Essential skill - websites must work on mobile",
        skillLevel: "beginner",
        topics: ["responsive", "css", "mobile"]
      }
    ]
  }
};

// ============================================
// FITNESS RESOURCES
// ============================================

export const FITNESS_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Chloe Ting",
      channelId: "UCCgLoMYIyP0U56dEhEL1wXQ",
      channelUrl: "https://youtube.com/@ChloeTing",
      why: "Follow-along workouts, free programs, beginner-friendly",
      topics: ["workouts", "abs", "full_body", "no_equipment"],
      skillLevel: "beginner",
      bestFor: "Home workouts without equipment"
    },
    {
      name: "ATHLEAN-X",
      channelId: "UCe0TLA0EsQbE-MjuHXevj2A",
      channelUrl: "https://youtube.com/@athleanx",
      why: "Science-based training, injury prevention, professional advice",
      topics: ["strength", "technique", "injury_prevention", "science"],
      skillLevel: "intermediate",
      bestFor: "Understanding proper form and exercise science"
    },
    {
      name: "FitnessBlender",
      channelId: "UCiP6wD_tYlYLYh3agzbByWQ",
      channelUrl: "https://youtube.com/@FitnessBlender",
      why: "Huge library of free workouts, no nonsense approach",
      topics: ["cardio", "strength", "hiit", "full_body"],
      bestFor: "Variety of workout styles",
      skillLevel: "all" as const
    }
  ],

  playlists: [],

  articles: [
    {
      type: "article",
      title: "Starting Strength Wiki",
      url: "https://www.barbellmedicine.com/blog/",
      platform: "Barbell Medicine",
      description: "Evidence-based strength training information",
      why: "Science-backed training advice from doctors",
      skillLevel: "intermediate",
      topics: ["strength", "science", "programming"]
    }
  ],

  tools: [
    {
      type: "tool",
      title: "Workout Timer",
      url: "https://www.intervaltimer.com/",
      description: "Customizable interval timer for workouts",
      why: "Essential for HIIT and circuit training",
      topics: ["tool", "hiit"]
    }
  ],

  keyResources: {
    "bodyweight_basics": [
      {
        type: "video",
        title: "Perfect Push Up Tutorial",
        url: "https://youtube.com/watch?v=IODxDxX7oi4",
        platform: "YouTube",
        channel: "ATHLEAN-X",
        duration: "6:32",
        description: "How to do push-ups with perfect form",
        why: "Push-ups are fundamental. Learn proper form to avoid injury.",
        skillLevel: "beginner",
        topics: ["push_ups", "form", "chest"]
      }
    ],

    "home_workout": [
      {
        type: "video",
        title: "20 Min Full Body Workout (No Equipment)",
        url: "https://youtube.com/watch?v=ml6cT4AZdqI",
        platform: "YouTube",
        channel: "Chloe Ting",
        duration: "20:00",
        description: "Follow-along full body workout at home",
        why: "Great starting workout, no equipment needed",
        skillLevel: "beginner",
        topics: ["full_body", "no_equipment", "follow_along"]
      }
    ]
  }
};

// ============================================
// EXAM PREP RESOURCES (UPSC/Competitive)
// ============================================

export const EXAM_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Unacademy",
      channelId: "UCSJNMQiFSKURt3VTbJkmkuw",
      channelUrl: "https://youtube.com/@Unacademy",
      why: "Free courses by top educators for various competitive exams",
      topics: ["upsc", "current_affairs", "subjects"],
      bestFor: "Structured subject-wise learning",
      skillLevel: "all" as const
    },
    {
      name: "Study IQ Education",
      channelId: "UCIv9LWXsMPbxB4fE5EIlpFw",
      channelUrl: "https://youtube.com/@StudyIQeducation",
      why: "Daily current affairs, subject analysis",
      topics: ["current_affairs", "gk", "upsc"],
      bestFor: "Daily current affairs updates",
      skillLevel: "all" as const
    }
  ],

  playlists: [],

  articles: [
    {
      type: "article",
      title: "UPSC Syllabus Complete Guide",
      url: "https://byjus.com/ias/upsc-syllabus/",
      platform: "BYJU's",
      description: "Complete UPSC syllabus breakdown",
      why: "Know exactly what to study",
      topics: ["syllabus", "upsc"]
    }
  ],

  tools: [
    {
      type: "tool",
      title: "PIB Daily News Analysis",
      url: "https://pib.gov.in/",
      description: "Official government press releases",
      why: "Primary source for current affairs",
      topics: ["current_affairs", "upsc"]
    }
  ],

  keyResources: {}
};

// ============================================
// MASTER RESOURCE MAP
// ============================================

export const RESOURCE_LIBRARY: Record<string, GoalResources> = {
  'guitar': GUITAR_RESOURCES,
  'music': GUITAR_RESOURCES, // Alias
  'boxing': BOXING_RESOURCES,
  'martial_arts': BOXING_RESOURCES, // Similar resources
  'coding': CODING_RESOURCES,
  'web_development': CODING_RESOURCES,
  'programming': CODING_RESOURCES,
  'fitness': FITNESS_RESOURCES,
  'workout': FITNESS_RESOURCES,
  'exercise': FITNESS_RESOURCES,
  'exam': EXAM_RESOURCES,
  'upsc': EXAM_RESOURCES,
  'study': EXAM_RESOURCES
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all resources for a category
 */
export function getResourcesForCategory(category: string): GoalResources | null {
  const normalizedCategory = category.toLowerCase().replace(/\s+/g, '_');
  return RESOURCE_LIBRARY[normalizedCategory] || null;
}

/**
 * Get recommended channel for a category and skill level
 */
export function getRecommendedChannel(
  category: string,
  skillLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): CuratedChannel | null {
  const resources = getResourcesForCategory(category);
  if (!resources) return null;

  // Find channel matching skill level
  const channel = resources.channels.find(
    ch => ch.skillLevel === skillLevel || ch.skillLevel === 'all'
  );

  return channel || resources.channels[0];
}

/**
 * Search for resources by topic keywords
 */
export function searchResourcesByTopic(
  category: string,
  topics: string[]
): ResourceLink[] {
  const resources = getResourcesForCategory(category);
  if (!resources) return [];

  const allResources: ResourceLink[] = [];

  // Search in key resources
  Object.values(resources.keyResources).forEach(resourceArray => {
    resourceArray.forEach(resource => {
      if (resource.topics && topics.some(topic =>
        resource.topics!.includes(topic.toLowerCase())
      )) {
        allResources.push(resource);
      }
    });
  });

  return allResources;
}
