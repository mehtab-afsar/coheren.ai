import type { GoalCategory } from '../types';

export interface TaskTemplate {
  title: string;
  description: string;
  type: 'practice' | 'learning' | 'reflection';
  duration: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  type: 'practice' | 'learning' | 'reflection';
  duration: number;
  completed: boolean;
  scheduledFor: string;
  day: number;
}

// Task templates for each category
// Day 1-7 tasks for MVP
const taskTemplatesByCategory: Record<GoalCategory, TaskTemplate[][]> = {
  Fitness: [
    // Day 1
    [
      { title: 'Warm-up walk', description: 'Walk briskly for 10 minutes to prepare your body', type: 'practice', duration: 10 },
      { title: 'Basic stretching routine', description: 'Follow along with a 5-minute stretching video', type: 'learning', duration: 5 },
      { title: 'Cool down & reflect', description: 'How did it feel? Any soreness?', type: 'reflection', duration: 5 }
    ],
    // Day 2
    [
      { title: 'Light cardio', description: 'Jog or fast walk for 15 minutes', type: 'practice', duration: 15 },
      { title: 'Learn proper form', description: 'Watch tutorial on basic exercises', type: 'learning', duration: 10 },
      { title: 'Track your energy', description: 'Note how you feel after exercising', type: 'reflection', duration: 5 }
    ],
    // Day 3
    [
      { title: 'Bodyweight exercises', description: '10 squats, 5 push-ups (modified okay), 10-sec plank', type: 'practice', duration: 15 },
      { title: 'Rest & recovery', description: 'Light stretching, understand rest importance', type: 'learning', duration: 10 },
      { title: 'Reflect on progress', description: 'What felt easier today?', type: 'reflection', duration: 5 }
    ],
    // Day 4
    [
      { title: 'Increase cardio', description: 'Walk/jog for 20 minutes', type: 'practice', duration: 20 },
      { title: 'Learn breathing techniques', description: 'Proper breathing during exercise', type: 'learning', duration: 5 },
      { title: 'Plan tomorrow', description: 'What will you try tomorrow?', type: 'reflection', duration: 5 }
    ],
    // Day 5
    [
      { title: 'Strength basics', description: '2 sets of: 10 squats, 8 push-ups, 15-sec plank', type: 'practice', duration: 20 },
      { title: 'Understand muscle groups', description: 'Learn what muscles you\'re working', type: 'learning', duration: 5 },
      { title: 'Body check-in', description: 'Any pain vs good soreness?', type: 'reflection', duration: 5 }
    ],
    // Day 6
    [
      { title: 'Active recovery', description: 'Gentle yoga or stretching for 15 minutes', type: 'practice', duration: 15 },
      { title: 'Nutrition basics', description: 'Quick read on pre/post workout food', type: 'learning', duration: 10 },
      { title: 'Weekly reflection', description: 'How did week 1 go? Proud moments?', type: 'reflection', duration: 5 }
    ],
    // Day 7
    [
      { title: 'Rest day activity', description: 'Light walk or complete rest', type: 'practice', duration: 10 },
      { title: 'Plan week 2', description: 'Review what worked, what to adjust', type: 'learning', duration: 10 },
      { title: 'Set weekly goal', description: 'One specific thing to improve next week', type: 'reflection', duration: 5 }
    ]
  ],

  Exam: [
    // Day 1
    [
      { title: 'Review syllabus', description: 'Understand what topics are covered', type: 'learning', duration: 30 },
      { title: 'Create study schedule', description: 'Plan your weekly study blocks', type: 'practice', duration: 20 },
      { title: 'Set up study space', description: 'Organize materials and eliminate distractions', type: 'reflection', duration: 10 }
    ],
    // Day 2
    [
      { title: 'Chapter 1 reading', description: 'Read and highlight key concepts', type: 'learning', duration: 45 },
      { title: 'Create notes', description: 'Summarize chapter in your own words', type: 'practice', duration: 30 },
      { title: 'Self-quiz', description: 'Test yourself on main points', type: 'reflection', duration: 15 }
    ],
    // Day 3
    [
      { title: 'Practice problems', description: 'Solve 10 problems from chapter 1', type: 'practice', duration: 40 },
      { title: 'Review mistakes', description: 'Understand where you went wrong', type: 'learning', duration: 20 },
      { title: 'Identify weak areas', description: 'What topics need more work?', type: 'reflection', duration: 10 }
    ],
    // Day 4
    [
      { title: 'Chapter 2 reading', description: 'Active reading with notes', type: 'learning', duration: 45 },
      { title: 'Flashcards', description: 'Create flashcards for key terms', type: 'practice', duration: 25 },
      { title: 'Connect concepts', description: 'How does this relate to chapter 1?', type: 'reflection', duration: 10 }
    ],
    // Day 5
    [
      { title: 'Mixed practice', description: 'Problems from chapters 1 & 2', type: 'practice', duration: 50 },
      { title: 'Study technique', description: 'Learn about active recall method', type: 'learning', duration: 15 },
      { title: 'Track retention', description: 'What do you remember without notes?', type: 'reflection', duration: 10 }
    ],
    // Day 6
    [
      { title: 'Review week', description: 'Quick review of all covered material', type: 'learning', duration: 40 },
      { title: 'Practice test', description: 'Attempt 20-question practice test', type: 'practice', duration: 30 },
      { title: 'Analyze results', description: 'What patterns in your mistakes?', type: 'reflection', duration: 15 }
    ],
    // Day 7
    [
      { title: 'Light review', description: 'Browse notes, no heavy studying', type: 'learning', duration: 30 },
      { title: 'Plan week 2', description: 'Which chapters/topics are next?', type: 'practice', duration: 20 },
      { title: 'Assess study habits', description: 'What\'s working? What to change?', type: 'reflection', duration: 10 }
    ]
  ],

  Hobby: [
    // Day 1
    [
      { title: 'Learn the basics', description: 'Watch a beginner tutorial', type: 'learning', duration: 15 },
      { title: 'First practice', description: 'Try the simplest exercise', type: 'practice', duration: 20 },
      { title: 'Reflect', description: 'What was fun? What was challenging?', type: 'reflection', duration: 5 }
    ],
    // Day 2
    [
      { title: 'Repeat basics', description: 'Practice yesterday\'s skill again', type: 'practice', duration: 20 },
      { title: 'Learn variation', description: 'One new technique or approach', type: 'learning', duration: 15 },
      { title: 'Compare', description: 'What improved from day 1?', type: 'reflection', duration: 5 }
    ],
    // Day 3
    [
      { title: 'Focused practice', description: 'Work on the hardest part', type: 'practice', duration: 25 },
      { title: 'Study examples', description: 'Watch expert demonstrations', type: 'learning', duration: 10 },
      { title: 'Note progress', description: 'What clicked today?', type: 'reflection', duration: 5 }
    ],
    // Day 4
    [
      { title: 'Creative exploration', description: 'Try making something simple', type: 'practice', duration: 30 },
      { title: 'Learn troubleshooting', description: 'Common mistakes and fixes', type: 'learning', duration: 10 },
      { title: 'Self-critique', description: 'What would you do differently?', type: 'reflection', duration: 5 }
    ],
    // Day 5
    [
      { title: 'Skill combination', description: 'Combine techniques you learned', type: 'practice', duration: 25 },
      { title: 'Advanced tips', description: 'Watch intermediate tutorial', type: 'learning', duration: 15 },
      { title: 'Plan project', description: 'What do you want to create?', type: 'reflection', duration: 5 }
    ],
    // Day 6
    [
      { title: 'Full practice session', description: 'Create something start to finish', type: 'practice', duration: 35 },
      { title: 'Review feedback', description: 'Look at online community critiques', type: 'learning', duration: 10 },
      { title: 'Weekly review', description: 'How much have you improved?', type: 'reflection', duration: 5 }
    ],
    // Day 7
    [
      { title: 'Light practice', description: 'Do something enjoyable, low pressure', type: 'practice', duration: 20 },
      { title: 'Inspiration', description: 'Browse work by people you admire', type: 'learning', duration: 15 },
      { title: 'Set next goal', description: 'What specific skill to master next week?', type: 'reflection', duration: 5 }
    ]
  ],

  Learning: [
    // Day 1
    [
      { title: 'Introduction lesson', description: 'Complete first lesson/chapter', type: 'learning', duration: 25 },
      { title: 'Practice exercises', description: 'Apply what you learned', type: 'practice', duration: 15 },
      { title: 'Review notes', description: 'Summarize key concepts', type: 'reflection', duration: 10 }
    ],
    // Day 2
    [
      { title: 'Lesson 2', description: 'New material with examples', type: 'learning', duration: 30 },
      { title: 'Hands-on practice', description: 'Complete exercises', type: 'practice', duration: 20 },
      { title: 'Connect dots', description: 'How does this build on lesson 1?', type: 'reflection', duration: 5 }
    ],
    // Day 3
    [
      { title: 'Review lessons 1-2', description: 'Quick recap before moving forward', type: 'learning', duration: 15 },
      { title: 'Mixed practice', description: 'Problems from both lessons', type: 'practice', duration: 30 },
      { title: 'Self-assessment', description: 'What needs more practice?', type: 'reflection', duration: 5 }
    ],
    // Day 4
    [
      { title: 'Lesson 3', description: 'New concepts and vocabulary', type: 'learning', duration: 30 },
      { title: 'Active use', description: 'Create sentences/solve problems', type: 'practice', duration: 25 },
      { title: 'Test recall', description: 'Try without looking at notes', type: 'reflection', duration: 5 }
    ],
    // Day 5
    [
      { title: 'Cumulative review', description: 'All lessons so far', type: 'learning', duration: 20 },
      { title: 'Application project', description: 'Small project using all skills', type: 'practice', duration: 35 },
      { title: 'Difficulty check', description: 'What still feels hard?', type: 'reflection', duration: 5 }
    ],
    // Day 6
    [
      { title: 'Lesson 4', description: 'Expanding knowledge', type: 'learning', duration: 30 },
      { title: 'Real-world use', description: 'Try using it in context', type: 'practice', duration: 25 },
      { title: 'Track fluency', description: 'What comes naturally now?', type: 'reflection', duration: 5 }
    ],
    // Day 7
    [
      { title: 'Light review', description: 'Browse all week\'s material', type: 'learning', duration: 20 },
      { title: 'Fun practice', description: 'Game, video, or easy activity', type: 'practice', duration: 25 },
      { title: 'Plan week 2', description: 'Set specific goals for next week', type: 'reflection', duration: 10 }
    ]
  ],

  Habit: [
    // Day 1
    [
      { title: 'Minimum version', description: 'Do the smallest possible version', type: 'practice', duration: 5 },
      { title: 'Set trigger', description: 'Choose a cue for your habit', type: 'learning', duration: 5 },
      { title: 'Celebrate', description: 'Mark it done, feel proud!', type: 'reflection', duration: 2 }
    ],
    // Day 2
    [
      { title: 'Repeat', description: 'Same time, same trigger, minimum version', type: 'practice', duration: 5 },
      { title: 'Understand cues', description: 'Read about habit loops', type: 'learning', duration: 8 },
      { title: 'Notice', description: 'Was it easier today?', type: 'reflection', duration: 2 }
    ],
    // Day 3
    [
      { title: 'Do it again', description: 'Consistency is key', type: 'practice', duration: 5 },
      { title: 'Learn rewards', description: 'How to reward yourself', type: 'learning', duration: 5 },
      { title: 'Track streak', description: '3 days! Keep going', type: 'reflection', duration: 2 }
    ],
    // Day 4
    [
      { title: 'Fourth day', description: 'Don\'t break the chain', type: 'practice', duration: 5 },
      { title: 'Overcome obstacles', description: 'Plan for when you don\'t feel like it', type: 'learning', duration: 8 },
      { title: 'Commitment check', description: 'Why is this important to you?', type: 'reflection', duration: 2 }
    ],
    // Day 5
    [
      { title: 'Week almost done', description: 'Stay consistent', type: 'practice', duration: 5 },
      { title: 'Increase slightly', description: 'Can you do 2% more?', type: 'learning', duration: 5 },
      { title: 'Feel the habit', description: 'Does it feel automatic yet?', type: 'reflection', duration: 2 }
    ],
    // Day 6
    [
      { title: 'Weekend day 1', description: 'Habits work weekends too', type: 'practice', duration: 5 },
      { title: 'Identity shift', description: 'You\'re becoming someone who does this', type: 'learning', duration: 8 },
      { title: 'Reflect on progress', description: 'Nearly a full week!', type: 'reflection', duration: 2 }
    ],
    // Day 7
    [
      { title: 'Full week!', description: 'You did it 7 days straight', type: 'practice', duration: 5 },
      { title: 'Plan week 2', description: 'Small increase or keep same?', type: 'learning', duration: 8 },
      { title: 'Celebrate milestone', description: '7-day streak is huge!', type: 'reflection', duration: 2 }
    ]
  ],

  Creative: [
    // Day 1
    [
      { title: 'Brainstorm', description: 'Write down all ideas, no filter', type: 'practice', duration: 20 },
      { title: 'Research', description: 'Look at similar projects', type: 'learning', duration: 25 },
      { title: 'Define scope', description: 'What will you actually create?', type: 'reflection', duration: 15 }
    ],
    // Day 2
    [
      { title: 'Outline/plan', description: 'Break project into parts', type: 'practice', duration: 30 },
      { title: 'Study structure', description: 'How do others organize this?', type: 'learning', duration: 20 },
      { title: 'Set milestones', description: 'What to finish by when?', type: 'reflection', duration: 10 }
    ],
    // Day 3
    [
      { title: 'Start creating', description: 'First rough draft/prototype', type: 'practice', duration: 40 },
      { title: 'Learn technique', description: 'One specific skill you need', type: 'learning', duration: 15 },
      { title: 'Assess progress', description: 'Does the direction feel right?', type: 'reflection', duration: 5 }
    ],
    // Day 4
    [
      { title: 'Continue work', description: 'Build on yesterday\'s progress', type: 'practice', duration: 45 },
      { title: 'Solve problem', description: 'Research solution to current blocker', type: 'learning', duration: 10 },
      { title: 'Quality check', description: 'Is this your best work?', type: 'reflection', duration: 5 }
    ],
    // Day 5
    [
      { title: 'Major milestone', description: 'Finish one complete section', type: 'practice', duration: 50 },
      { title: 'Get feedback', description: 'Show someone, ask for input', type: 'learning', duration: 10 },
      { title: 'Incorporate notes', description: 'What changes to make?', type: 'reflection', duration: 10 }
    ],
    // Day 6
    [
      { title: 'Refinement', description: 'Polish what you created', type: 'practice', duration: 40 },
      { title: 'Study examples', description: 'How do the best ones do it?', type: 'learning', duration: 15 },
      { title: 'Plan next section', description: 'What\'s next to create?', type: 'reflection', duration: 5 }
    ],
    // Day 7
    [
      { title: 'Light work', description: 'Small task or planning', type: 'practice', duration: 30 },
      { title: 'Review week', description: 'How much have you created?', type: 'learning', duration: 15 },
      { title: 'Adjust timeline', description: 'On track or need to speed up/slow down?', type: 'reflection', duration: 10 }
    ]
  ]
};

export function generateTasksForDay(
  category: GoalCategory,
  day: number,
  scheduledFor: string
): Task[] {
  const categoryTemplates = taskTemplatesByCategory[category] || taskTemplatesByCategory.Hobby;

  // Cycle through 7-day template, with progressive difficulty
  const dayIndex = ((day - 1) % 7);
  const templates = categoryTemplates[dayIndex] || categoryTemplates[0];

  // Calculate difficulty multiplier based on week number
  const weekNumber = Math.floor((day - 1) / 7) + 1;
  const difficultyMultiplier = 1 + (weekNumber - 1) * 0.1; // 10% increase per week

  return templates.map((template, index) => {
    // Increase duration for weeks 2+
    const adjustedDuration = weekNumber > 1
      ? Math.round(template.duration * difficultyMultiplier)
      : template.duration;

    return {
      id: `task-${day}-${index}`,
      title: template.title,
      description: template.description,
      type: template.type,
      duration: adjustedDuration,
      completed: false,
      scheduledFor,
      day
    };
  });
}

export function generateInitialTasks(roadmap: any, checkInTime: string): Task[] {
  if (!roadmap) return [];

  return generateTasksForDay(roadmap.category, 1, checkInTime);
}
