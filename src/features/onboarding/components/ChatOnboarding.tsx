import { useState, useRef, useEffect } from 'react';
import { Icons } from '@shared/components/ui/icons';
import { CoherenLoader } from '@shared/components/ui/coheren-loader';
import { DitheringShader } from '@shared/components/ui/dithering-shader';

/** Full-bleed sphere shader for the auth gate left panel */
const AuthShaderPanel = () => (
  <DitheringShader
    shape="sphere"
    type="random"
    colorBack="#0f0f0f"
    colorFront="#7c3aed"
    pxSize={3}
    speed={1.2}
    style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
  />
);
import { useStore } from '@core/store/useStore';
import { callReasoning, callEconomy } from '@lib/ai-router';
import { tokens, button } from '@core/design-system';
import { generateInitialTasks } from '@shared/utils/taskGenerator';
import { detectCategory } from '@shared/utils/categoryDetection';
import { retrieveKnowledge, type UserContext } from '@core/rag';
import type { GoalCategory } from '@types-app/index';


// Import agent system
import { runOnboardingAgents, generateCompleteRoadmap, generateTaskBatch } from '@core/agents';
import type { BuildingStone, StoneAnswer, Agent1Output, DailyTask } from '@core/agents';
import StoneQuestions from '@features/onboarding/components/StoneQuestions';
import { syncCompleteRoadmap } from '@lib/database';
import { useAuthGate } from '../hooks/useAuthGate';


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

interface ChatOnboardingProps {
  onLoginSuccess?: () => void;
}

export default function ChatOnboarding({ onLoginSuccess }: ChatOnboardingProps) {
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
  }>({
    goal: initialGoal || '',
    category: initialGoal ? detectCategory(initialGoal) : null,
    name: '',
    energyPattern: '',
    wakeTime: '',
    dailyTime: '',
    skillLevel: '',
    subGoals: [],
    timeline: null
  });

  // Agent system state
  const [onboardingPhase, setOnboardingPhase] = useState<'conversation' | 'stones' | 'generating'>('conversation');
  const [goalAnalysis, setGoalAnalysis] = useState<Agent1Output | null>(null);
  const [stones, setStones] = useState<BuildingStone[]>([]);
  const [agentError, setAgentError] = useState<{ message: string; retryFn: () => void } | null>(null);

  // Auth gate (shown after roadmap generation for unauthenticated users)
  const {
    showAuthGate, setShowAuthGate,
    authGateMode, setAuthGateMode,
    authEmail, setAuthEmail,
    authPassword, setAuthPassword,
    authName, setAuthName,
    authLoading,
    authError, setAuthError,
    setPendingSyncData,
    handleAuthGateSubmit
  } = useAuthGate({ collectedData, setInitialGoal, setStep, onLoginSuccess });

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

        // Final safety check: if category is still missing, try detection
        if (!merged.category && merged.goal) {
          merged.category = detectCategory(merged.goal);
        }

        // Beautiful debug table showing exactly what we have
        console.log('🔍 Shadow Extractor found:', newData);
        console.table({
          'Collected So Far': {
            Goal: merged.goal || '❌ missing',
            Name: merged.name || '❌ missing',
            'Skill Level': merged.skillLevel || '❌ missing',
            Timeline: merged.timeline || '❌ missing',
            'Daily Time': merged.dailyTime || '❌ missing',
            Category: merged.category || '❌ missing',
            'Energy Pattern': merged.energyPattern || '❌ missing'
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

      console.log('💬 AI Whisper:', whisper.trim());

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
    console.log('🎯 runAnalysisAndGetStones called');
    console.log('   Goal:', collectedData.goal);
    console.log('   Category:', collectedData.category);

    if (!collectedData.goal || !collectedData.category) {
      console.error('❌ Missing required data - cannot run agents');
      console.error('   Goal:', collectedData.goal);
      console.error('   Category:', collectedData.category);
      return;
    }

    setIsTyping(true);

    try {
      // Debug: Log what we received from Shadow Extractor
      console.log('🔍 Collected data before parsing:', {
        dailyTime: collectedData.dailyTime,
        dailyTimeType: typeof collectedData.dailyTime,
        timeline: collectedData.timeline
      });

      const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);
      const durationInMonths = collectedData.timeline?.target
        ? calculateDurationInMonths(collectedData.timeline.target)
        : 3;
      const timelineDays = durationInMonths * 30;

      console.log('📊 Running agents with parameters:');
      console.log('   Timeline:', timelineDays, 'days');
      console.log('   Daily time:', dailyMinutes, 'minutes');

      // Run Agent 1 & 2
      const { goalAnalysis: analysis, stones: identifiedStones } = await runOnboardingAgents(
        collectedData.goal,
        timelineDays,
        dailyMinutes
      );

      console.log('✅ Agents completed successfully');
      setGoalAnalysis(analysis);
      setStones(identifiedStones.requiredStones);

      // Debug: Log stones to see their structure
      console.log('🧱 Generated Building Stones:', identifiedStones.requiredStones.length);
      identifiedStones.requiredStones.forEach((stone, i) => {
        console.log(`   Stone ${i+1}:`, {
          id: stone.stoneId,
          question: stone.question.text,
          type: stone.question.type,
          hasOptions: !!stone.question.options,
          optionsCount: stone.question.options?.length || 0
        });
      });

      console.log('🔄 Switching to stone questions phase');
      setOnboardingPhase('stones');
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
      console.log("🚀 Data complete. Moving to Stone Questions...");
      setOnboardingPhase('stones');
      runAnalysisAndGetStones();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectedData, onboardingPhase, isGeneratingPlan]);

  // Handler for stone questions completion
  const handleStoneQuestionsComplete = (answers: StoneAnswer[]) => {
    setOnboardingPhase('generating');
    generateStrategicPlanWithAgents(answers);
  };

  // New function: Generate plan using Agent 3 & 4
  const generateStrategicPlanWithAgents = async (answers: StoneAnswer[]) => {
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
      console.log('🚀 Starting complete roadmap generation...');
      console.log('   Timeline:', timelineDays, 'days');
      console.log('   Daily time:', dailyMinutes, 'minutes');

      // Run Agent 3 & 4 to generate roadmap and first task
      const { roadmap: agentRoadmap, firstTask, stoneProfile } = await generateCompleteRoadmap(
        collectedData.goal,
        timelineDays,
        dailyMinutes,
        answers,
        collectedData.category || undefined,
        collectedData.skillLevel || 'beginner'
      );

      console.log('✅ Roadmap and first task generated');

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
        agentRoadmap: agentRoadmap.roadmap // Store full agent roadmap
      };

      // Update profile and goal
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

      // Helper: convert a DailyTask agent output to the store/DB format
      const toStoreTask = (agentTask: typeof firstTask, dayNum: number) => ({
        id: String(dayNum),
        title: agentTask.task.title,
        description: agentTask.task.description,
        type: 'practice' as const,
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

      // Day 1 is already generated; pre-generate days 2–7 in background
      const initialTasks = [toStoreTask(firstTask, 1)];

      console.log('📦 Day 1 task resources:', {
        title: firstTask.task.title,
        primary: firstTask.task.resources?.primary?.url ?? 'none',
      });

      setTasks(initialTasks);
      setGenerationProgress(100);
      clearInterval(progressInterval);

      // Generate days 2-7 in background (non-blocking) then append to store + DB
      generateTaskBatch(2, 7, agentRoadmap, stoneProfile, dailyMinutes, collectedData.category || undefined, collectedData.skillLevel || 'beginner')
        .then((batchTasks: DailyTask[]) => {
          const extraTasks = batchTasks.map((t: DailyTask, i: number) => toStoreTask(t, i + 2));
          const allTasks = [...initialTasks, ...extraTasks];
          setTasks(allTasks);
          console.log(`✅ Week 1 fully generated (${allTasks.length} tasks)`);
          const u = useStore.getState().user;
          if (u) {
            syncCompleteRoadmap(u.id, collectedData.goal, `Generated via AI for ${collectedData.category}`, goalAnalysis, answers, agentRoadmap, allTasks)
              .catch((err: unknown) => console.warn('⚠️ Re-sync with week tasks failed:', err));
          }
        })
        .catch((err: unknown) => console.warn('⚠️ Background week generation failed:', err));

      setGenerationProgress(100);
      clearInterval(progressInterval);

      // Check if user is authenticated
      const user = useStore.getState().user;
      if (user) {
        // User is logged in — sync in background and go to dashboard
        console.log('📤 Syncing roadmap to Supabase...');
        syncCompleteRoadmap(
          user.id,
          collectedData.goal,
          `Generated via AI multi-agent system for ${collectedData.category}`,
          goalAnalysis,
          answers,
          agentRoadmap,
          initialTasks
        ).then(result => {
          if (result.success && 'isLocalOnly' in result && result.isLocalOnly) {
            const toast = document.createElement('div');
            toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#F59E0B;color:white;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:10000;font-size:14px;';
            toast.textContent = '💡 Running in offline mode - progress saved locally';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 4000);
          } else if (result.success) {
            console.log('✅ Roadmap synced to Supabase successfully!');
          }
        }).catch(error => {
          console.warn('⚠️ Background sync issue:', error);
        });

        setTimeout(() => setStep(2), 1000);
      } else {
        // Not authenticated — show auth gate overlay (blurred roadmap + signup)
        console.log('🔒 Roadmap ready. Showing auth gate...');
        setPendingSyncData({ goalAnalysisData: goalAnalysis, answers, agentRoadmap, initialTasksData: initialTasks });
        setTimeout(() => {
          setIsGeneratingPlan(false);
          setShowAuthGate(true);
        }, 800);
      }

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

      {/* Transition loader — shown while stones are being fetched */}
      {onboardingPhase === 'stones' && stones.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <CoherenLoader size={64} color="#7c3aed" />
        </div>
      )}

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
            <div className="fixed bottom-0 left-0 right-0 flex justify-center px-6 pb-6 pt-3" style={{ zIndex: 50 }}>
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

      {/* Auth Gate — centered card overlay */}
      {showAuthGate && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(15,15,15,0.5)' }}>

          {/* Card */}
          <div className="flex w-full overflow-hidden rounded-2xl shadow-2xl"
            style={{ maxWidth: '820px', minHeight: '480px', background: '#fff' }}>

            {/* Left — sphere shader */}
            <div className="hidden md:block relative w-[42%] flex-shrink-0 overflow-hidden rounded-l-2xl">
              <AuthShaderPanel />
            </div>

            {/* Right — form */}
            <div className="flex flex-1 flex-col justify-center px-10 py-10">

              <h2 className="text-2xl font-medium tracking-tight mb-1" style={{ color: tokens.colors.text.primary }}>
                {authGateMode === 'signup' ? 'Get Started' : 'Welcome back'}
              </h2>
              <p className="text-sm mb-6" style={{ color: tokens.colors.text.secondary, lineHeight: 1.6 }}>
                {authGateMode === 'signup'
                  ? 'Create a free account to save your personalized plan and start today.'
                  : 'Sign in to your account to access your roadmap.'}
              </p>

              {/* Error */}
              {authError && (
                <div className="text-sm rounded-lg px-4 py-3 mb-4"
                  style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}>
                  {authError}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuthGateSubmit} className="flex flex-col gap-3">
                {authGateMode === 'signup' && (
                  <div>
                    <label className="block text-sm mb-1.5" style={{ color: tokens.colors.text.primary }}>Your name</label>
                    <input
                      type="text"
                      placeholder="Alex"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                      className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
                      style={{ border: `1.5px solid ${tokens.colors.border}`, color: tokens.colors.text.primary }}
                      onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = tokens.colors.border}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: tokens.colors.text.primary }}>Your email</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
                    style={{ border: `1.5px solid ${tokens.colors.border}`, color: tokens.colors.text.primary }}
                    onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                    onBlur={(e) => e.currentTarget.style.borderColor = tokens.colors.border}
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1.5" style={{ color: tokens.colors.text.primary }}>
                    {authGateMode === 'signup' ? 'Create a password' : 'Password'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2.5 text-sm rounded-lg outline-none"
                    style={{ border: `1.5px solid ${tokens.colors.border}`, color: tokens.colors.text.primary }}
                    onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                    onBlur={(e) => e.currentTarget.style.borderColor = tokens.colors.border}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 rounded-lg text-sm font-medium mt-1 transition-opacity"
                  style={{
                    ...button.primary,
                    opacity: authLoading ? 0.7 : 1,
                    cursor: authLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {authLoading ? 'Saving your roadmap...' : authGateMode === 'signup' ? 'Create a new account' : 'Sign In & Continue'}
                </button>
              </form>

              <p className="text-center text-sm mt-4" style={{ color: tokens.colors.text.secondary }}>
                {authGateMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => { setAuthGateMode(authGateMode === 'signup' ? 'login' : 'signup'); setAuthError(null); }}
                  className="font-medium underline cursor-pointer bg-transparent border-none"
                  style={{ color: tokens.colors.text.primary }}
                >
                  {authGateMode === 'signup' ? 'Login' : 'Sign Up'}
                </button>
              </p>
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
