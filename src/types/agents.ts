// Types for the Multi-Agent Curriculum Generation System

// ============================================
// AGENT 1: GOAL ANALYZER TYPES
// ============================================

// ============================================
// SPRINT 1: NEW RESEARCH-BACKED TYPES
// ============================================

/** Prochaska TTM stage — determines curriculum type (Contemplation = motivation activation, not skills) */
export type ChangeStage = 'precontemplation' | 'contemplation' | 'preparation' | 'action' | 'maintenance';

/** Goal classification — drives BCT decomposition vs domain pedagogy branching in Agent 3 */
export type GoalType = 'skill_based' | 'behavior_based' | 'outcome_based' | 'hybrid';

/** Miller & Rollnick readiness ruler — two primary drivers of motivational readiness */
export interface ReadinessProfile {
  importance: number;    // 1–10: how important is achieving this to the user right now
  selfEfficacy: number;  // 1–10: how confident are they that they could actually succeed
}

/** Linguistic signal analysis — HOW the user answers, not just WHAT they say */
export interface LinguisticSignals {
  hedgeDensity: number;              // fraction of hedged phrases ("maybe", "sort of", "I guess")
  changeVsSustainRatio: number;      // ratio of change-talk to sustain-talk markers (>1 = change orientation)
  passiveVoiceCount: number;         // external locus of control signal
  conditionalLanguage: boolean;      // "if I could", "when I have time" → barrier-framing
  certaintyMarkers: string[];        // "definitely", "absolutely" → high confidence areas
  answerLength: 'minimal' | 'normal' | 'elaborate'; // minimal = avoidance signal
  topicAvoidanceDetected: boolean;   // very short answer to emotionally loaded question
}

// ──────────────────────────────────────────────────────────────────────────────

export type GoalDomain =
  | 'Cognitive'
  | 'Kinesthetic'
  | 'Career'
  | 'Financial'
  | 'Creative'
  | 'Health'
  | 'Lifestyle'
  | 'Hybrid';

export type GoalHorizon = 'Short-term' | 'Mid-term' | 'Long-term';

export type GoalIntensity = 'Low' | 'Moderate' | 'High' | 'Extreme';

export type SMARTElement = 'specific' | 'measurable' | 'achievable' | 'relevant' | 'timeBound';

export type RealismLevel = 'Realistic' | 'Optimistic' | 'Unrealistic' | 'Unknown';

export interface SMARTStatus {
  specific: boolean;
  measurable: boolean;
  achievable: boolean;
  relevant: boolean;
  timeBound: boolean;
}

export interface RealismChecks {
  timeRealism: RealismLevel;
  effortRealism: RealismLevel;
}

export interface GoalAnalysis {
  // Core classification
  goal: string;                   // Normalized goal statement
  domain: GoalDomain;             // Primary domain
  subDomains: string[];           // Sub-domains for Hybrid goals
  category: string;               // Specific category within domain
  horizon: GoalHorizon;           // Short=<3mo, Mid=3-12mo, Long=1yr+
  intensity: GoalIntensity;       // Daily effort required

  // Intelligence signals
  clarityScore: number;           // 0–1: How well-defined is the goal
  ambiguityScore: number;         // 0–1: How vague or contradictory
  confidence: number;             // 0–1: Agent's confidence in this analysis

  // SMART validation
  smartStatus: SMARTStatus;
  missingSMART: SMARTElement[];

  // Realism assessment
  realismChecks: RealismChecks;

  // Extracted constraints and risks
  constraintsDetected: string[];  // e.g. "working full-time", "no gym access"
  risksDetected: string[];        // e.g. "burnout risk", "vague fantasy goal"

  // Curriculum-building context (used by Agent 2 & 3)
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

  /** Goal classification for Agent 3 branching. skill_based=domain pedagogy; behavior_based=BCT decomposition */
  goalType?: GoalType;
}

export interface Agent1Output {
  goalAnalysis: GoalAnalysis;
}

// ============================================
// AGENT 2: STONE IDENTIFIER TYPES
// ============================================

// --- Stone Taxonomy ---

export type StoneCategory = 'Logistical' | 'Psychological' | 'Cognitive' | 'Behavioural';

export type StoneType =
  // Logistical
  | 'TimeConstraint'
  | 'ResourceGap'
  | 'EnvironmentFriction'
  // Psychological
  | 'Inconsistency'
  | 'FearOfFailure'
  | 'Perfectionism'
  | 'LowConfidence'
  | 'UnrealisticExpectations'
  // Cognitive
  | 'FocusFragility'
  | 'CognitiveFatigue'
  | 'SkillGap'
  // Behavioural
  | 'ProcrastinationPattern'
  | 'Overcommitment';

export type StoneSeverity = 'Low' | 'Moderate' | 'High' | 'Critical';

export interface Stone {
  type: StoneType;
  category: StoneCategory;
  trigger: string;         // What specifically causes this stone e.g. "momentum drops at week 2"
  severity: StoneSeverity;
  riskImpact: number;      // 0–1: how damaging this stone is to goal success
}

export interface StoneProfile {
  userArchetype: string;                // e.g. "Motivated but Volatility-Prone"
  primaryStone: StoneType;
  stones: Stone[];
  agent3Guidance: string[];            // Instructions for curriculum builder
  agent5Note: string;                  // Prediction for recalibrator (e.g. "expect dip at day 12")
  confidence: number;                  // 0–1
  /** Miller & Rollnick readiness ruler — populated when USE_READINESS_RULER is on */
  readinessProfile?: ReadinessProfile;
  /** Prochaska TTM stage — drives Agent 3 curriculum type decision */
  changeStage?: ChangeStage;
  /** Linguistic signals from the interview — populated when USE_LINGUISTIC_SIGNALS is on */
  linguisticSignals?: LinguisticSignals;
}

// --- Question Phase (MODE 1 output — rendered in UI) ---

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

// MODE 1 output: questions to display in UI
export interface Agent2Output {
  requiredStones: BuildingStone[];
}

// MODE 2 output: behavioral profile extracted from answers
export interface Agent2ProfileOutput {
  stoneProfile: StoneProfile;
}

export interface StoneAnswer {
  stoneId: string;
  answer: string | string[] | number;
  impact: Record<string, unknown>;
  comment?: string; // optional free-text added after selecting an option
}

// ============================================
// AGENT 3: CURRICULUM BUILDER TYPES
// ============================================

export interface DaySkeleton {
  day: number;                     // Day number within the phase (1-indexed)
  theme: string;                   // What this day covers (e.g. "Jab technique drill")
  taskType: 'practice' | 'learning' | 'reflection' | 'challenge' | 'retrieval' | 'rest';
  intensity: number;               // 0.0–1.0 relative intensity
  focusArea: string;               // Which focusArea key this day targets
  /** Spaced repetition: populated when USE_SPACED_REPETITION_SCHEDULE is on */
  isSpacedReview?: boolean;        // true = this day is a review session (not new content)
  reviewOf?: number[];             // Which prior absolute day numbers this day reviews
  spacingInterval?: number;        // Days since original encoding of the reviewed content
}

export interface Phase {
  phaseNumber: number;
  phaseName: string;
  weeks: number[];
  durationDays: number;          // Explicit day count for this phase
  primaryGoals: string[];
  focusAreas: Record<string, number>;
  keyMilestones: string[];
  scienceRationale: string;      // Citation from RAG / pedagogical reason for this structure
  buildingOn?: string;
  daySkeleton?: DaySkeleton[];   // Day-level plan — gives Agent 4 specific daily guidance
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
  relatedSkills?: string[];        // Skills from earlier days being tested
  relatedDays?: number[];          // Which days' content this reviews
}

// ============================================
// ASSESSMENT TYPES (Testing & Revision System)
// ============================================

export type AssessmentQuestionType = 'multiple_choice' | 'open_ended' | 'true_false' | 'ordering' | 'self_rate';

export type BloomLevel = 'recall' | 'apply' | 'analyze';

export interface AssessmentOption {
  value: string;
  label: string;
  correct?: boolean;               // for auto-gradeable types
}

export interface AssessmentQuestion {
  id: string;
  type: AssessmentQuestionType;
  question: string;
  options?: AssessmentOption[];
  correctAnswer?: string;           // for auto-gradeable types
  rubric?: string;                   // for self-assessment (e.g., "Rate yourself: Did you maintain guard position?")
  relatedDay: number;                // which day's content this tests
  relatedSkill: string;             // e.g., "jab technique", "chord transitions"
  difficulty: BloomLevel;            // Bloom's taxonomy level
}

export type ConfidenceLevel = 'guessing' | 'unsure' | 'confident' | 'certain';

export interface AssessmentResult {
  questionId: string;
  userAnswer: string | number;
  selfScore?: number;               // 1-5 self-assessment
  correct?: boolean;                 // for auto-gradeable
  confidence: ConfidenceLevel;
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
  /** Estimated day when primary habit reaches automaticity (Lally UCL 2010, avg 66 days). Populated when USE_TIMELINE_SCALING is on. */
  habitAutomaticityDay?: number;
  /** Timeline adjusted for daily time budget using sqrt scaling formula. Populated when USE_TIMELINE_SCALING is on. */
  adjustedTimeline?: number;
  /** If adjustedTimeline > requested timeline, this warning is surfaced to the user. */
  timelineMismatchWarning?: string;
}

export interface Agent3Output {
  roadmap: Roadmap;
  domainPedagogy: string;        // The specific pedagogical framework applied (e.g. "Sports Periodization")
  stoneModificationSummary: string; // How the stone profile changed the curriculum
}

// ── Rolling Curriculum — Sprint 4 ──────────────────────────────────────────

/** Competency gate that must be met before graduating to the next phase. */
export interface CompetencyGate {
  /** Human-readable description of what mastery looks like at this gate */
  description: string;
  /** Minimum completion rate over 5 consecutive days (0–100) */
  minCompletionRate: number;
  /** Maximum average difficulty rating acceptable for graduation (1–5; lower = less struggle) */
  maxAvgDifficulty: number;
  /** Optional: specific skills/behaviors that must be demonstrated */
  requiredBehaviors?: string[];
}

/** Milestone at a percentage point of the total timeline */
export interface CurriculumMilestone {
  percentComplete: number;  // 30 | 60 | 90
  day: number;              // Absolute day number
  competencyDescription: string;
  graduationGate: CompetencyGate;
}

/**
 * CurriculumSkeleton — produced by Agent 3 when USE_ROLLING_CURRICULUM is on.
 *
 * Replaces the full AgentRoadmapV2 as the onboarding output. Contains:
 *   - Phase structure with Dreyfus-based splits
 *   - Competency gates for phase graduation
 *   - Milestones at 30/60/90% of timeline
 *   - Week 1 fully planned (7 days with spaced repetition pattern)
 *   - goalType branching metadata for downstream agents
 *
 * Weeks 2+ are generated on demand by recalibrateWeek() using the skeleton
 * as the planning context — this is the "rolling window" model.
 */
export interface CurriculumSkeleton {
  totalDays: number;
  adjustedTimeline?: number;
  habitAutomaticityDay?: number;
  goalType: GoalType;

  phases: Array<{
    phaseNumber: number;
    phaseName: 'Foundation' | 'Development' | 'Mastery' | 'Phase0_Motivation';
    startDay: number;
    endDay: number;
    dreyfusStage: 'novice' | 'advanced_beginner' | 'competent' | 'proficient';
    primaryGoals: string[];
    graduationGate: CompetencyGate;
    /** BCT primitives for behavior_based goals — sequenced by Fogg Tiny Habits principle */
    bctPrimitives?: Array<{
      name: string;
      cue: string;
      behavior: string;
      installByDay: number;
    }>;
  }>;

  milestones: CurriculumMilestone[];

  /** Week 1 fully planned — all 7 days with spaced repetition pattern */
  week1Days: import('../core/store/useStore').WeekDay[];

  /** Stone-driven modifications applied to this skeleton */
  stoneModifications: string[];

  /** For BCT goals: ordered behavioral primitives to install phase-by-phase */
  behavioralPrimitives?: string[];
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
  // Time-boxed watching: specific segment to watch given daily time budget
  watchFrom?: string;    // e.g. "0:05:00" — start of the relevant segment
  watchTo?: string;      // e.g. "0:20:00" — end of the relevant segment
  watchMinutes?: number; // planned watch time in minutes (e.g. 15)
}

export interface TaskSegment {
  label: string;      // e.g. "Learn", "Practice", "Review"
  duration: number;   // minutes
  description: string;
  tip?: string;
}

export interface TaskPrep {
  items: string[];  // e.g. ["printed past papers", "timer app open"]
  note: string;     // e.g. "Download the mock test tonight before you sleep"
}

export interface DailyTask {
  day: number;
  phase: number;
  week: number;
  task: {
    title: string;
    description: string;
    estimatedMinutes: number;
    segments?: TaskSegment[]; // 3 activity blocks (30-30-40 time split)
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
    coachTips?: string[];
    reflection?: string;
    requiresPrep?: TaskPrep; // prep needed for this task (shown in prior day's AllDoneCard)
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
  stoneProfile: Agent2ProfileOutput;
  completedTasks: CompletedTaskFeedback[];
  currentDay: number;
  /**
   * Per-day assessment/quiz summary (correct/total, self-score, misconceptions)
   * built by the orchestrator from completed tasks' assessmentResults. Injected
   * into Agent 5's prompt so recalibration can respond to how the user actually
   * scored, not just skip/difficulty signals.
   */
  assessmentSummary?: string;
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
  behavioralFlags?: string[]; // Obstacle signals from Shadow Extractor
  // Chat-collected fields — Agent 2 uses these to avoid redundant questions
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  energyPattern?: string;   // e.g. 'morning', 'evening', 'afternoon', 'night'
  name?: string;
  category?: string;
  /** Where the user practices/works on their goal — e.g. 'gym', 'home', 'office', 'outdoor', 'online' */
  practiceEnvironment?: string;
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
// MULTI-STAGE VALIDATION TYPES
// ============================================

// --- Agent 1: Goal Clarification ---

export interface GoalClarificationOption {
  value: string;
  label: string;
}

export interface GoalClarificationQuestion {
  id: string;                                     // e.g. "goal_specificity"
  question: string;                               // e.g. "What does 'learn boxing' mean to you?"
  type: 'multiple_choice' | 'yes_no';
  options: GoalClarificationOption[];
  probes: string;                                 // Which ambiguity this resolves
}

export interface RealityCheck {
  triggered: boolean;
  severity: 'warning' | 'hard_stop';             // warning = show but allow proceed; hard_stop = must acknowledge
  headline: string;                               // e.g. "Your timeline is very aggressive"
  detail: string;                                 // e.g. "90 days for competitive sparring requires..."
  suggestedAdjustment: string;                    // e.g. "Focus on fundamentals in 90 days"
  typicalTimeline: string;                        // from Agent 1 typicalTimeline.realistic
}

export interface GoalClarificationOutput {
  needsClarification: boolean;                    // false = skip step entirely
  questions: GoalClarificationQuestion[];         // 2-3 questions max
  realityCheck: RealityCheck | null;
}

// --- Agent 2: Round 2 Adaptive Follow-ups ---

export interface StoneFollowUpOption {
  value: string;
  label: string;
  pointsTo: string;                               // Which stone this maps to
}

export interface StoneFollowUpQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'yes_no';
  options: StoneFollowUpOption[];
  resolves: string;                               // e.g. "TimeConstraint vs ProcrastinationPattern"
}

export interface PreliminaryStone {
  type: StoneType;
  confidence: number;                             // 0-1
}

export interface StoneRound2Output {
  preliminaryStones: PreliminaryStone[];
  followUpQuestions: StoneFollowUpQuestion[];     // 3-4 adaptive questions
  contradictionDetected: boolean;
  contradictionNote?: string;
}

export interface CrossValidationResult {
  correctedPrimary: StoneType;
  correctedProfile: StoneProfile;
  contradictionResolved: string | null;
  confidenceImprovement: number;                  // delta confidence
}

// --- Agent 3: Curriculum Preview + Calibration ---

export interface CurriculumPreviewTask {
  day: number;
  title: string;
  type: 'practice' | 'learning' | 'reflection' | 'challenge' | 'retrieval';
  estimatedMinutes: number;
  summary: string;                                // 1-sentence description
  phase: number;
}

export interface CurriculumPreview {
  tasks: CurriculumPreviewTask[];                 // 7 tasks (Days 1-7)
  weekTheme: string;                              // e.g. "Building your foundation"
  endOfWeekOutcome: string;                       // e.g. "You'll be able to throw a clean jab"
}

export type PaceChoice = 'too_easy' | 'just_right' | 'too_intense';

export interface PaceCalibration {
  choice: PaceChoice;
  difficultyMultiplier: number;                   // 0.8 = easier, 1.0 = normal, 1.2 = harder
  phaseDurationMultiplier: number;                // 1.0 normal, 1.2 = extend phases
  maxStepsPerTask: number;                        // 3 (too_intense), 4 (normal), 5 (too_easy)
  note: string;                                   // Applied to Agent 4 prompt
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
