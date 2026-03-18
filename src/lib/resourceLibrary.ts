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
// MEDITATION / MINDFULNESS RESOURCES
// ============================================

export const MEDITATION_RESOURCES: GoalResources = {
  channels: [
    {
      name: "The Honest Guys",
      channelId: "UCnS2y0HTSY7qdJ1L2K_IE1A",
      channelUrl: "https://youtube.com/@TheHonestGuys",
      why: "High-quality guided meditations for all levels",
      topics: ["guided", "sleep", "relaxation", "visualization"],
      skillLevel: "beginner",
      bestFor: "Daily guided meditation"
    },
    {
      name: "Headspace",
      channelId: "UC3JhfsgFPLSLNEROQCdj-GQ",
      channelUrl: "https://youtube.com/@Headspace",
      why: "Animated explainers + mini sessions, very accessible",
      topics: ["mindfulness", "basics", "stress", "focus"],
      skillLevel: "beginner",
      bestFor: "Understanding meditation concepts"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "How to Meditate — Mindful.org",
      url: "https://www.mindful.org/how-to-meditate/",
      platform: "Mindful.org",
      description: "Step-by-step guide to starting a meditation practice",
      why: "Clearest beginner guide, no fluff",
      skillLevel: "beginner",
      topics: ["basics", "getting_started"]
    }
  ],
  tools: [
    {
      type: "tool",
      title: "Insight Timer",
      url: "https://insighttimer.com/",
      description: "Free meditation timer and guided sessions",
      why: "Largest free meditation library",
      topics: ["timer", "guided"]
    }
  ],
  keyResources: {
    "breathing": [
      {
        type: "video",
        title: "Box Breathing Technique (Navy SEALs)",
        url: "https://youtube.com/watch?v=tEmt1Znux58",
        platform: "YouTube",
        channel: "The Honest Guys",
        duration: "5:00",
        description: "Simple 4-4-4-4 box breathing exercise",
        why: "Best entry point — immediate stress relief, no experience needed",
        skillLevel: "beginner",
        topics: ["breathing", "stress", "beginner"]
      }
    ]
  }
};

// ============================================
// LANGUAGE LEARNING RESOURCES
// ============================================

export const LANGUAGE_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Langfocus",
      channelId: "UCNhX3WQEkraW3VHPyup8jkQ",
      channelUrl: "https://youtube.com/@Langfocus",
      why: "Deep dives into how languages work — grammar, history, comparison",
      topics: ["linguistics", "grammar", "comparison"],
      skillLevel: "all" as const,
      bestFor: "Understanding language structure"
    },
    {
      name: "SpanishPod101",
      channelId: "UCjQjPdcMsc3p-K7x-9uuVGg",
      channelUrl: "https://youtube.com/@SpanishPod101",
      why: "Structured lessons from absolute beginner to advanced",
      topics: ["spanish", "vocabulary", "grammar", "conversation"],
      skillLevel: "beginner",
      bestFor: "Learning Spanish systematically"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Fluent Forever Method",
      url: "https://fluent-forever.com/method/",
      platform: "Fluent Forever",
      description: "Science-based approach to language learning using spaced repetition",
      why: "Most efficient method backed by memory science",
      skillLevel: "beginner",
      topics: ["method", "spaced_repetition", "memory"]
    }
  ],
  tools: [
    {
      type: "interactive",
      title: "Anki Flashcards",
      url: "https://apps.ankiweb.net/",
      description: "Spaced repetition flashcard app",
      why: "Gold standard for vocabulary memorization",
      topics: ["vocabulary", "spaced_repetition", "tool"]
    }
  ],
  keyResources: {
    "basics": [
      {
        type: "video",
        title: "How to Learn Any Language in 6 Months",
        url: "https://youtube.com/watch?v=d0yGdNEWdn0",
        platform: "YouTube",
        channel: "TEDx Talks",
        duration: "10:22",
        description: "Chris Lonsdale's 5 principles and 7 actions for rapid language acquisition",
        why: "Shifts your mindset about language learning before you start",
        skillLevel: "beginner",
        topics: ["method", "motivation", "principles"]
      }
    ]
  }
};

// ============================================
// DRAWING / ART RESOURCES
// ============================================

export const DRAWING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Proko",
      channelId: "UClM2LuQ1q5WEc23462tQzBg",
      channelUrl: "https://youtube.com/@Proko",
      why: "Professional art instruction — anatomy, figure drawing, fundamentals",
      topics: ["anatomy", "figure_drawing", "fundamentals", "portrait"],
      skillLevel: "all" as const,
      bestFor: "Structured art education"
    },
    {
      name: "Draw with Jazza",
      channelId: "UCHu2KNu6TtJ0p4hpSW7Yew",
      channelUrl: "https://youtube.com/@Jazza",
      why: "Fun, energetic art tutorials for all skill levels",
      topics: ["drawing", "digital_art", "challenges", "techniques"],
      skillLevel: "beginner",
      bestFor: "Making art fun and approachable"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Drawabox — Free Art Fundamentals",
      url: "https://drawabox.com/",
      platform: "Drawabox",
      description: "Structured drawing course focusing on spatial reasoning and mark-making",
      why: "Most rigorous free drawing course online",
      skillLevel: "beginner",
      topics: ["fundamentals", "exercises", "structured"]
    }
  ],
  tools: [
    {
      type: "interactive",
      title: "QuickPoses — Timed Figure Drawing",
      url: "https://quickposes.com/en/gestures/timed",
      description: "Timed figure drawing practice with reference images",
      why: "Essential daily practice for figure drawing skills",
      topics: ["figure_drawing", "practice", "gesture"]
    }
  ],
  keyResources: {
    "fundamentals": [
      {
        type: "video",
        title: "How to Draw — Basics for Beginners",
        url: "https://youtube.com/watch?v=ewMksAbgZBo",
        platform: "YouTube",
        channel: "Proko",
        duration: "10:52",
        description: "Foundation skills: lines, shapes, form, and proportion",
        why: "Builds the mental framework for seeing like an artist",
        skillLevel: "beginner",
        topics: ["basics", "lines", "shapes"]
      }
    ]
  }
};

// ============================================
// PHOTOGRAPHY RESOURCES
// ============================================

export const PHOTOGRAPHY_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Peter McKinnon",
      channelId: "UC3DkFux8Iv-aYnTRWzwaiBA",
      channelUrl: "https://youtube.com/@PeterMcKinnon",
      why: "Cinematic photo/video tutorials, great for creative inspiration",
      topics: ["composition", "editing", "cinematic", "creative"],
      skillLevel: "intermediate",
      bestFor: "Creative photography and editing"
    },
    {
      name: "Tony & Chelsea Northrup",
      channelId: "UCDkJEEIifDzR_2K2p9tnwYQ",
      channelUrl: "https://youtube.com/@TonyAndChelsea",
      why: "Gear reviews + technique, great for beginners",
      topics: ["gear", "technique", "portrait", "landscape"],
      skillLevel: "beginner",
      bestFor: "Understanding camera settings and gear"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Photography Life — Basics of Photography",
      url: "https://photographylife.com/what-is-photography",
      platform: "Photography Life",
      description: "Comprehensive beginner guide to exposure triangle and composition",
      why: "Clearest explanation of exposure fundamentals",
      skillLevel: "beginner",
      topics: ["exposure", "composition", "basics"]
    }
  ],
  tools: [
    {
      type: "interactive",
      title: "Camera Simulator",
      url: "https://camerasim.com/camerasim-free-web-app/",
      description: "Interactive camera simulator to practice exposure settings",
      why: "Practice aperture, shutter speed, ISO without a camera",
      topics: ["exposure", "practice", "simulator"]
    }
  ],
  keyResources: {
    "exposure": [
      {
        type: "video",
        title: "Exposure Triangle Explained",
        url: "https://youtube.com/watch?v=V7z7BAZdt2M",
        platform: "YouTube",
        channel: "Tony & Chelsea Northrup",
        duration: "12:47",
        description: "How aperture, shutter speed, and ISO work together",
        why: "Understanding exposure is the #1 skill in photography",
        skillLevel: "beginner",
        topics: ["exposure", "aperture", "shutter_speed", "iso"]
      }
    ]
  }
};

// ============================================
// COOKING RESOURCES
// ============================================

export const COOKING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Joshua Weissman",
      channelId: "UChBEbMKI1eCcejTtmI32UEw",
      channelUrl: "https://youtube.com/@JoshuaWeissman",
      why: "Teaches technique behind the recipe, entertaining style",
      topics: ["technique", "recipes", "basics", "baking"],
      skillLevel: "beginner",
      bestFor: "Learning WHY recipes work"
    },
    {
      name: "Basics with Babish",
      channelId: "UCJHA_jMfCvEnv-3kRjTCQXw",
      channelUrl: "https://youtube.com/@BabishCulinaryUniverse",
      why: "Clear fundamentals series covering essential cooking skills",
      topics: ["basics", "technique", "recipes"],
      skillLevel: "beginner",
      bestFor: "Foundational cooking skills"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Serious Eats — The Food Lab",
      url: "https://www.seriouseats.com/the-food-lab-5117916",
      platform: "Serious Eats",
      description: "Science-based approach to cooking techniques",
      why: "Explains the science behind every technique",
      skillLevel: "intermediate",
      topics: ["science", "technique"]
    }
  ],
  tools: [
    {
      type: "tool",
      title: "MyFridgeFood — Recipe Finder",
      url: "https://myfridgefood.com/",
      description: "Find recipes based on ingredients you already have",
      why: "Great for practicing with what you have",
      topics: ["recipes", "planning"]
    }
  ],
  keyResources: {
    "knife_skills": [
      {
        type: "video",
        title: "Knife Skills 101",
        url: "https://youtube.com/watch?v=JMA2SqaDgG8",
        platform: "YouTube",
        channel: "Joshua Weissman",
        duration: "13:22",
        description: "Essential knife techniques every cook needs",
        why: "Knife skills are the foundation of efficient cooking",
        skillLevel: "beginner",
        topics: ["knife_skills", "technique", "safety"]
      }
    ]
  }
};

// ============================================
// WRITING RESOURCES
// ============================================

export const WRITING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Brandon Sanderson",
      channelId: "UC3g-w83Cb5pEAu5UmRrge-A",
      channelUrl: "https://youtube.com/@BrandSanderson",
      why: "Full university creative writing lectures, free on YouTube",
      topics: ["fiction", "worldbuilding", "plotting", "craft"],
      skillLevel: "all" as const,
      bestFor: "Serious fiction writers"
    },
    {
      name: "Alexa Donne",
      channelId: "UCmN7Nj3mawOyGh4XGLwfCfA",
      channelUrl: "https://youtube.com/@AlexaDonne",
      why: "Practical advice on writing process, publishing, and craft",
      topics: ["writing_process", "publishing", "craft"],
      skillLevel: "beginner",
      bestFor: "New writers learning the ropes"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "The Snowflake Method for Novel Writing",
      url: "https://www.advancedfictionwriting.com/articles/snowflake-method/",
      platform: "Advanced Fiction Writing",
      description: "Step-by-step method to design a novel before writing it",
      why: "Prevents writer's block by giving structure to the creative process",
      skillLevel: "beginner",
      topics: ["plotting", "method", "novel"]
    }
  ],
  tools: [
    {
      type: "tool",
      title: "Hemingway Editor",
      url: "https://hemingwayapp.com/",
      description: "Highlights complex sentences and common errors",
      why: "Instantly improves readability of your writing",
      topics: ["editing", "readability"]
    }
  ],
  keyResources: {
    "getting_started": [
      {
        type: "video",
        title: "Brandon Sanderson — Lecture 1: Introduction to Writing",
        url: "https://youtube.com/watch?v=0cf-qdZ7GbA",
        platform: "YouTube",
        channel: "Brandon Sanderson",
        duration: "55:00",
        description: "First lecture of Sanderson's BYU creative writing course",
        why: "World-class writing instruction, completely free",
        skillLevel: "beginner",
        topics: ["fiction", "craft", "introduction"]
      }
    ]
  }
};

// ============================================
// PUBLIC SPEAKING RESOURCES
// ============================================

export const SPEAKING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Vinh Giang",
      channelId: "UCj1BFYKeH-U8x_5_F1EaESQ",
      channelUrl: "https://youtube.com/@VinhGiang",
      why: "Combines magic with communication — unique, memorable lessons",
      topics: ["delivery", "presence", "storytelling", "voice"],
      skillLevel: "all" as const,
      bestFor: "Improving stage presence and delivery"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Toastmasters — Beginner's Guide",
      url: "https://www.toastmasters.org/resources/public-speaking-tips",
      platform: "Toastmasters",
      description: "Practical tips from the world's largest public speaking organization",
      why: "Battle-tested advice from millions of speakers",
      skillLevel: "beginner",
      topics: ["basics", "tips", "confidence"]
    }
  ],
  tools: [],
  keyResources: {
    "overcoming_fear": [
      {
        type: "video",
        title: "How to Speak So That People Want to Listen",
        url: "https://youtube.com/watch?v=eIho2S0ZahI",
        platform: "YouTube",
        channel: "TED",
        duration: "9:58",
        description: "Julian Treasure's framework for powerful speaking",
        why: "Most-watched TED talk on speaking — practical framework you can apply immediately",
        skillLevel: "beginner",
        topics: ["voice", "delivery", "confidence"]
      }
    ]
  }
};

// ============================================
// FINANCIAL / INVESTING RESOURCES
// ============================================

export const INVESTING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "The Plain Bagel",
      channelId: "UCFCEuCsyWP0YkP3CZ3Mr01Q",
      channelUrl: "https://youtube.com/@ThePlainBagel",
      why: "CFA charterholder explains investing concepts clearly, no hype",
      topics: ["investing", "stocks", "etf", "fundamentals"],
      skillLevel: "beginner",
      bestFor: "Understanding investing without the hype"
    },
    {
      name: "Two Cents (PBS)",
      channelId: "UCL8w_A8p8P1HWI3k6PR5Z6w",
      channelUrl: "https://youtube.com/@TwoCentsPBS",
      why: "Animated personal finance education, PBS-quality",
      topics: ["budgeting", "saving", "debt", "retirement"],
      skillLevel: "beginner",
      bestFor: "Personal finance fundamentals"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Investopedia — Investing for Beginners",
      url: "https://www.investopedia.com/articles/basics/06/invest1000.asp",
      platform: "Investopedia",
      description: "How to start investing with $1000 or less",
      why: "Practical starting point, not theoretical",
      skillLevel: "beginner",
      topics: ["getting_started", "basics"]
    }
  ],
  tools: [
    {
      type: "tool",
      title: "Portfolio Visualizer",
      url: "https://www.portfoliovisualizer.com/",
      description: "Backtest asset allocation strategies",
      why: "See how different portfolios would have performed historically",
      topics: ["portfolio", "analysis", "backtest"]
    }
  ],
  keyResources: {
    "basics": [
      {
        type: "video",
        title: "Investing for Beginners — How the Stock Market Works",
        url: "https://youtube.com/watch?v=p7HKvqRI_Bo",
        platform: "YouTube",
        channel: "The Plain Bagel",
        duration: "14:32",
        description: "Clear explanation of stocks, bonds, ETFs, and how markets work",
        why: "Must-watch before investing a single dollar",
        skillLevel: "beginner",
        topics: ["stocks", "bonds", "etf", "markets"]
      }
    ]
  }
};

// ============================================
// RUNNING / MARATHON RESOURCES
// ============================================

export const RUNNING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Global Triathlon Network",
      channelId: "UC8ywDnCMsm5ECBTiH_HFTuw",
      channelUrl: "https://youtube.com/@gabormagda",
      why: "Professional running technique and training plans",
      topics: ["technique", "training", "marathon", "5k"],
      skillLevel: "all" as const,
      bestFor: "Improving running form and building training plans"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Couch to 5K — NHS Guide",
      url: "https://www.nhs.uk/live-well/exercise/running-and-aerobic-exercises/get-running-with-couch-to-5k/",
      platform: "NHS UK",
      description: "9-week plan to go from zero to running 5K",
      why: "Medically vetted, progressive, proven program",
      skillLevel: "beginner",
      topics: ["5k", "beginner_plan", "progressive"]
    }
  ],
  tools: [
    {
      type: "tool",
      title: "Strava",
      url: "https://www.strava.com/",
      description: "GPS run tracking with community features",
      why: "Track progress and join a running community",
      topics: ["tracking", "community"]
    }
  ],
  keyResources: {
    "beginner_running": [
      {
        type: "video",
        title: "Running Form for Beginners — 5 Tips",
        url: "https://youtube.com/watch?v=brFHyOtTwH4",
        platform: "YouTube",
        channel: "The Run Experience",
        duration: "7:42",
        description: "Essential form cues to run efficiently and prevent injury",
        why: "Bad form causes injury — fix it before building mileage",
        skillLevel: "beginner",
        topics: ["form", "technique", "injury_prevention"]
      }
    ]
  }
};

// ============================================
// YOGA RESOURCES
// ============================================

export const YOGA_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Yoga With Adriene",
      channelId: "UCFKE7WVJfvaHW5q283SxchA",
      channelUrl: "https://youtube.com/@yogawithadriene",
      why: "Most popular yoga channel, incredibly welcoming for beginners",
      topics: ["vinyasa", "beginner", "flexibility", "mindfulness"],
      skillLevel: "beginner",
      bestFor: "Starting yoga at home"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Yoga Journal — Poses for Beginners",
      url: "https://www.yogajournal.com/poses/yoga-by-benefit/yoga-for-beginners/",
      platform: "Yoga Journal",
      description: "Illustrated guide to foundational yoga poses",
      why: "Reference for correct alignment in every pose",
      skillLevel: "beginner",
      topics: ["poses", "alignment", "reference"]
    }
  ],
  tools: [],
  keyResources: {
    "beginner_flow": [
      {
        type: "video",
        title: "Yoga for Complete Beginners — 20 Minute Home Yoga",
        url: "https://youtube.com/watch?v=v7AYKMP6rOE",
        platform: "YouTube",
        channel: "Yoga With Adriene",
        duration: "23:06",
        description: "Gentle introduction to yoga — no experience needed",
        why: "Perfect first yoga session, zero intimidation",
        skillLevel: "beginner",
        topics: ["beginner", "full_body", "gentle"]
      }
    ]
  }
};

// ============================================
// READING / BOOK HABIT RESOURCES
// ============================================

export const READING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Better Than Yesterday",
      channelId: "UCxBVLfaKmOc3mJrBfHsPelg",
      channelUrl: "https://youtube.com/@BetterThanYesterday",
      why: "Animated book summaries and self-improvement concepts",
      topics: ["book_summaries", "habits", "productivity"],
      skillLevel: "beginner",
      bestFor: "Getting motivated to read more"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "How to Read More Books — James Clear",
      url: "https://jamesclear.com/read-more",
      platform: "JamesClear.com",
      description: "Practical strategies for building a reading habit",
      why: "From the author of Atomic Habits — proven habit-building advice",
      skillLevel: "beginner",
      topics: ["habit", "strategy", "motivation"]
    }
  ],
  tools: [
    {
      type: "tool",
      title: "Goodreads",
      url: "https://www.goodreads.com/",
      description: "Track books, get recommendations, set reading goals",
      why: "Social accountability for your reading goals",
      topics: ["tracking", "recommendations", "community"]
    }
  ],
  keyResources: {}
};

// ============================================
// CHESS RESOURCES
// ============================================

export const CHESS_RESOURCES: GoalResources = {
  channels: [
    {
      name: "GothamChess",
      channelId: "UCQHX6ViZmPsWiYSFAyS0a3Q",
      channelUrl: "https://youtube.com/@GothamChess",
      why: "Entertaining and educational, covers openings to endgames",
      topics: ["openings", "tactics", "analysis", "puzzles"],
      skillLevel: "beginner",
      bestFor: "Learning chess in an engaging way"
    },
    {
      name: "Daniel Naroditsky",
      channelId: "UCHP9CdeguNUI-_nBv_UXBhw",
      channelUrl: "https://youtube.com/@DanielNaroditsky",
      why: "GM-level speedrun series teaches thinking process at every level",
      topics: ["thinking_process", "improvement", "analysis"],
      skillLevel: "intermediate",
      bestFor: "Understanding how strong players think"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Lichess Learn — Chess Basics",
      url: "https://lichess.org/learn",
      platform: "Lichess",
      description: "Interactive chess tutorial from piece movement to basic tactics",
      why: "Learn by doing — interactive puzzles, completely free",
      skillLevel: "beginner",
      topics: ["basics", "interactive", "tactics"]
    }
  ],
  tools: [
    {
      type: "interactive",
      title: "Lichess — Free Chess Server",
      url: "https://lichess.org/",
      description: "100% free, open-source chess platform with puzzles and analysis",
      why: "Best free chess platform — no ads, no paywalls",
      topics: ["play", "puzzles", "analysis"]
    }
  ],
  keyResources: {
    "openings": [
      {
        type: "video",
        title: "Chess Openings for Beginners — The 4 Best",
        url: "https://youtube.com/watch?v=3yEclPh9gBI",
        platform: "YouTube",
        channel: "GothamChess",
        duration: "18:46",
        description: "Simple, effective openings for beginners",
        why: "Don't memorize 20 openings — learn 4 reliable ones",
        skillLevel: "beginner",
        topics: ["openings", "strategy"]
      }
    ]
  }
};

// ============================================
// PIANO RESOURCES
// ============================================

export const PIANO_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Pianote",
      channelId: "UC8OaG4Yi1mKVmU6BkDBIhdQ",
      channelUrl: "https://youtube.com/@Pianote",
      why: "Structured piano lessons with great production quality",
      topics: ["technique", "theory", "songs", "practice"],
      skillLevel: "beginner",
      bestFor: "Learning piano systematically"
    },
    {
      name: "Piano Genius",
      channelId: "UCWKJ8_aI89e-2sEXxbXWQSQ",
      channelUrl: "https://youtube.com/@PianoGenius",
      why: "Song tutorials with sheet music overlay",
      topics: ["songs", "classical", "pop"],
      skillLevel: "intermediate",
      bestFor: "Learning specific songs"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Piano Fundamentals — musictheory.net",
      url: "https://www.musictheory.net/lessons",
      platform: "musictheory.net",
      description: "Interactive music theory lessons from basics to advanced",
      why: "Understanding theory makes piano 10x easier",
      skillLevel: "beginner",
      topics: ["theory", "notes", "scales", "chords"]
    }
  ],
  tools: [
    {
      type: "interactive",
      title: "Synthesia — Piano Learning App",
      url: "https://www.synthesiagame.com/",
      description: "Guitar Hero-style piano learning with MIDI",
      why: "Makes practice feel like a game",
      topics: ["practice", "songs", "midi"]
    }
  ],
  keyResources: {
    "beginner_piano": [
      {
        type: "video",
        title: "How to Play Piano — Lesson 1 (Beginner)",
        url: "https://youtube.com/watch?v=827jmswqnEA",
        platform: "YouTube",
        channel: "Pianote",
        duration: "11:44",
        description: "First piano lesson — posture, finger placement, first notes",
        why: "Start here. Proper technique from day one prevents bad habits.",
        skillLevel: "beginner",
        topics: ["basics", "posture", "first_notes"]
      }
    ]
  }
};

// ============================================
// DANCE RESOURCES
// ============================================

export const DANCE_RESOURCES: GoalResources = {
  channels: [
    {
      name: "STEEZY Studio",
      channelId: "UCczOQSxSX1X6PFT6xEaZY4w",
      channelUrl: "https://youtube.com/@STEEZY",
      why: "Professional dance tutorials broken into clear steps",
      topics: ["hip_hop", "choreography", "fundamentals", "grooves"],
      skillLevel: "beginner",
      bestFor: "Learning popular dance styles"
    }
  ],
  playlists: [],
  articles: [],
  tools: [],
  keyResources: {
    "beginner_moves": [
      {
        type: "video",
        title: "How to Dance — Basic Grooves for Beginners",
        url: "https://youtube.com/watch?v=cZF_q8QQsbs",
        platform: "YouTube",
        channel: "STEEZY Studio",
        duration: "8:15",
        description: "Simple grooves and body rolls to get started dancing",
        why: "Removes the 'I can't dance' barrier — everyone starts here",
        skillLevel: "beginner",
        topics: ["grooves", "basics", "rhythm"]
      }
    ]
  }
};

// ============================================
// PRODUCTIVITY / TIME MANAGEMENT RESOURCES
// ============================================

export const PRODUCTIVITY_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Ali Abdaal",
      channelId: "UCoOae5nYA7VqaXzerajD0lg",
      channelUrl: "https://youtube.com/@aliabdaal",
      why: "Evidence-based productivity advice, relatable style",
      topics: ["productivity", "studying", "habits", "tools"],
      skillLevel: "beginner",
      bestFor: "Building a productive system"
    },
    {
      name: "Thomas Frank",
      channelId: "UCG-KntY7aVnIGXYEBQvmBAQ",
      channelUrl: "https://youtube.com/@ThomasFrank",
      why: "Practical study and productivity techniques",
      topics: ["studying", "note_taking", "systems", "tools"],
      skillLevel: "beginner",
      bestFor: "Students and knowledge workers"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "GTD in 15 Minutes — Getting Things Done Summary",
      url: "https://hamberg.no/gtd",
      platform: "Hamberg.no",
      description: "Quick summary of David Allen's Getting Things Done methodology",
      why: "Most influential productivity system, explained concisely",
      skillLevel: "beginner",
      topics: ["gtd", "system", "methodology"]
    }
  ],
  tools: [
    {
      type: "tool",
      title: "Todoist",
      url: "https://todoist.com/",
      description: "Task management app with natural language input",
      why: "Simple but powerful — captures tasks fast",
      topics: ["tasks", "planning"]
    }
  ],
  keyResources: {
    "time_management": [
      {
        type: "video",
        title: "How I Manage My Time — 10 Productivity Tips",
        url: "https://youtube.com/watch?v=iONDebHX9qk",
        platform: "YouTube",
        channel: "Ali Abdaal",
        duration: "15:53",
        description: "Practical time management strategies from a doctor-turned-creator",
        why: "Actionable tips you can implement today",
        skillLevel: "beginner",
        topics: ["time_management", "systems", "habits"]
      }
    ]
  }
};

// ============================================
// SWIMMING RESOURCES
// ============================================

export const SWIMMING_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Effortless Swimming",
      channelId: "UCJ8wASH-xtd5_U-oHgLjL4w",
      channelUrl: "https://youtube.com/@EffortlessSwimming",
      why: "Technique-focused coaching for all levels",
      topics: ["technique", "freestyle", "drills", "open_water"],
      skillLevel: "all" as const,
      bestFor: "Improving swimming technique"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Total Immersion — Effortless Swimming",
      url: "https://www.totalimmersion.net/",
      platform: "Total Immersion",
      description: "Technique-first approach to swimming efficiently",
      why: "Revolutionary method that makes swimming feel easy",
      skillLevel: "beginner",
      topics: ["technique", "method", "efficiency"]
    }
  ],
  tools: [],
  keyResources: {
    "freestyle": [
      {
        type: "video",
        title: "How to Swim Freestyle — Complete Guide",
        url: "https://youtube.com/watch?v=sYZ2hMhUiSs",
        platform: "YouTube",
        channel: "Effortless Swimming",
        duration: "12:30",
        description: "Full freestyle technique breakdown — body position, breathing, pull",
        why: "Freestyle is the most useful stroke — learn it properly first",
        skillLevel: "beginner",
        topics: ["freestyle", "technique", "breathing"]
      }
    ]
  }
};

// ============================================
// WEIGHT LOSS / NUTRITION RESOURCES
// ============================================

export const NUTRITION_RESOURCES: GoalResources = {
  channels: [
    {
      name: "Jeff Nippard",
      channelId: "UC68TLK0mAEzUyHx5x5k-S1Q",
      channelUrl: "https://youtube.com/@JeffNippard",
      why: "Science-based nutrition and training, references studies",
      topics: ["nutrition", "calories", "macros", "weight_loss"],
      skillLevel: "intermediate",
      bestFor: "Evidence-based approach to nutrition"
    }
  ],
  playlists: [],
  articles: [
    {
      type: "article",
      title: "Examine.com — Nutrition Research",
      url: "https://examine.com/",
      platform: "Examine",
      description: "Independent analysis of nutrition and supplement research",
      why: "Unbiased, science-only nutrition information",
      skillLevel: "intermediate",
      topics: ["research", "supplements", "evidence"]
    }
  ],
  tools: [
    {
      type: "tool",
      title: "Cronometer — Calorie Tracker",
      url: "https://cronometer.com/",
      description: "Detailed nutrition tracking with micronutrients",
      why: "Most accurate food tracker available",
      topics: ["tracking", "calories", "macros"]
    }
  ],
  keyResources: {
    "calorie_basics": [
      {
        type: "video",
        title: "Calories Explained — How to Count Them",
        url: "https://youtube.com/watch?v=CxktmQ3zJOA",
        platform: "YouTube",
        channel: "Jeff Nippard",
        duration: "10:17",
        description: "How calories work, TDEE calculation, and practical tracking tips",
        why: "Understand energy balance before any diet",
        skillLevel: "beginner",
        topics: ["calories", "tdee", "tracking"]
      }
    ]
  }
};

// ============================================
// MASTER RESOURCE MAP
// ============================================

export const RESOURCE_LIBRARY: Record<string, GoalResources> = {
  // Original 5 categories
  'guitar': GUITAR_RESOURCES,
  'music': GUITAR_RESOURCES,
  'boxing': BOXING_RESOURCES,
  'martial_arts': BOXING_RESOURCES,
  'coding': CODING_RESOURCES,
  'web_development': CODING_RESOURCES,
  'programming': CODING_RESOURCES,
  'fitness': FITNESS_RESOURCES,
  'workout': FITNESS_RESOURCES,
  'exercise': FITNESS_RESOURCES,
  'exam': EXAM_RESOURCES,
  'upsc': EXAM_RESOURCES,
  'study': EXAM_RESOURCES,
  // New 15 categories
  'meditation': MEDITATION_RESOURCES,
  'mindfulness': MEDITATION_RESOURCES,
  'language': LANGUAGE_RESOURCES,
  'language_learning': LANGUAGE_RESOURCES,
  'spanish': LANGUAGE_RESOURCES,
  'french': LANGUAGE_RESOURCES,
  'drawing': DRAWING_RESOURCES,
  'art': DRAWING_RESOURCES,
  'painting': DRAWING_RESOURCES,
  'photography': PHOTOGRAPHY_RESOURCES,
  'cooking': COOKING_RESOURCES,
  'baking': COOKING_RESOURCES,
  'writing': WRITING_RESOURCES,
  'novel': WRITING_RESOURCES,
  'journaling': WRITING_RESOURCES,
  'public_speaking': SPEAKING_RESOURCES,
  'speaking': SPEAKING_RESOURCES,
  'presentation': SPEAKING_RESOURCES,
  'investing': INVESTING_RESOURCES,
  'finance': INVESTING_RESOURCES,
  'budgeting': INVESTING_RESOURCES,
  'stocks': INVESTING_RESOURCES,
  'running': RUNNING_RESOURCES,
  'marathon': RUNNING_RESOURCES,
  'jogging': RUNNING_RESOURCES,
  'yoga': YOGA_RESOURCES,
  'stretching': YOGA_RESOURCES,
  'reading': READING_RESOURCES,
  'books': READING_RESOURCES,
  'chess': CHESS_RESOURCES,
  'piano': PIANO_RESOURCES,
  'keyboard': PIANO_RESOURCES,
  'dance': DANCE_RESOURCES,
  'dancing': DANCE_RESOURCES,
  'productivity': PRODUCTIVITY_RESOURCES,
  'time_management': PRODUCTIVITY_RESOURCES,
  'habits': PRODUCTIVITY_RESOURCES,
  'swimming': SWIMMING_RESOURCES,
  'swim': SWIMMING_RESOURCES,
  'nutrition': NUTRITION_RESOURCES,
  'weight_loss': NUTRITION_RESOURCES,
  'diet': NUTRITION_RESOURCES,
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
 * Maps goal text keywords to resource library keys.
 * Used when the agent category (e.g. "Kinesthetic") doesn't match a library key directly.
 */
const GOAL_KEYWORD_TO_LIBRARY_KEY: Record<string, string[]> = {
  // Physical / combat
  boxing:    ['boxing'],
  fight:     ['boxing', 'martial_arts'],
  punch:     ['boxing'],
  sparring:  ['boxing'],
  mma:       ['boxing', 'martial_arts'],
  kickbox:   ['boxing'],
  muay:      ['boxing'],
  // Music
  guitar:    ['guitar'],
  ukulele:   ['guitar'],
  bass:      ['guitar'],
  music:     ['music'],
  piano:     ['piano'],
  keyboard:  ['piano'],
  // Coding / tech
  code:      ['coding'],
  coding:    ['coding'],
  program:   ['programming'],
  web:       ['web_development'],
  react:     ['coding'],
  javascript:['coding'],
  python:    ['coding'],
  // Fitness / movement
  fitness:   ['fitness'],
  workout:   ['workout'],
  exercise:  ['exercise'],
  gym:       ['fitness'],
  strength:  ['fitness'],
  running:   ['running'],
  marathon:  ['running'],
  jogging:   ['running'],
  '5k':      ['running'],
  '10k':     ['running'],
  yoga:      ['yoga'],
  stretch:   ['yoga'],
  swim:      ['swimming'],
  dance:     ['dance'],
  choreograph: ['dance'],
  // Mind / wellness
  meditat:   ['meditation'],
  mindful:   ['meditation'],
  breath:    ['meditation'],
  // Language
  language:  ['language'],
  spanish:   ['language'],
  french:    ['language'],
  german:    ['language'],
  japanese:  ['language'],
  korean:    ['language'],
  chinese:   ['language'],
  mandarin:  ['language'],
  // Creative
  draw:      ['drawing'],
  sketch:    ['drawing'],
  paint:     ['drawing'],
  art:       ['drawing'],
  photo:     ['photography'],
  camera:    ['photography'],
  cook:      ['cooking'],
  recipe:    ['cooking'],
  bak:       ['cooking'],
  writ:      ['writing'],
  novel:     ['writing'],
  journal:   ['writing'],
  blog:      ['writing'],
  // Career / cognitive
  speak:     ['public_speaking'],
  present:   ['public_speaking'],
  invest:    ['investing'],
  stock:     ['investing'],
  budget:    ['investing'],
  financ:    ['investing'],
  saving:    ['investing'],
  chess:     ['chess'],
  read:      ['reading'],
  book:      ['reading'],
  productiv: ['productivity'],
  time_manag:['productivity'],
  habit:     ['productivity'],
  // Nutrition
  nutrition: ['nutrition'],
  weight_loss:['nutrition'],
  diet:      ['nutrition'],
  calorie:   ['nutrition'],
  // Exam
  upsc:      ['upsc'],
  exam:      ['exam'],
  study:     ['study'],
};

/**
 * Get curated resources by fuzzy-matching goal text against library keys.
 * Returns all matching video resources flattened from keyResources.
 */
export function getResourcesForGoal(goalTitle: string): ResourceLink[] {
  const lower = goalTitle.toLowerCase();
  const matchedKeys = new Set<string>();

  // 1. Direct keyword match from goal text
  for (const [keyword, libraryKeys] of Object.entries(GOAL_KEYWORD_TO_LIBRARY_KEY)) {
    if (lower.includes(keyword)) {
      libraryKeys.forEach(k => matchedKeys.add(k));
    }
  }

  // 2. Direct library key match (e.g. goal text contains "guitar")
  for (const key of Object.keys(RESOURCE_LIBRARY)) {
    if (lower.includes(key.replace(/_/g, ' ')) || lower.includes(key)) {
      matchedKeys.add(key);
    }
  }

  if (matchedKeys.size === 0) return [];

  // Collect all video resources from matched categories
  const resources: ResourceLink[] = [];
  for (const key of matchedKeys) {
    const goalRes = RESOURCE_LIBRARY[key];
    if (!goalRes) continue;
    for (const topicResources of Object.values(goalRes.keyResources)) {
      for (const r of topicResources) {
        if (r.type === 'video' && !resources.some(existing => existing.url === r.url)) {
          resources.push(r);
        }
      }
    }
  }

  return resources;
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

/**
 * Parse a duration string into minutes (rounded up).
 * Handles "8:42" → 9, "1:23:45" → 84, "15" → 15
 */
export function parseDuration(duration: string | undefined): number {
  if (!duration) return 10; // default fallback
  const parts = duration.split(':').map(Number);
  if (parts.some(isNaN)) return parseInt(duration) || 10;
  if (parts.length === 3) return Math.ceil(parts[0] * 60 + parts[1] + parts[2] / 60);
  if (parts.length === 2) return Math.ceil(parts[0] + parts[1] / 60);
  return parseInt(duration) || 10;
}
