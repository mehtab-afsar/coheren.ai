import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '@shared/components/ui/icons';
import { CoherenLoader } from '@shared/components/ui/coheren-loader';
import { DitheringShader } from '@shared/components/ui/dithering-shader';


import { useStore } from '@core/store/useStore';
import { callReasoning, callEconomy } from '@lib/ai-router';
import { tokens } from '@core/design-system';
import { detectCategory } from '@shared/utils/categoryDetection';
import { retrieveKnowledge, type UserContext } from '@core/rag';
import type { GoalCategory } from '@types-app/index';


// Import agent system
import { runOnboardingAgents, generateCompleteRoadmap, generateTaskBatch, getGoalClarifications, runStoneRound2, runStoneCrossValidation, getCurriculumPreview, getPaceCalibration } from '@core/agents';
import type { BuildingStone, StoneAnswer, Agent1Output, DailyTask, GoalClarificationOutput, StoneRound2Output, CurriculumPreview, PaceCalibration, PaceChoice } from '@core/agents';
import StoneQuestions from '@features/onboarding/components/StoneQuestions';
import GoalClarificationStep from '@features/onboarding/components/GoalClarificationStep';
import StoneProfileConfirmation from '@features/onboarding/components/StoneProfileConfirmation';
import CurriculumPreviewComponent from '@features/onboarding/components/CurriculumPreview';
import { syncCompleteRoadmap } from '@lib/database';
import { useAuthGate } from '../hooks/useAuthGate';
import { track } from '@lib/analytics';


// Groq client now imported from groq-client.ts with auto-fallback

// Helper function to parse daily time commitment to minutes
function parseDailyTimeToMinutes(dailyTime: string | unknown): number {
  if (!dailyTime) return 30; // Default 30 minutes

  // Ensure dailyTime is a string
  const timeString = typeof dailyTime === 'string' ? dailyTime : String(dailyTime);
  const lower = timeString.toLowerCase();

  // Match patterns like "2 hr", "2 hours", "120 min", "120 minutes", "1.5 hours"
  const hourMatch = lower.match(/(\d+\.?\d*)\s*(hour|hr)s?/);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    return Math.round(hours * 60);
  }

  const minMatch = lower.match(/(\d+)\s*(minute|min)s?/);
  if (minMatch) {
    const minutes = parseInt(minMatch[1]);
    return minutes;
  }

  // Just a number - assume minutes
  const justNumber = timeString.match(/^(\d+)$/);
  if (justNumber) {
    return parseInt(justNumber[1]);
  }

  return 30; // Default
}

// Helper function to calculate duration in months from timeline
function calculateDurationInMonths(timeline: string): number {
  // Check for year (e.g., "by 2027", "2027")
  const yearMatch = timeline.match(/\d{4}/);
  if (yearMatch) {
    const targetYear = parseInt(yearMatch[0]);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    const yearsFromNow = targetYear - currentYear;
    const monthsFromYears = yearsFromNow * 12 - currentMonth;
    return Math.max(1, monthsFromYears); // At least 1 month
  }

  // Extract number and unit
  const match = timeline.match(/(\d+)\s*(week|month|year|day)s?/i);
  if (!match) return 3; // Default to 3 months

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  // Convert to months
  if (unit.startsWith('day')) return Math.max(1, Math.ceil(value / 30));
  if (unit.startsWith('week')) return Math.max(1, Math.ceil(value / 4));
  if (unit.startsWith('month')) return value;
  if (unit.startsWith('year')) return value * 12;

  return 3; // Default fallback
}

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

/** Animated text that cycles through analysis phases */
function AnalyzingText() {
  const [phase, setPhase] = useState(0);
  const texts = [
    'Analyzing your responses...',
    'Building your profile...',
    'Personalizing your journey...',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setPhase(p => (p + 1) % texts.length);
    }, 2000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <AnimatePresence mode="wait">
        <motion.p
          key={phase}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: '#7c3aed',
            margin: '0 0 6px',
            letterSpacing: '-0.01em',
          }}
        >
          {texts[phase]}
        </motion.p>
      </AnimatePresence>
      <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>
        This takes a few seconds
      </p>
    </div>
  );
}

interface ChatOnboardingProps {
  onLoginSuccess?: () => void;
}

export default function ChatOnboarding({ onLoginSuccess: _onLoginSuccess }: ChatOnboardingProps) {
  // Read initial goal from store (set by landing page)
  const initialGoal = useStore((state) => state.initialGoal);
  const setInitialGoal = useStore((state) => state.setInitialGoal);

  const [messages, setMessages] = useState<Message[]>(() => {
    const initMessages: Message[] = [
      {
        id: '1',
        role: 'ai',
        content: "Hey there! 👋 I'm Coheren, your AI goal coach. I'm here to help turn your dreams into reality with a personalized action plan. What would you like to achieve?",
        timestamp: new Date(),
      },
    ];
    // If user came from landing with a goal, pre-fill it as a user message
    if (initialGoal) {
      initMessages.push({
        id: '2',
        role: 'user',
        content: initialGoal,
        timestamp: new Date(),
      });
    }
    return initMessages;
  });
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Store actions
  const setStep = useStore((state) => state.setStep);
  const updateUniversalProfile = useStore((state) => state.updateUniversalProfile);
  const updateCurrentGoal = useStore((state) => state.updateCurrentGoal);
  const setRoadmap = useStore((state) => state.setRoadmap);
  const setAgentData = useStore((state) => state.setAgentData);
  const setTasks = useStore((state) => state.setTasks);
  const checkInTime = useStore((state) => state.checkInTime);

  // Collected data from conversation
  const [collectedData, setCollectedData] = useState<{
    goal: string;
    category: GoalCategory | null;
    name: string;
    energyPattern: string;
    wakeTime: string;
    dailyTime: string;
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | '';
    subGoals: string[];
    timeline: { target: string; milestones: string[] } | null;
    behavioralFlags: string[];
  }>({
    goal: initialGoal || '',
    category: initialGoal ? detectCategory(initialGoal) : null,
    name: '',
    energyPattern: '',
    wakeTime: '',
    dailyTime: '',
    skillLevel: '',
    subGoals: [],
    timeline: null,
    behavioralFlags: []
  });

  // Agent system state
  const [onboardingPhase, setOnboardingPhase] = useState<
    'conversation' | 'analyzing' | 'goal_clarification' | 'stones' | 'stone_round2' | 'stone_confirmation' | 'generating' | 'curriculum_preview'
  >('conversation');
  const [goalAnalysis, setGoalAnalysis] = useState<Agent1Output | null>(null);
  const [stones, setStones] = useState<BuildingStone[]>([]);
  const [agentError, setAgentError] = useState<{ message: string; retryFn: () => void } | null>(null);

  // Multi-stage validation state
  const [goalClarifications, setGoalClarifications] = useState<GoalClarificationOutput | null>(null);
  const [round1Answers, setRound1Answers] = useState<StoneAnswer[]>([]);
  const [stoneRound2, setStoneRound2] = useState<StoneRound2Output | null>(null);
  const [stoneProfile, setStoneProfile] = useState<import('@core/agents').Agent2ProfileOutput | null>(null);
  const [curriculumPreviewData, setCurriculumPreviewData] = useState<CurriculumPreview | null>(null);
  const [_agentRoadmapData, setAgentRoadmapData] = useState<import('@core/agents').Agent3Output | null>(null);
  const [_paceCalibration, setPaceCalibration] = useState<PaceCalibration | null>(null);

  // Auth gate (shown after roadmap generation for unauthenticated users)
  const {
    showAuthGate, setShowAuthGate,
    authGateMode, setAuthGateMode,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authName, setAuthName,
    authLoading,
    authError, setAuthError,
    setPendingSyncData: _setPendingSyncData,
    handleAuthGateSubmit
  } = useAuthGate({ collectedData, setInitialGoal, setStep });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-focus input on mount and after sending messages
  useEffect(() => {
    inputRef.current?.focus();
  }, [messages, isTyping]);

  // Keep focus on input unless plan generation is triggered
  useEffect(() => {
    if (onboardingPhase === 'conversation' && !isGeneratingPlan) {
      inputRef.current?.focus();
    }
  }, [onboardingPhase, isGeneratingPlan]);

  // If user came from landing page with a pre-filled goal, trigger AI response automatically
  const hasTriggeredInitialRef = useRef(false);
  useEffect(() => {
    if (initialGoal && messages.length === 2 && !hasTriggeredInitialRef.current) {
      hasTriggeredInitialRef.current = true;
      // The goal is already in messages as a "user" message — trigger AI response
      const triggerInitialResponse = async () => {
        setIsTyping(true);
        try {
          const { content: aiResponse = "That's a great goal! What's your current experience level — beginner, intermediate, or advanced?" } = await callReasoning({
            messages: [
              {
                role: 'system',
                content: `You are Coheren, an enthusiastic AI goal coach. The user has just shared their goal. Respond warmly, acknowledge their goal specifically, and ask ONE follow-up question to understand their experience level (beginner/intermediate/advanced). Keep it to 2-3 sentences max.`
              },
              { role: 'user', content: initialGoal }
            ],
            temperature: 0.7,
            max_tokens: 150,
          });
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: aiResponse,
            timestamp: new Date(),
          }]);
        } catch {
          setMessages(prev => [...prev, {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: `That's a great goal! To build your personalized roadmap for "${initialGoal}", I need to ask a few quick questions. What's your current experience level — beginner, intermediate, or advanced?`,
            timestamp: new Date(),
          }]);
        }
        setIsTyping(false);
      };
      triggerInitialResponse();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // NOTE: The "Bulletproof" Trigger useEffect is placed AFTER runAnalysisAndGetStones
  // to avoid the react-hooks/immutability "accessed before declared" lint error.

  const handleSend = async () => {
    if (!userInput.trim() || isTyping) return;

    // If we've moved past conversation phase, don't process new input
    if (onboardingPhase !== 'conversation') {
      setUserInput(''); // Clear input
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = userInput;
    setUserInput('');
    setIsTyping(true);

    try {
      // --- STEP 1: THE SHADOW EXTRACTOR (Replaces Regex) ---
      // Build conversation history for context
      const extractionHistory = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content
      }));

      // We use a small, fast model to extract data into JSON with FULL context
      const { content: extractRaw } = await callEconomy({
        messages: [
          {
            role: 'system',
            content: `You are a data extraction bot. Analyze the FULL conversation and return ONLY a JSON object.

Extract these fields based on conversation context:
- name: The person's name (e.g., "I'm John", "My name is Sarah", "Call me Alex")
- goal: What they want to achieve (e.g., "learn boxing", "get fit", "prepare for UPSC")
- skillLevel: Their experience level - must be one of: "beginner", "intermediate", or "advanced"
- category: Type of goal - one of: "Fitness", "Learning", "Exam", "Habit", "Creative", "Hobby"
- timeline: When they want to achieve it (e.g., "3 months", "by 2027", "6 weeks")
- dailyTime: How much time per day (e.g., "30 minutes", "1 hour", "2 hours")
- energyPattern: Peak energy time - one of: "morning", "afternoon", "evening", "night"
- behavioralFlags: Array of obstacle signals detected. Include any that apply: "past_failure_mentioned" (user references previous failed attempts), "conditional_availability" (availability depends on external factors like "if work allows"), "external_accountability_needed" (user wants a partner, deadline, or accountability), "low_confidence" (user expresses doubt about ability), "time_scarcity" (user emphasizes they have very little time), "perfectionist_tendency" (user wants everything to be perfect before starting). Return [] if none apply.

CRITICAL RULES:
1. Use conversation context to understand what each response refers to
2. If the AI asked "What's your goal?" and user says "boxing", extract goal: "boxing" (NOT name!)
3. If the AI asked "What's your name?" and user says "John", extract name: "John" (NOT goal!)
4. If a field is already collected (Current Data shows it), keep it null unless user is correcting it
5. Return ONLY the JSON object, no other text

Current Data Already Collected: ${JSON.stringify(collectedData)}`
          },
          ...extractionHistory,
          { role: 'user', content: currentInput }
        ],
        response_format: { type: "json_object" }
      });

      const newData = JSON.parse(extractRaw || '{}');

      // Clean Merge: Only update fields if the AI actually found something new and non-null
      setCollectedData(prev => {
        const merged = { ...prev };

        // Only update fields if the AI actually found something new and non-null
        if (newData.name) merged.name = newData.name;
        if (newData.goal) merged.goal = newData.goal;
        if (newData.skillLevel) merged.skillLevel = newData.skillLevel;
        if (newData.timeline) merged.timeline = newData.timeline;
        if (newData.dailyTime) merged.dailyTime = newData.dailyTime;
        if (newData.category) merged.category = newData.category;
        if (newData.energyPattern) merged.energyPattern = newData.energyPattern;
        // Accumulate behavioral flags — never overwrite, only add new ones
        if (Array.isArray(newData.behavioralFlags) && newData.behavioralFlags.length > 0) {
          const combined = new Set([...merged.behavioralFlags, ...newData.behavioralFlags]);
          merged.behavioralFlags = Array.from(combined);
        }

        // Final safety check: if category is still missing, try detection
        if (!merged.category && merged.goal) {
          merged.category = detectCategory(merged.goal);
        }

        // Beautiful debug table showing exactly what we have
        console.table({
          'Collected So Far': {
            Goal: merged.goal || '❌ missing',
            Name: merged.name || '❌ missing',
            'Skill Level': merged.skillLevel || '❌ missing',
            Timeline: merged.timeline || '❌ missing',
            'Daily Time': merged.dailyTime || '❌ missing',
            Category: merged.category || '❌ missing',
            'Energy Pattern': merged.energyPattern || '❌ missing',
            'Behavioral Flags': merged.behavioralFlags.length > 0 ? merged.behavioralFlags.join(', ') : '(none)'
          }
        });

        return merged;
      });

      // --- STEP 2: THE CONVERSATIONAL RESPONSE ---
      const conversationHistory = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content
      }));

      // Build RAG context for science-backed coaching
      const userContext: UserContext = {
        goal: collectedData.goal || undefined,
        category: collectedData.category || undefined,
        energyPattern: collectedData.energyPattern as UserContext['energyPattern'] || undefined,
        skillLevel: collectedData.skillLevel as UserContext['skillLevel'] || undefined,
      };
      const scientificKnowledge = retrieveKnowledge(userContext, 'new-goal');

      // Create the base system prompt with cleaner coaching style
      const systemPrompt = `You are Coheren, an enthusiastic AI goal coach. Your mission is to help the user define their dream and prepare them for a personalized strategic roadmap.${scientificKnowledge}

---
CORE GOAL:
Guide the user through a warm, natural conversation to understand their:
1. Goal & Name
2. Skill Level (beginner to advanced)
3. Timeline & Daily Time Commitment
4. Energy Patterns (when they are most productive)

COACHING STYLE (Self-Determination Theory):
- AUTONOMY: Offer suggestions, not commands. Use "You might try" instead of "You must."
- COMPETENCE: Celebrate their ambition. If they say "I want to learn Boxing," respond with "That's a powerful skill to build! I love the focus on discipline."
- RELATEDNESS: Use their name once extracted. Be a supportive partner, not a robotic script.

CONVERSATION RULES:
- Keep responses SHORT (1-3 sentences). People hate walls of text in chat.
- Ask ONLY ONE question at a time. Do not overwhelm them.
- If they are vague, ask intelligent follow-up questions (e.g., if the goal is "Fitness," ask "Are we looking at weight loss, strength, or maybe a specific sport like Boxing?").
- Use "Habit Stacking" advice: Suggest attaching their new goal to an existing routine.

TRANSITION LOGIC:
Once you feel you have a solid grasp of their goal, timeline, and lifestyle, simply wrap up the thought and tell them you're ready to build the plan.
(Example: "That gives me everything I need, ${collectedData.name || '[Name]'}! I'm putting the pieces together for your roadmap now...")

IMPORTANT:
The system will automatically detect when the data is complete and transition to the next phase. You do not need to use any specific 'magic words' or commands. Just be a helpful coach until the screen changes.`;

      // --- STEP 3: AI WHISPERING (Dynamic Guidance) ---
      // Identify what's still missing
      const missingFields = [];
      if (!collectedData.name) missingFields.push("their name");
      if (!collectedData.skillLevel) missingFields.push("their experience/skill level");
      if (!collectedData.dailyTime) missingFields.push("how much time they can commit daily");
      if (!collectedData.energyPattern) missingFields.push("their peak energy time (morning/evening/etc)");
      if (!collectedData.timeline) missingFields.push("their target timeline or deadline");

      // Create the "Whisper"
      const whisper = missingFields.length > 0
        ? `\n\n(SYSTEM WHISPER: You still need to find out: ${missingFields.join(', ')}. Please ask about ONE of these naturally in your next response.)`
        : `\n\n(SYSTEM WHISPER: You have all the data! Wrap up the conversation warmly and let them know the plan is ready.)`;

      // Inject the whisper into the system prompt
      const { content: aiResponse = "Tell me more!" } = await callReasoning({
        messages: [
          { role: 'system', content: systemPrompt + whisper },
          ...conversationHistory,
          { role: 'user', content: currentInput }
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);

      // No more "Perfect!" string checking - state-driven trigger will handle it

    } catch (error: unknown) {
      // Handle Groq API errors with proper user feedback
      console.error('❌ Groq API Error:', error);

      let errorMessage = "I'm having trouble connecting. Please try again.";

      // Check for rate limit error with type guards
      const err = error as { error?: { message?: string }; message?: string };
      if (err?.error?.message?.includes('Rate limit reached')) {
        const match = err.error.message.match(/Please try again in (\d+m\d+\.?\d*s)/);
        const waitTime = match ? match[1] : '10 minutes';
        errorMessage = `⚠️ I've hit my daily API limit. Please wait ${waitTime} and try again, or contact support to upgrade the API plan.`;
      } else if (err?.message?.includes('rate_limit')) {
        errorMessage = "⚠️ API rate limit reached. Please wait a few minutes and try again.";
      } else if (err?.message?.includes('network') || err?.message?.includes('fetch')) {
        errorMessage = "⚠️ Network error. Please check your connection and try again.";
      }

      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: errorMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
      setIsTyping(false);
    }
  };

  // Old regex-based extraction function removed - replaced by Shadow Extractor (AI-based)

  // New function: Run Agent 1 & 2 to get stone questions
  const runAnalysisAndGetStones = async () => {

    if (!collectedData.goal || !collectedData.category) {
      console.error('❌ Missing required data - cannot run agents');
      console.error('   Goal:', collectedData.goal);
      console.error('   Category:', collectedData.category);
      return;
    }

    setIsTyping(true);

    try {
      const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);
      const durationInMonths = collectedData.timeline?.target
        ? calculateDurationInMonths(collectedData.timeline.target)
        : 3;
      const timelineDays = durationInMonths * 30;


      // Run Agent 1 & 2 — pass everything from chat so Agent 2 won't re-ask it
      const { goalAnalysis: analysis, stones: identifiedStones } = await runOnboardingAgents(
        collectedData.goal,
        timelineDays,
        dailyMinutes,
        collectedData.behavioralFlags,
        {
          skillLevel: collectedData.skillLevel || undefined,
          energyPattern: collectedData.energyPattern || undefined,
          name: collectedData.name || undefined,
          category: collectedData.category || undefined,
        }
      );

      setGoalAnalysis(analysis);
      setStones(identifiedStones.requiredStones);

      // Brief delay for the analyzing transition to be visible
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if Agent 1 flagged ambiguity or unrealistic goals → show clarification step
      const clarifications = getGoalClarifications(analysis);
      if (clarifications.needsClarification || clarifications.realityCheck?.triggered) {
        setGoalClarifications(clarifications);
        setOnboardingPhase('goal_clarification');
      } else {
        setOnboardingPhase('stones');
      }
      setIsTyping(false);

    } catch (error) {
      console.error('❌ Error running onboarding agents:', error);
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }
      setIsTyping(false);
      setOnboardingPhase('conversation');
      const isRateLimit = error instanceof Error && (error.message.includes('rate') || error.message.includes('Rate'));
      setAgentError({
        message: isRateLimit
          ? 'API rate limit reached. Please wait a moment and try again.'
          : 'Something went wrong while analyzing your goal. Please try again.',
        retryFn: () => { setAgentError(null); runAnalysisAndGetStones(); },
      });
    }
  };

  // The "Bulletproof" Trigger (No setTimeout) - State-Driven
  // Placed here (after runAnalysisAndGetStones) to satisfy react-hooks/immutability rule
  useEffect(() => {
    const isReady = !!(
      collectedData.goal &&
      collectedData.name &&
      collectedData.skillLevel &&
      collectedData.dailyTime &&
      collectedData.timeline
    );

    if (isReady && onboardingPhase === 'conversation' && !isGeneratingPlan) {
      setOnboardingPhase('analyzing');
      runAnalysisAndGetStones();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectedData, onboardingPhase, isGeneratingPlan]);

  // Handler for Round 1 stone questions completion → trigger Round 2
  const handleStoneQuestionsComplete = async (answers: StoneAnswer[]) => {
    setRound1Answers(answers);

    if (!goalAnalysis) {
      setOnboardingPhase('generating');
      generateStrategicPlanWithAgents(answers);
      return;
    }

    try {
      const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);
      const timelineDays = (collectedData.timeline?.target ? calculateDurationInMonths(collectedData.timeline.target) : 3) * 30;

      // Run preliminary extraction to generate Round 2 follow-ups
      const round2 = await runStoneRound2(collectedData.goal, timelineDays, dailyMinutes, goalAnalysis, answers);
      setStoneRound2(round2);

      if (round2.followUpQuestions.length > 0) {
        setOnboardingPhase('stone_round2');
      } else {
        // No follow-ups needed — go straight to full extraction
        setOnboardingPhase('generating');
        generateStrategicPlanWithAgents(answers);
      }
    } catch {
      // If Round 2 fails, proceed normally
      setOnboardingPhase('generating');
      generateStrategicPlanWithAgents(answers);
    }
  };

  // Handler for Round 2 stone follow-up completion → cross-validate → show confirmation
  const handleStoneRound2Complete = async (round2Answers: StoneAnswer[]) => {
    if (!stoneRound2 || !goalAnalysis) {
      setOnboardingPhase('generating');
      generateStrategicPlanWithAgents(round1Answers);
      return;
    }

    // Cross-validate to detect misattributions
    const crossVal = runStoneCrossValidation(stoneRound2, round2Answers);

    // Run full stone extraction with all answers combined
    const allAnswers = [...round1Answers, ...round2Answers];

    try {
      const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);
      const timelineDays = (collectedData.timeline?.target ? calculateDurationInMonths(collectedData.timeline.target) : 3) * 30;
      const { extractStones } = await import('@core/agents');
      const profile = await extractStones(
        { userId: 'temp', goal: collectedData.goal, timeline: timelineDays, dailyTimeAvailable: dailyMinutes },
        goalAnalysis,
        allAnswers
      );

      // Inject cross-validation correction if it improved confidence
      if (crossVal.confidenceImprovement > 0.05) {
        profile.stoneProfile.primaryStone = crossVal.correctedPrimary;
      }

      setStoneProfile(profile);
      setOnboardingPhase('stone_confirmation');
    } catch {
      setOnboardingPhase('generating');
      generateStrategicPlanWithAgents(allAnswers);
    }
  };

  // User confirmed stone profile → proceed to curriculum generation + preview
  const handleStoneProfileConfirmed = () => {
    const allAnswers = round1Answers; // profile already extracted
    setOnboardingPhase('generating');
    generateStrategicPlanWithAgents(allAnswers, stoneProfile ?? undefined);
  };

  // User said stone profile doesn't fit → skip confirmation, proceed with raw answers
  const handleStoneProfileDoesntFit = () => {
    setOnboardingPhase('generating');
    generateStrategicPlanWithAgents(round1Answers);
  };

  // User selected pace on preview screen → apply calibration and finalize onboarding
  const handlePaceSelect = async (choice: PaceChoice) => {
    const calibration = getPaceCalibration(choice);
    setPaceCalibration(calibration);

    const pending = (window as Record<string, unknown>).__pendingOnboarding as {
      agentRoadmap: import('@core/agents').Agent3Output;
      firstTask: DailyTask;
      stoneProfile: import('@core/agents').Agent2ProfileOutput;
      dailyMinutes: number;
      durationInMonths: number;
      answers: StoneAnswer[];
    } | undefined;

    if (!pending) {
      setStep(2);
      return;
    }

    const { agentRoadmap, firstTask, stoneProfile: sp, dailyMinutes, durationInMonths } = pending;

    // Convert agent roadmap to our existing format
    const roadmap = {
      title: collectedData.goal,
      category: collectedData.category!,
      duration: durationInMonths,
      dailyTime: collectedData.dailyTime || '30 minutes',
      recommendedTime: collectedData.energyPattern === 'morning' ? '7:00 AM' :
                      collectedData.energyPattern === 'evening' ? '7:00 PM' : '2:00 PM',
      phases: agentRoadmap.roadmap.phases.map(phase => ({
        title: phase.phaseName,
        weeks: `${phase.weeks[0]}-${phase.weeks[phase.weeks.length - 1]}`,
        description: phase.primaryGoals.join('. ')
      })),
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().getTime() + durationInMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      // Embed calibration note for Agent 4 to read
      paceCalibrationNote: calibration.note,
      difficultyMultiplier: calibration.difficultyMultiplier,
    };

    updateUniversalProfile({
      name: collectedData.name,
      energyPattern: collectedData.energyPattern as 'morning' | 'afternoon' | 'evening' | 'night',
      skillLevel: collectedData.skillLevel || undefined,
      weekendAvailability: '',
      dailyRoutine: {
        wakeTime: collectedData.wakeTime || '7:00 AM',
        sleepTime: '',
        workHours: { start: '', end: '' },
        freeTimeSlots: []
      }
    });

    updateCurrentGoal({
      category: collectedData.category!,
      specificGoal: collectedData.goal,
    });

    setRoadmap(roadmap);
    setAgentData(agentRoadmap, sp);

    const inferTaskType = (title: string): 'practice' | 'learning' | 'reflection' => {
      const t = title.toLowerCase();
      if (/reflect|journal|review|assess|evaluat|check.?in|look back|lesson/.test(t)) return 'reflection';
      if (/learn|watch|read|study|understand|explor|research|discover/.test(t)) return 'learning';
      return 'practice';
    };

    const toStoreTask = (agentTask: DailyTask, dayNum: number) => ({
      id: String(dayNum),
      title: agentTask.task.title,
      description: agentTask.task.description,
      type: inferTaskType(agentTask.task.title),
      duration: agentTask.task.estimatedMinutes,
      completed: false,
      skipped: false,
      checkInTime: checkInTime || '07:00',
      scheduledFor: new Date(Date.now() + (dayNum - 1) * 86400000).toISOString().split('T')[0],
      day: dayNum,
      dayNumber: dayNum,
      steps: agentTask.task.steps.map(step => step.instruction),
      tips: agentTask.task.tips,
      successCriteria: agentTask.task.successCriteria.primary,
      resources: agentTask.task.resources,
    });

    const initialTasks = [toStoreTask(firstTask, 1)];
    setTasks(initialTasks);

    // Generate days 2-7 in background with calibration applied
    generateTaskBatch(2, 7, agentRoadmap, sp, dailyMinutes, collectedData.category || undefined, collectedData.skillLevel || 'beginner')
      .then((batchTasks: DailyTask[]) => {
        const extraTasks = batchTasks.map((t: DailyTask, i: number) => toStoreTask(t, i + 2));
        const allTasks = [...initialTasks, ...extraTasks];
        setTasks(allTasks);
        const u = useStore.getState().user;
        if (u) {
          syncCompleteRoadmap(u.id, collectedData.goal, `Generated via AI for ${collectedData.category}`, goalAnalysis!, pending.answers, agentRoadmap, allTasks, sp)
            .catch(() => { /* non-critical */ });
        }
      })
      .catch(() => { /* non-critical */ });

    track('onboarding_completed', { category: collectedData.category, paceChoice: choice });
    delete (window as Record<string, unknown>).__pendingOnboarding;
    setStep(2);
  };

  // New function: Generate plan using Agent 3 & 4
  const generateStrategicPlanWithAgents = async (
    answers: StoneAnswer[],
    preComputedStoneProfile?: import('@core/agents').Agent2ProfileOutput
  ) => {
    if (!collectedData.goal || !goalAnalysis) {
      return;
    }

    setIsGeneratingPlan(true);
    setGenerationProgress(0);

    const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);
    const durationInMonths = collectedData.timeline?.target
      ? calculateDurationInMonths(collectedData.timeline.target)
      : 3;
    const timelineDays = durationInMonths * 30;

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 300);

    try {

      // Run Agent 3 & 4 to generate roadmap and first task
      const { roadmap: agentRoadmap, firstTask, stoneProfile } = await generateCompleteRoadmap(
        collectedData.goal,
        timelineDays,
        dailyMinutes,
        answers,
        collectedData.category || undefined,
        collectedData.skillLevel || 'beginner',
        collectedData.behavioralFlags,
        preComputedStoneProfile
      );

      // Store agent roadmap for later use (preview + task generation)
      setAgentRoadmapData(agentRoadmap);

      // Build 7-day curriculum preview and show it before committing to Day 1
      const preview = getCurriculumPreview(agentRoadmap, collectedData.category || collectedData.goal, dailyMinutes);
      setCurriculumPreviewData(preview);
      setGenerationProgress(100);
      clearInterval(progressInterval);
      setIsGeneratingPlan(false);

      // Transition to preview screen — user picks pace before we finalize tasks
      // Store everything we need for finalization
      (window as Record<string, unknown>).__pendingOnboarding = {
        agentRoadmap, firstTask, stoneProfile, dailyMinutes, durationInMonths, answers
      };
      setOnboardingPhase('curriculum_preview');

    } catch (error) {
      console.error('Error generating plan with agents:', error);
      clearInterval(progressInterval);
      setGenerationProgress(0);
      setIsGeneratingPlan(false);
      setOnboardingPhase('conversation');
      const isRateLimit = error instanceof Error && (error.message.includes('rate') || error.message.includes('Rate'));
      setAgentError({
        message: isRateLimit
          ? 'API rate limit reached while building your curriculum. Please wait a moment and try again.'
          : 'Something went wrong while building your curriculum. Please try again.',
        retryFn: () => { setAgentError(null); generateStrategicPlanWithAgents(answers); },
      });
    }
  };



  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: tokens.colors.background,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Subtle Background Gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `linear-gradient(180deg, ${tokens.colors.primarySubtle}15 0%, transparent 50%)`,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Minimal Animated Background Illustrations - More subtle */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        opacity: 0.015,
        zIndex: 0,
      }}>
        {/* Left side illustrations */}
        <svg style={{ position: 'absolute', left: '5%', top: '15%', width: '180px', height: '180px' }} viewBox="0 0 200 200">
          <path d="M100 20 L180 180 L20 180 Z" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4 4">
            <animate attributeName="stroke-dashoffset" from="0" to="8" dur="20s" repeatCount="indefinite" />
          </path>
        </svg>

        <svg style={{ position: 'absolute', left: '8%', top: '45%', width: '120px', height: '120px' }} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="2" fill="none" />
          <text x="50" y="55" textAnchor="middle" fontSize="12" fill="currentColor">E=mc²</text>
        </svg>

        <svg style={{ position: 'absolute', left: '3%', top: '70%', width: '150px', height: '150px' }} viewBox="0 0 100 100">
          <path d="M20 80 Q30 40 40 80 T60 80" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="40" cy="50" r="25" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="2 2" />
        </svg>

        {/* Right side illustrations */}
        <svg style={{ position: 'absolute', right: '5%', top: '10%', width: '140px', height: '140px' }} viewBox="0 0 100 100">
          <circle cx="50" cy="30" r="15" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="30" cy="60" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="70" cy="60" r="12" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="50" y1="45" x2="30" y2="48" stroke="currentColor" strokeWidth="2" />
          <line x1="50" y1="45" x2="70" y2="48" stroke="currentColor" strokeWidth="2" />
          <line x1="30" y1="72" x2="70" y2="72" stroke="currentColor" strokeWidth="2" />
        </svg>

        <svg style={{ position: 'absolute', right: '7%', top: '40%', width: '160px', height: '160px' }} viewBox="0 0 100 100">
          <rect x="20" y="20" width="60" height="60" stroke="currentColor" strokeWidth="2" fill="none" transform="rotate(15 50 50)" />
          <line x1="30" y1="40" x2="70" y2="40" stroke="currentColor" strokeWidth="1.5" />
          <line x1="30" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="1.5" />
          <line x1="30" y1="60" x2="70" y2="60" stroke="currentColor" strokeWidth="1.5" />
        </svg>

        <svg style={{ position: 'absolute', right: '4%', top: '75%', width: '130px', height: '130px' }} viewBox="0 0 100 100">
          <path d="M30 50 L50 30 L70 50 L50 70 Z" stroke="currentColor" strokeWidth="2" fill="none">
            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="40s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>

      {/* Premium Loading Overlay - shown during plan generation */}
      {isGeneratingPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 252, 249, 0.98)',
          backdropFilter: 'blur(12px)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.spacing['3xl'],
        }}>
          {/* Loading Animation */}
          <CoherenLoader size={72} color="#7c3aed" />

          {/* Loading Text */}
          <div style={{ textAlign: 'center', maxWidth: '500px', marginTop: tokens.spacing.lg }}>
            <h3 style={{
              fontSize: tokens.typography.sizes.xl,
              fontWeight: tokens.typography.weights.regular,
              color: tokens.colors.text.primary,
              marginBottom: tokens.spacing.md,
            }}>
              Creating your personalized plan
            </h3>
            <p style={{
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.light,
              color: tokens.colors.text.secondary,
              lineHeight: tokens.typography.lineHeights.relaxed,
            }}>
              Analyzing your goals and crafting a strategic roadmap tailored just for you...
            </p>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: '300px',
            height: '4px',
            backgroundColor: tokens.colors.gray[100],
            borderRadius: tokens.borderRadius.full,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${generationProgress}%`,
              backgroundColor: tokens.colors.primary,
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Percentage */}
          <span style={{
            fontSize: tokens.typography.sizes.sm,
            fontWeight: tokens.typography.weights.regular,
            color: tokens.colors.text.tertiary,
          }}>
            {generationProgress}%
          </span>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${tokens.spacing.lg} ${tokens.spacing.xl}`,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Logo — top left */}
        <button
          onClick={() => { setStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            padding: 0,
          }}
        >
          <Icons.logo style={{ width: '22px', height: '22px', color: '#7c3aed' }} />
          <span style={{
            fontSize: tokens.typography.sizes.base,
            fontWeight: tokens.typography.weights.medium,
            color: tokens.colors.text.primary,
            letterSpacing: '-0.01em',
          }}>
            coheren.ai
          </span>
        </button>

        {/* Back button — top right */}
        <button
          onClick={() => setStep(0)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: tokens.typography.sizes.sm,
            color: tokens.colors.text.secondary,
            transition: 'all 0.2s',
            padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            fontWeight: tokens.typography.weights.light,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.text.secondary;
          }}
        >
          ← Back
        </button>
      </div>

      {/* ── Analyzing Transition Screen ── */}
      <AnimatePresence>
        {(onboardingPhase === 'analyzing' || (onboardingPhase === 'stones' && stones.length === 0)) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <CoherenLoader size={56} color="#7c3aed" />
            </motion.div>
            <AnalyzingText />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stone Questions Phase */}
      {onboardingPhase === 'stones' && stones.length > 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: tokens.spacing.xl,
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ maxWidth: '700px', width: '100%' }}>
            <div style={{
              marginBottom: tokens.spacing['2xl'],
              textAlign: 'center'
            }}>
              <h2 style={{
                fontSize: tokens.typography.sizes['3xl'],
                fontWeight: tokens.typography.weights.light,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.md
              }}>
                Let's personalize your journey
              </h2>
              <p style={{
                fontSize: tokens.typography.sizes.base,
                color: tokens.colors.text.secondary,
                lineHeight: 1.6
              }}>
                A few quick questions to customize your {collectedData.goal} roadmap perfectly for you
              </p>
            </div>
            <StoneQuestions
              stones={stones}
              onComplete={handleStoneQuestionsComplete}
            />
          </div>
        </div>
      )}

      {/* Goal Clarification Phase */}
      {onboardingPhase === 'goal_clarification' && goalClarifications && (
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: tokens.spacing.xl,
          position: 'relative',
          zIndex: 1,
        }}>
          <GoalClarificationStep
            clarificationOutput={goalClarifications}
            onComplete={() => {
              setOnboardingPhase('stones');
            }}
          />
        </div>
      )}

      {/* Stone Round 2 Phase */}
      {onboardingPhase === 'stone_round2' && stoneRound2 && stoneRound2.followUpQuestions.length > 0 && (
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: tokens.spacing.xl,
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ maxWidth: '700px', width: '100%' }}>
            <div style={{ marginBottom: tokens.spacing['2xl'], textAlign: 'center' }}>
              <h2 style={{
                fontSize: tokens.typography.sizes['3xl'],
                fontWeight: tokens.typography.weights.light,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.md,
              }}>
                A few more questions
              </h2>
              <p style={{ fontSize: tokens.typography.sizes.base, color: tokens.colors.text.secondary, lineHeight: 1.6 }}>
                Help us understand your situation better
              </p>
            </div>
            <StoneQuestions
              stones={stoneRound2.followUpQuestions.map(q => ({
                stoneId: q.id,
                stoneName: q.resolves,
                importance: 'medium' as const,
                reasoning: q.resolves,
                question: {
                  text: q.question,
                  type: q.type,
                  options: q.options.map(o => ({ value: o.value, label: o.label, impact: { pointsTo: o.pointsTo } })),
                },
              }))}
              onComplete={handleStoneRound2Complete}
            />
          </div>
        </div>
      )}

      {/* Stone Profile Confirmation Phase */}
      {onboardingPhase === 'stone_confirmation' && stoneProfile && (
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: tokens.spacing.xl,
          position: 'relative',
          zIndex: 1,
        }}>
          <StoneProfileConfirmation
            stoneProfile={stoneProfile}
            onConfirm={handleStoneProfileConfirmed}
            onDoesntFit={handleStoneProfileDoesntFit}
          />
        </div>
      )}

      {/* Curriculum Preview Phase */}
      {onboardingPhase === 'curriculum_preview' && curriculumPreviewData && (
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: `${tokens.spacing['2xl']} ${tokens.spacing.xl}`,
          position: 'relative',
          zIndex: 1,
        }}>
          <CurriculumPreviewComponent
            preview={curriculumPreviewData}
            onPaceSelect={handlePaceSelect}
          />
        </div>
      )}

      {/* Chat Container */}
      {onboardingPhase === 'conversation' && (
        <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
          <div className="w-full flex flex-col h-full">

            {/* Messages scroll area */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="max-w-3xl mx-auto px-6 py-8 pb-24 flex flex-col">
                {messages.map((message) => (
                  <div key={message.id} className={`flex gap-4 py-6 border-b border-zinc-100 last:border-0 animate-[fadeIn_0.35s_ease-out] ${message.role === 'user' ? 'justify-end' : ''}`}>
                    {/* AI Avatar */}
                    {message.role === 'ai' && (
                      <div className="flex-shrink-0 mt-0.5 w-[30px] h-[30px] rounded-sm flex items-center justify-center">
                        <Icons.logo style={{ width: '18px', height: '18px', color: '#7c3aed' }} />
                      </div>
                    )}
                    {/* Content */}
                    <div className={message.role === 'ai' ? 'flex-1 min-w-0' : 'max-w-[75%]'}>
                      {message.role === 'ai' ? (
                        <p className="text-base sm:text-[1.05rem] font-light leading-[1.85] text-zinc-900 m-0">
                          {message.content}
                        </p>
                      ) : (
                        <div className="bg-[#f4f4f4] text-zinc-800 rounded-2xl rounded-tr-sm px-5 py-3 text-sm sm:text-base font-normal leading-relaxed">
                          {message.content}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-4 py-6">
                    <div className="flex-shrink-0 w-[30px] h-[30px] rounded-sm flex items-center justify-center">
                      <Icons.logo style={{ width: '18px', height: '18px', color: '#7c3aed' }} />
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-2 h-2 rounded-full bg-zinc-400" style={{ animation: 'pulse 1.4s infinite ease-in-out both' }} />
                      <div className="w-2 h-2 rounded-full bg-zinc-400" style={{ animation: 'pulse 1.4s infinite ease-in-out both 0.2s' }} />
                      <div className="w-2 h-2 rounded-full bg-zinc-400" style={{ animation: 'pulse 1.4s infinite ease-in-out both 0.4s' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area — truly floating */}
            <div className="fixed bottom-0 left-0 right-0 flex justify-center px-6 pt-3" style={{ zIndex: 50, paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
              {isTyping || onboardingPhase !== 'conversation' ? (
                <div className="w-full max-w-2xl mx-auto flex items-center px-5 h-12 rounded-full bg-zinc-100 border border-zinc-200">
                  <span className="text-sm text-zinc-400">
                    {onboardingPhase !== 'conversation' ? 'Generating your plan...' : 'Thinking...'}
                  </span>
                </div>
              ) : (
                <div className="w-full max-w-2xl mx-auto flex items-center gap-2 bg-white border border-zinc-200 rounded-full px-5 h-12 shadow-sm focus-within:border-zinc-400 transition-colors">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Type your message..."
                    autoFocus
                    className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-800 placeholder:text-zinc-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!userInput.trim()}
                    className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-900 disabled:bg-zinc-200 flex items-center justify-center transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l14 0"/><path d="M13 18l6 -6"/><path d="M13 6l6 6"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Agent Error Banner — shown when any agent call fails */}
      {agentError && (
        <div style={{
          position: 'fixed',
          bottom: tokens.spacing['2xl'],
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 3000,
          backgroundColor: '#FEF3C7',
          border: '1px solid #D97706',
          borderRadius: tokens.borderRadius.xl,
          padding: `${tokens.spacing.lg} ${tokens.spacing['2xl']}`,
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.xl,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          maxWidth: '500px',
          width: 'calc(100% - 48px)',
        }}>
          <span style={{ fontSize: tokens.typography.sizes.sm, color: '#92400E', flex: 1 }}>
            ⚠️ {agentError.message}
          </span>
          <button
            onClick={agentError.retryFn}
            style={{
              backgroundColor: '#D97706',
              color: 'white',
              border: 'none',
              borderRadius: tokens.borderRadius.md,
              padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
              fontSize: tokens.typography.sizes.sm,
              fontWeight: tokens.typography.weights.medium,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => setAgentError(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400E', fontSize: '18px', padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Auth Gate — full-page, matches AuthPage design */}
      {showAuthGate && (
        <div className="fixed inset-0 z-[2000] flex" style={{ background: '#fff' }}>

          {/* Left panel — dark, sphere, brand */}
          <div
            className="hidden lg:flex flex-col flex-shrink-0"
            style={{ width: '46%', background: '#08080f', position: 'relative', overflow: 'hidden' }}
          >
            {/* Noise texture overlay */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1, opacity: 0.035,
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '180px',
            }} />

            {/* Brand mark */}
            <div className="relative z-10 flex items-center gap-2.5 p-10">
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 2px 10px rgba(124, 58, 237, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#e9d8fd',
                  letterSpacing: '-0.02em',
                  fontFamily: 'monospace'
                }}>
                  co//
                </span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em' }}>
                coheren.ai
              </span>
            </div>

            {/* Sphere + copy + stats */}
            <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-12 pb-10 gap-8">
              <div style={{ position: 'relative', width: 420, height: 420, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                <DitheringShader
                  shape="sphere"
                  type="random"
                  colorBack="#060612"
                  colorFront="#4c1d95"
                  pxSize={2}
                  speed={0.9}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                />
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  boxShadow: 'inset 0 0 0 1px rgba(167, 139, 250, 0.15)',
                  background: 'radial-gradient(circle at 68% 28%, rgba(167, 139, 250, 0.08) 0%, transparent 60%)',
                }} />
              </div>
              <div style={{
                position: 'absolute',
                width: 480, height: 140, borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(124, 58, 237, 0.18) 0%, transparent 70%)',
                filter: 'blur(24px)', pointerEvents: 'none',
              }} />
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ color: 'rgba(255,255,255,0.88)', fontSize: 22, fontWeight: 300, letterSpacing: '-0.03em', lineHeight: 1.4, margin: 0 }}>
                  Turn any goal into<br />one task per day.
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 12, lineHeight: 1.6, fontWeight: 300 }}>
                  AI-built roadmap. Adapts as you grow.
                </p>
              </div>
              <div className="flex items-center gap-6">
                {[['10k+', 'Goals built'], ['91%', 'Completion rate'], ['4.9', 'Avg rating']].map(([val, lbl]) => (
                  <div key={lbl} style={{ textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, fontWeight: 500, letterSpacing: '-0.03em', margin: 0 }}>{val}</p>
                    <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, margin: '2px 0 0', fontWeight: 300 }}>{lbl}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — form */}
          <div className="flex flex-1 flex-col" style={{ background: '#fff', overflowY: 'auto' }}>
            {/* Back button */}
            <div className="flex items-center px-6 pt-8 md:px-10 md:pt-9">
              <button
                onClick={() => setShowAuthGate(false)}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-60"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9ca3af', fontSize: 13 }}
              >
                ← Back
              </button>
            </div>

            {/* Form centered */}
            <div className="flex flex-1 items-center justify-center px-5 py-8 md:px-8 md:py-10">
              <div style={{ width: '100%', maxWidth: 360 }}>

                <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.04em', color: '#0d0d10', margin: '0 0 6px' }}>
                  {authGateMode === 'signup' ? 'Create your account' : 'Welcome back'}
                </h1>
                <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.6, margin: '0 0 32px' }}>
                  {authGateMode === 'signup' ? 'Free forever · No credit card required' : 'Sign in to access your roadmap'}
                </p>

                {authError && (
                  <div style={{ fontSize: 13, borderRadius: 10, padding: '10px 14px', marginBottom: 20, background: '#fef2f2', color: '#b91c1c' }}>
                    {authError}
                  </div>
                )}

                <form onSubmit={handleAuthGateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {authGateMode === 'signup' && (
                    <div>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', color: '#6b7280', marginBottom: 7, textTransform: 'uppercase' as const }}>
                        Full name
                      </label>
                      <input
                        type="text" placeholder="Alex Chen" value={authName} required
                        onChange={(e) => setAuthName(e.target.value)}
                        style={authGateInputStyle}
                        onFocus={(e) => applyAuthGateFocus(e.currentTarget)}
                        onBlur={(e) => applyAuthGateBlur(e.currentTarget)}
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', color: '#6b7280', marginBottom: 7, textTransform: 'uppercase' as const }}>
                      Email
                    </label>
                    <input
                      type="email" placeholder="you@example.com" value={authEmail} required
                      onChange={(e) => setAuthEmail(e.target.value)}
                      style={authGateInputStyle}
                      onFocus={(e) => applyAuthGateFocus(e.currentTarget)}
                      onBlur={(e) => applyAuthGateBlur(e.currentTarget)}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', color: '#6b7280', marginBottom: 7, textTransform: 'uppercase' as const }}>
                      Password
                    </label>
                    <input
                      type="password" placeholder="••••••••" value={authPassword} required minLength={6}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      style={authGateInputStyle}
                      onFocus={(e) => applyAuthGateFocus(e.currentTarget)}
                      onBlur={(e) => applyAuthGateBlur(e.currentTarget)}
                    />
                  </div>

                  <button
                    type="submit" disabled={authLoading}
                    style={{
                      width: '100%', padding: '12px 0', marginTop: 4,
                      borderRadius: 11, border: 'none',
                      cursor: authLoading ? 'not-allowed' : 'pointer',
                      fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                      background: authLoading ? '#ede9fe' : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                      color: authLoading ? '#6d28d9' : '#fff',
                      boxShadow: authLoading ? 'none' : '0 4px 18px rgba(124, 58, 237, 0.35)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!authLoading) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(124, 58, 237, 0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = authLoading ? 'none' : '0 4px 18px rgba(124, 58, 237, 0.35)'; e.currentTarget.style.transform = 'none'; }}
                  >
                    {authLoading
                      ? (authGateMode === 'signup' ? 'Creating account...' : 'Signing in...')
                      : (authGateMode === 'signup' ? 'Create account' : 'Sign in')}
                  </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: 13, marginTop: 24, color: '#9ca3af' }}>
                  {authGateMode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
                  <button
                    onClick={() => { setAuthGateMode(authGateMode === 'signup' ? 'login' : 'signup'); setAuthError(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#7c3aed', padding: 0 }}
                  >
                    {authGateMode === 'signup' ? 'Sign in' : 'Sign up free'}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(1); }
          40% { opacity: 1; transform: scale(1.2); }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const authGateInputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', fontSize: 14, borderRadius: 10,
  border: '1.5px solid #e5e7eb', outline: 'none', color: '#111827',
  background: '#fafafa', boxSizing: 'border-box', transition: 'border-color 0.15s, background 0.15s',
};

function applyAuthGateFocus(el: HTMLInputElement) {
  el.style.borderColor = '#7c3aed';
  el.style.background = '#fff';
  el.style.boxShadow = '0 0 0 3px rgba(124, 58, 237, 0.08)';
}

function applyAuthGateBlur(el: HTMLInputElement) {
  el.style.borderColor = '#e5e7eb';
  el.style.background = '#fafafa';
  el.style.boxShadow = 'none';
}
