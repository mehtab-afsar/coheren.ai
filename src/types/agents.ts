// Types for the Multi-Agent Curriculum Generation System

// ============================================
// AGENT 1: GOAL ANALYZER TYPES
// ============================================

export interface GoalAnalysis {
  rawGoal: string;
  goalType: 'skill_acquisition' | 'habit_formation' | 'knowledge_learning' | 'creative_pursuit' | 'fitness' | 'other';
  domain: string;
  subDomain?: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  learningTypes: ('physical' | 'cognitive' | 'creative' | 'social' | 'mental')[];
  typicalTimeline: {
    minimum: string;
    realistic: string;
    mastery: string;
  };
  keyMilestones: string[];
  successCriteria: string[];
  prerequisites: string[];
  commonObstacles: string[];
}

export interface Agent1Output {
  goalAnalysis: GoalAnalysis;
}

// ============================================
// AGENT 2: STONE IDENTIFIER TYPES
// ============================================

export interface QuestionOption {
  value: string;
  label: string;
  impact: Record<string, unknown>;
}

export interface Question {
  text: string;
  type: 'multiple_choice' | 'open_ended' | 'yes_no' | 'scale';
  options?: QuestionOption[];
  parseLogic?: Record<string, unknown>;
  followUpLogic?: {
    if: string;
    then: Question;
  };
}

export interface BuildingStone {
  stoneId: string;
  stoneName: string;
  importance: 'critical' | 'high' | 'medium' | 'low';
  reasoning: string;
  question: Question;
}

export interface Agent2Output {
  requiredStones: BuildingStone[];
}

export interface StoneAnswer {
  stoneId: string;
  answer: string | string[] | number;
  impact: Record<string, unknown>;
}

// ============================================
// AGENT 3: CURRICULUM BUILDER TYPES
// ============================================

export interface Phase {
  phaseNumber: number;
  phaseName: string;
  weeks: number[];
  primaryGoals: string[];
  focusAreas: Record<string, number>;
  keyMilestones: string[];
  buildingOn?: string;
  adaptationRules?: {
    if_completing_easily?: string;
    if_struggling?: string;
  };
  graduation?: {
    assessmentDay: string;
    nextSteps: string[];
  };
}

export interface ProgressionPoint {
  intensity: number;
  volume: 'low' | 'medium' | 'medium-high' | 'high';
  technique_depth: 'shallow' | 'medium' | 'deep' | 'very_deep';
}

export interface ReviewMoment {
  day: number;
  type: 'reflection' | 'checkpoint' | 'mid_assessment' | 'final_assessment';
  prompt?: string;
  task?: string;
}

export interface RestDays {
  pattern: string;
  customDays: number[];
  restType: 'complete_rest' | 'active_recovery';
}

export interface CurriculumModifiers {
  removed?: string[];
  added?: string[];
  modified?: string[];
  phase1_extended?: string;
  extra_rest_days?: number[];
  substituted?: Record<string, string>;
  emphasize?: string;
  deemphasize?: string;
}

export interface Roadmap {
  totalDays: number;
  totalPhases: number;
  phases: Phase[];
  progressionCurve: Record<string, ProgressionPoint>;
  reviewMoments: ReviewMoment[];
  restDays: RestDays;
  modifiers_from_stones: Record<string, CurriculumModifiers>;
}

export interface Agent3Output {
  roadmap: Roadmap;
}

// ============================================
// AGENT 4: TASK GENERATOR TYPES
// ============================================

export interface TaskStep {
  stepNumber: number;
  instruction: string;
  duration: string;
  details?: string | string[];
  resource?: {
    type: 'video' | 'article' | 'audio' | 'practice';
    url?: string;
    timestamp?: string;
    focusPoints?: string[];
  };
  practice?: string;
}

export interface TaskAdaptations {
  [key: string]: string;
}

export interface TaskResource {
  type: 'video' | 'article' | 'interactive' | 'image' | 'pdf' | 'tool' | 'playlist';
  title: string;
  url: string;
  platform?: string;
  channel?: string;
  duration?: string;
  thumbnail?: string;
  description: string;
  why: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced' | 'all';
  topics?: string[];
  timestamps?: Record<string, string>;
}

export interface DailyTask {
  day: number;
  phase: number;
  week: number;
  task: {
    title: string;
    description: string;
    estimatedMinutes: number;
    steps: TaskStep[];
    tips: string[];
    successCriteria: {
      primary: string;
      bonus?: string;
    };
    whyThisMatters: string;
    commonMistakes?: string[];
    buildingOn?: string[];
    nextUp?: string;
    adaptations_applied?: TaskAdaptations;
    resources?: {
      primary: TaskResource | null;
      supplementary: TaskResource[];
    };
  };
}

export interface Agent4Output {
  dailyTask: DailyTask;
}

// ============================================
// AGENT 5: CURRICULUM RE-CALIBRATOR TYPES
// ============================================

export interface CompletedTaskFeedback {
  dayNumber: number;
  title: string;
  difficultyRating: number; // 1-5 scale (1=easy, 5=very hard)
  completionTime: number; // actual minutes taken
  userComment?: string; // optional struggle notes
  skipped: boolean;
  skipReason?: 'time' | 'health' | 'difficulty' | 'external';
}

export interface CheckpointAnalysis {
  checkpointDay: number; // e.g., 14, 28, 42
  overallMastery: 'struggling' | 'on-track' | 'excelling';
  strugglingAreas: string[]; // e.g., ["F-chord transitions", "Stamina"]
  masteringAreas: string[]; // e.g., ["Basic strumming", "Finger positioning"]
  paceAdjustment: 'slow-down' | 'maintain' | 'accelerate';
  motivationalInsights: string; // What's working emotionally
  recommendations: string[]; // Specific changes to make
  nextSprintFocus: string; // The theme for Days 15-28
}

export interface RecalibratedSprint {
  sprintNumber: number; // Which 14-day sprint this is
  startDay: number;
  endDay: number;
  adjustedPhase?: {
    phaseName: string;
    focusAreas: Record<string, number>;
    rationale: string;
  };
  modifiedTasks: Array<{
    dayNumber: number;
    modification: 'added' | 'removed' | 'adjusted';
    reason: string;
    newFocus?: string;
  }>;
  pedagogicalChanges: {
    restDaysAdded: number[];
    reviewDaysAdded: number[];
    difficultyReduction: boolean;
    intensityIncrease: boolean;
  };
  personalizedMessage: string; // Message to show user at checkpoint
}

export interface Agent5Input {
  context: AgentContext;
  roadmap: Roadmap;
  stoneAnswers: StoneAnswer[];
  completedTasks: CompletedTaskFeedback[];
  currentDay: number;
}

export interface Agent5Output {
  checkpointAnalysis: CheckpointAnalysis;
  recalibratedSprint: RecalibratedSprint;
}

// ============================================
// AGENT SYSTEM TYPES
// ============================================

export interface AgentContext {
  userId: string;
  goal: string;
  timeline: number; // in days
  dailyTimeAvailable: number; // in minutes
}

export interface AgentPipeline {
  step: 1 | 2 | 3 | 4;
  context: AgentContext;
  agent1Output?: Agent1Output;
  agent2Output?: Agent2Output;
  stoneAnswers?: StoneAnswer[];
  agent3Output?: Agent3Output;
  agent4Output?: Agent4Output;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface GenerateRoadmapRequest {
  goal: string;
  timeline: number;
  dailyTime: number;
  stoneAnswers: StoneAnswer[];
}

export interface GenerateRoadmapResponse {
  success: boolean;
  roadmap?: Roadmap;
  error?: string;
}

export interface GenerateDailyTaskRequest {
  roadmapId: string;
  dayNumber: number;
  userContext: {
    stoneAnswers: StoneAnswer[];
    previousTasksCompleted: number[];
  };
}

export interface GenerateDailyTaskResponse {
  success: boolean;
  task?: DailyTask;
  error?: string;
}
