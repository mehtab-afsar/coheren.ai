# Multi-Agent Curriculum Generation System

A sophisticated AI agent framework for generating personalized learning roadmaps for ANY goal.

## Architecture Overview

This system uses **4 specialized agents** that work together to create customized 90-day learning plans:

```
User Goal → Agent 1 → Agent 2 → User Answers → Agent 3 → Agent 4 → Daily Tasks
```

### Agent 1: Goal Analyzer
**Purpose:** Understand the goal deeply

**Input:**
- User's goal (e.g., "I want to learn boxing")
- Timeline (days)
- Daily time available (minutes)

**Output:**
- Goal classification (skill_acquisition, habit_formation, etc.)
- Domain and complexity level
- Learning types (physical, cognitive, creative)
- Typical timeline expectations
- Key milestones and success criteria
- Prerequisites and common obstacles

**File:** `agent1-goal-analyzer.ts`

### Agent 2: Stone Identifier
**Purpose:** Determine critical information needed

**Input:**
- Goal analysis from Agent 1

**Output:**
- 5-8 "building stones" (critical questions)
- Each stone has:
  - Question to ask user
  - Multiple choice options
  - Impact of each option on curriculum

**File:** `agent2-stone-identifier.ts`

**Example Stones:**
- Training environment (gym vs home)
- Current fitness level
- Physical limitations
- Primary motivation
- Prior experience

### Agent 3: Curriculum Builder
**Purpose:** Create the learning roadmap structure

**Input:**
- Goal analysis (Agent 1)
- User's stone answers (Agent 2)

**Output:**
- Phases (major learning stages)
- Weekly focus areas
- Progression curve (intensity over time)
- Review moments and rest days
- Adaptation rules
- Customizations based on stone answers

**File:** `agent3-curriculum-builder.ts`

**Pedagogical Principles Used:**
- Scaffolding (build on previous knowledge)
- Spacing effect (review at intervals)
- Progressive overload (gradual difficulty increase)
- Variation (prevent monotony)
- Feedback loops (self-assessment)

### Agent 4: Task Generator
**Purpose:** Write specific daily tasks

**Input:**
- Day number
- Curriculum structure (Agent 3)
- User context (stone answers)

**Output:**
- Specific, actionable task for that day
- Step-by-step instructions
- Tips for success
- Success criteria
- Context (why it matters)
- Adaptations applied

**File:** `agent4-task-generator.ts`

**Task Quality:**
- Clear and specific (not vague)
- Completable in allocated time
- Progressive (builds on previous days)
- Includes motivational context

## Usage

### Quick Start

```typescript
import { runOnboardingAgents, generateCompleteRoadmap } from './agents';

// Step 1: Run onboarding agents
const { goalAnalysis, stones } = await runOnboardingAgents(
  "I want to learn boxing",
  90,  // days
  30   // minutes per day
);

// Step 2: Present stones to user and collect answers
const stoneAnswers = [
  {
    stoneId: "training_environment",
    answer: "home_no_equipment",
    impact: { /* impact data */ }
  },
  // ... more answers
];

// Step 3: Generate complete roadmap
const { roadmap, firstTask } = await generateCompleteRoadmap(
  "I want to learn boxing",
  90,
  30,
  stoneAnswers
);

// Step 4: Generate tasks for subsequent days
import { generateTask } from './agents';

const day2Task = await generateTask(
  2,
  roadmap,
  stoneAnswers,
  30
);
```

### Orchestrator Functions

#### `runOnboardingAgents(goal, timeline, dailyTime)`
Runs Agents 1 & 2 to analyze goal and identify required information.

```typescript
const { goalAnalysis, stones } = await runOnboardingAgents(
  "learn guitar",
  60,  // 60 days
  45   // 45 minutes/day
);
```

#### `generateCompleteRoadmap(goal, timeline, dailyTime, stoneAnswers)`
Runs Agents 1, 3, and 4 to create full roadmap and first task.

```typescript
const { goalAnalysis, roadmap, firstTask } = await generateCompleteRoadmap(
  "prepare for UPSC",
  365,
  120,
  userAnswers
);
```

#### `generateTask(dayNumber, roadmap, stoneAnswers, dailyTime)`
Runs Agent 4 to generate a specific day's task.

```typescript
const task = await generateTask(
  15,           // Day 15
  roadmap,      // From Agent 3
  stoneAnswers,
  30
);
```

#### `generateTaskBatch(startDay, endDay, roadmap, stoneAnswers, dailyTime)`
Generate multiple tasks at once (useful for pre-generating first week).

```typescript
const firstWeekTasks = await generateTaskBatch(
  1,
  7,
  roadmap,
  stoneAnswers,
  30
);
```

## Data Structures

### GoalAnalysis
```typescript
{
  rawGoal: "learn boxing",
  goalType: "skill_acquisition",
  domain: "combat_sports",
  complexity: "beginner",
  learningTypes: ["physical", "tactical"],
  typicalTimeline: {
    minimum: "2 months",
    realistic: "4-6 months",
    mastery: "2-5 years"
  },
  keyMilestones: [...],
  successCriteria: [...],
  prerequisites: [...],
  commonObstacles: [...]
}
```

### BuildingStone
```typescript
{
  stoneId: "training_environment",
  stoneName: "Training Environment",
  importance: "critical",
  reasoning: "Boxing at gym vs home changes 90% of curriculum",
  question: {
    text: "Where will you practice boxing?",
    type: "multiple_choice",
    options: [
      {
        value: "gym_with_coach",
        label: "At a boxing gym with a coach",
        impact: { /* how this changes the plan */ }
      },
      // ... more options
    ]
  }
}
```

### Roadmap
```typescript
{
  totalDays: 90,
  totalPhases: 4,
  phases: [
    {
      phaseNumber: 1,
      phaseName: "Foundation & Conditioning",
      weeks: [1, 2, 3],
      primaryGoals: [...],
      focusAreas: { technique: 40, conditioning: 40 },
      keyMilestones: [...],
      adaptationRules: { ... }
    },
    // ... more phases
  ],
  progressionCurve: { ... },
  reviewMoments: [ ... ],
  restDays: { ... },
  modifiers_from_stones: { ... }
}
```

### DailyTask
```typescript
{
  day: 1,
  phase: 1,
  week: 1,
  task: {
    title: "Master the Boxing Stance",
    description: "Learn and practice the fundamental boxing stance",
    estimatedMinutes: 30,
    steps: [
      {
        stepNumber: 1,
        instruction: "Watch tutorial video",
        duration: "5 minutes",
        resource: { type: "video", url: "..." }
      },
      // ... more steps
    ],
    tips: [...],
    successCriteria: {
      primary: "Can hold proper stance for 30 seconds",
      bonus: "Feet positioning feels natural"
    },
    whyThisMatters: "The stance is your foundation...",
    adaptations_applied: { ... }
  }
}
```

## Integration with Existing Code

### Current Flow
```typescript
// Old system (ChatOnboarding.tsx)
const tasks = await generateInitialTasks(goal, category);
```

### New Flow
```typescript
// Step 1: Onboarding (collect goal + stones)
const { stones } = await runOnboardingAgents(goal, 90, 30);

// Step 2: Show stone questions to user
// (User answers questions)

// Step 3: Generate roadmap
const { roadmap, firstTask } = await generateCompleteRoadmap(
  goal,
  90,
  30,
  stoneAnswers
);

// Step 4: Generate subsequent tasks on-demand
const todayTask = await generateTask(
  currentDay,
  roadmap,
  stoneAnswers,
  30
);
```

## Benefits of This System

### 1. Universal
Works for **ANY** goal:
- Boxing → Physical skill
- Guitar → Creative skill
- UPSC → Knowledge acquisition
- Meditation → Habit formation

### 2. Personalized
Same goal → 100 different roadmaps based on user context

### 3. Scalable
- Agents are reusable
- Easy to improve individual agents
- Can cache Agent 3 output for efficiency

### 4. High Quality
- Uses pedagogical principles
- Specific, actionable tasks
- Adapts to user context

## File Structure

```
src/
├── agents/
│   ├── agent1-goal-analyzer.ts      # Goal understanding
│   ├── agent2-stone-identifier.ts   # Information gathering
│   ├── agent3-curriculum-builder.ts # Roadmap creation
│   ├── agent4-task-generator.ts     # Daily task generation
│   ├── orchestrator.ts              # Coordinates all agents
│   ├── index.ts                     # Exports
│   └── README.md                    # This file
├── types/
│   └── agents.ts                    # TypeScript types
```

## Next Steps

1. **Update ChatOnboarding.tsx**
   - Replace `generateInitialTasks` with agent system
   - Add stone question UI
   - Collect stone answers

2. **Store Roadmap**
   - Save Agent 3 output to database
   - Cache curriculum structure
   - Generate tasks on-demand

3. **Testing**
   - Test with different goals
   - Verify stone impacts work
   - Check task quality

4. **Optimization**
   - Pre-generate first week of tasks
   - Cache stone questions per goal type
   - Batch task generation

## Example: Complete Flow

```typescript
// 1. User enters goal
const goal = "I want to learn boxing";

// 2. Run onboarding agents
const { goalAnalysis, stones } = await runOnboardingAgents(goal, 90, 30);

// 3. Show stone questions to user
stones.requiredStones.forEach(stone => {
  // Display stone.question to user
  // Collect answer
});

// 4. Collect stone answers
const stoneAnswers = [
  { stoneId: "training_environment", answer: "home_no_equipment", impact: {} },
  { stoneId: "fitness_baseline", answer: "low_fitness", impact: {} },
  // ... etc
];

// 5. Generate roadmap
const { roadmap, firstTask } = await generateCompleteRoadmap(
  goal,
  90,
  30,
  stoneAnswers
);

// 6. Save to database
await saveRoadmap(userId, roadmap);

// 7. Show first task to user
displayTask(firstTask);

// 8. Later: Generate Day 2 task
const day2 = await generateTask(2, roadmap, stoneAnswers, 30);
```

## Configuration

### Environment Variables
```bash
VITE_GROQ_API_KEY=your_groq_api_key_here
```

### Model Settings
All agents use `llama-3.3-70b-versatile` with JSON mode enabled.

You can adjust temperature per agent:
- Agent 1: 0.3 (factual analysis)
- Agent 2: 0.4 (structured questions)
- Agent 3: 0.5 (creative curriculum design)
- Agent 4: 0.6 (varied task writing)

## Troubleshooting

### Agent returns invalid JSON
- Check that `response_format: { type: 'json_object' }` is set
- Verify the system prompt clearly states "Return ONLY valid JSON"

### Tasks are too vague
- Agent 4 temperature might be too high
- Check that user context (stone answers) are being passed correctly
- Ensure previous tasks context is included

### Curriculum doesn't adapt to stones
- Verify stone answers include impact data
- Check Agent 3 is receiving stone answers
- Review `modifiers_from_stones` in roadmap output

## Contributing

To add support for a new goal domain:
1. No code changes needed! The agents are universal.
2. Optionally: Add domain-specific knowledge to RAG system
3. Optionally: Create templates for common stone questions

---

Built with ❤️ for Coheren.ai
