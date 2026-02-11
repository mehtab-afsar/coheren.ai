import { useState, useRef, useEffect } from 'react';
import { Sparkles, LogIn, UserPlus, Mail, Lock } from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { callGroqWithFallback, callGroqEconomy } from '@lib/groq-client';
import { tokens, text, button } from '@core/design-system';
import { generateInitialTasks } from '@shared/utils/taskGenerator';
import { detectCategory } from '@shared/utils/categoryDetection';
import { retrieveKnowledge, type UserContext } from '@core/rag';
import type { GoalCategory } from '@types-app/index';
import LoadingAnimation from '@shared/components/LoadingAnimation';

// Import agent system
import { runOnboardingAgents, generateCompleteRoadmap } from '@core/agents';
import type { BuildingStone, StoneAnswer, Agent1Output } from '@core/agents';
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
  useEffect(() => {
    if (initialGoal && messages.length === 2 && !isTyping) {
      // The goal is already in messages as a "user" message — trigger AI response
      const triggerInitialResponse = async () => {
        setIsTyping(true);
        try {
          const completion = await callGroqWithFallback({
            messages: [
              {
                role: 'system',
                content: `You are Coheren, an enthusiastic AI goal coach. The user has just shared their goal. Respond warmly, acknowledge their goal specifically, and ask ONE follow-up question to understand their experience level (beginner/intermediate/advanced). Keep it to 2-3 sentences max.`
              },
              { role: 'user', content: initialGoal }
            ],
            temperature: 0.7,
            max_tokens: 150,
          }, 'standard');
          const aiResponse = completion.choices[0]?.message?.content || "That's a great goal! What's your current experience level — beginner, intermediate, or advanced?";
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
    if (!userInput.trim()) return;

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
      const extractCompletion = await callGroqEconomy({
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

      const newData = JSON.parse(extractCompletion.choices[0]?.message?.content || '{}');

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

      // Inject the whisper into the system prompt - use standard tier with fallback
      const completion = await callGroqWithFallback({
        messages: [
          { role: 'system', content: systemPrompt + whisper },
          ...conversationHistory,
          { role: 'user', content: currentInput }
        ],
        temperature: 0.7,
        max_tokens: 150,
      }, 'standard'); // Use standard tier for conversational AI with auto-fallback

      const aiResponse = completion.choices[0]?.message?.content || "Tell me more!";

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
      // Show error to user
      alert('Error analyzing your goal. Please try again or contact support.');
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
      const { roadmap: agentRoadmap, firstTask } = await generateCompleteRoadmap(
        collectedData.goal,
        timelineDays,
        dailyMinutes,
        answers,
        collectedData.category || undefined, // Pass category for resource matching
        collectedData.skillLevel || 'beginner' // Pass skill level for resource matching
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

      // Convert agent task to our format
      const initialTasks = [{
        id: '1',
        title: firstTask.task.title,
        description: firstTask.task.description,
        type: 'practice' as const,
        duration: firstTask.task.estimatedMinutes,
        completed: false,
        skipped: false,
        checkInTime: checkInTime || '07:00',
        scheduledFor: new Date().toISOString().split('T')[0],
        day: 1,
        dayNumber: 1,
        steps: firstTask.task.steps.map(step => step.instruction),
        tips: firstTask.task.tips,
        successCriteria: firstTask.task.successCriteria.primary,
        resources: firstTask.task.resources // Include matched resources
      }];

      // Debug: Log task resources at generation time
      console.log('📦 Generated Task Resources:', {
        taskTitle: firstTask.task.title,
        hasResources: !!firstTask.task.resources,
        primary: firstTask.task.resources?.primary,
        supplementaryCount: firstTask.task.resources?.supplementary?.length || 0,
        fullResources: firstTask.task.resources
      });

      setTasks(initialTasks);

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
      // Fallback to old system
      generateStrategicPlan();
    }
  };

  const generateStrategicPlan = async () => {
    // Prevent multiple calls
    if (isGeneratingPlan) {
      return;
    }

    // NEVER proceed without a category
    if (!collectedData.category) {
      return;
    }

    setIsGeneratingPlan(true);
    setGenerationProgress(0);

    const category = collectedData.category;
    const energyPattern = collectedData.energyPattern as 'morning' | 'afternoon' | 'evening' | 'night';

    // Show typing indicator (removed duplicate loading message)
    setIsTyping(true);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90; // Stop at 90%, complete when API returns
        }
        return prev + 10;
      });
    }, 300);

    try {
      // Calculate duration in months from timeline
      const durationInMonths = collectedData.timeline?.target
        ? calculateDurationInMonths(collectedData.timeline.target)
        : 3;
      const totalWeeks = Math.ceil(durationInMonths * 4); // 4 weeks per month

      // Calculate task durations based on user's daily time commitment
      const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);
      const practiceDuration = Math.round(dailyMinutes * 0.50); // 50% for practice
      const learningDuration = Math.round(dailyMinutes * 0.35); // 35% for learning
      const reflectionDuration = Math.round(dailyMinutes * 0.15); // 15% for reflection

      // Build strategic plan prompt for Groq with science-backed approach
      const planPrompt = `You are a JSON API. Return ONLY valid JSON, no explanations.

SCIENTIFIC FOUNDATION FOR HABIT FORMATION:
- Start TINY (Two-Minute Rule): First weeks should be easy enough that motivation isn't needed
- HABIT STACKING: Attach new habits to existing routines ("After I [anchor], I will [habit]")
- PROGRESSIVE OVERLOAD: Increase difficulty by ~10% per week only after consistency
- CELEBRATION: Include reflection tasks to build positive association
- ENERGY MATCHING: ${collectedData.energyPattern === 'morning' ? 'Front-load challenging tasks' : collectedData.energyPattern === 'evening' ? 'Save intensive work for evening' : 'Distribute tasks throughout day'}

Create a strategic weekly plan for:
- GOAL: "${collectedData.goal}"
- CATEGORY: ${category}
- SKILL LEVEL: ${collectedData.skillLevel}
- TIMELINE: ${durationInMonths} months (${totalWeeks} weeks)
- DAILY TIME: ${dailyMinutes} minutes per day (distribute as: practice ~${practiceDuration}min, learning ~${learningDuration}min, reflection ~${reflectionDuration}min)
- ENERGY PATTERN: ${collectedData.energyPattern || 'flexible'}

IMPORTANT: The user has ${dailyMinutes} minutes per day. Each day's tasks MUST add up to approximately ${dailyMinutes} minutes total.

Return this EXACT JSON structure (no markdown, no code blocks, no explanations):

{
  "totalWeeks": ${totalWeeks},
  "duration": ${durationInMonths},
  "weekTemplates": [
    {
      "weekNumber": 1,
      "focus": "Foundation",
      "description": "Build basic understanding",
      "dailyTasks": [
        {
          "dayOfWeek": 1,
          "practice": {"title": "Specific ${category.toLowerCase()} practice task", "duration": ${practiceDuration}},
          "learning": {"title": "Learn key ${category.toLowerCase()} concept", "duration": ${learningDuration}},
          "reflection": {"title": "Reflect on progress", "duration": ${reflectionDuration}}
        },
        {
          "dayOfWeek": 2,
          "practice": {"title": "Different ${category.toLowerCase()} practice", "duration": ${practiceDuration}},
          "learning": {"title": "Study ${category.toLowerCase()} technique", "duration": ${learningDuration}},
          "reflection": {"title": "Note challenges", "duration": ${reflectionDuration}}
        },
        {
          "dayOfWeek": 3,
          "practice": {"title": "Apply what you learned", "duration": ${practiceDuration}},
          "learning": {"title": "Review ${category.toLowerCase()} basics", "duration": ${learningDuration}},
          "reflection": {"title": "Track improvements", "duration": ${reflectionDuration}}
        },
        {
          "dayOfWeek": 4,
          "practice": {"title": "Increase ${category.toLowerCase()} intensity", "duration": ${practiceDuration}},
          "learning": {"title": "Learn advanced tip", "duration": ${learningDuration}},
          "reflection": {"title": "Plan next steps", "duration": ${reflectionDuration}}
        },
        {
          "dayOfWeek": 5,
          "practice": {"title": "Practice ${category.toLowerCase()} consistently", "duration": ${practiceDuration}},
          "learning": {"title": "Study common mistakes", "duration": ${learningDuration}},
          "reflection": {"title": "Self-assessment", "duration": ${reflectionDuration}}
        },
        {
          "dayOfWeek": 6,
          "practice": {"title": "Light ${category.toLowerCase()} review", "duration": ${practiceDuration}},
          "learning": {"title": "Read ${category.toLowerCase()} tips", "duration": ${learningDuration}},
          "reflection": {"title": "Weekly reflection", "duration": ${reflectionDuration}}
        },
        {
          "dayOfWeek": 7,
          "practice": {"title": "Rest or light activity", "duration": ${Math.round(practiceDuration * 0.5)}},
          "learning": {"title": "Plan week 2", "duration": ${Math.round(learningDuration * 0.5)}},
          "reflection": {"title": "Set weekly goal", "duration": ${reflectionDuration}}
        }
      ]
    }
  ]
}

CRITICAL: Each day's tasks should total approximately ${dailyMinutes} minutes. Use durations around: practice=${practiceDuration}min, learning=${learningDuration}min, reflection=${reflectionDuration}min.

Create ${totalWeeks} week templates with progressive difficulty. Start Week 1 easy for ${collectedData.skillLevel} level. Make all tasks specific to ${category} and the goal "${collectedData.goal}".`;

      const completion = await callGroqWithFallback({
        messages: [{ role: 'user', content: planPrompt }],
        temperature: 0.7,
        max_tokens: 4000,
      }, 'economy'); // Use economy model for fallback strategic plan

      const responseText = completion.choices[0]?.message?.content || '';

      // Parse JSON response
      let strategicPlan;
      try {
        // Remove markdown code blocks if present
        let jsonText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Try to extract JSON if there's extra text around it
        const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }

        strategicPlan = JSON.parse(jsonText);
      } catch {
        // Create a default strategic plan structure on parse failure
        const totalWeeks = Math.ceil(durationInMonths * 4);
        strategicPlan = {
          totalWeeks,
          duration: durationInMonths,
          weekTemplates: Array.from({ length: Math.min(totalWeeks, 12) }, (_, i) => ({
            weekNumber: i + 1,
            focus: i < 3 ? 'Foundation' : i < 6 ? 'Development' : i < 9 ? 'Mastery' : 'Excellence',
            description: i < 3 ? 'Build basic understanding' : i < 6 ? 'Strengthen core skills' : i < 9 ? 'Advanced practice' : 'Peak performance',
            dailyTasks: Array.from({ length: 7 }, (_, d) => ({
              dayOfWeek: d + 1,
              practice: { title: `${category} practice session`, duration: practiceDuration },
              learning: { title: `Learn ${category.toLowerCase()} concepts`, duration: learningDuration },
              reflection: { title: 'Review and reflect', duration: reflectionDuration }
            }))
          }))
        };
      }

      // Update profile and goal
      updateUniversalProfile({
        name: collectedData.name,
        energyPattern,
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
        category,
        specificGoal: collectedData.goal,
      });

      // Create roadmap with AI-generated phases
      const phases = strategicPlan.weekTemplates.slice(0, 4).map((week: { focus: string; description: string }, idx: number) => ({
        title: week.focus,
        weeks: idx === 0 ? '1-' + Math.ceil(strategicPlan.totalWeeks / 4) :
               idx === 1 ? Math.ceil(strategicPlan.totalWeeks / 4 + 1) + '-' + Math.ceil(strategicPlan.totalWeeks / 2) :
               idx === 2 ? Math.ceil(strategicPlan.totalWeeks / 2 + 1) + '-' + Math.ceil(strategicPlan.totalWeeks * 3 / 4) :
               Math.ceil(strategicPlan.totalWeeks * 3 / 4 + 1) + '-' + strategicPlan.totalWeeks,
        description: week.description
      }));

      const roadmap = {
        title: collectedData.goal,
        category,
        duration: strategicPlan.duration,
        dailyTime: collectedData.dailyTime || '30 minutes',
        recommendedTime: energyPattern === 'morning' ? '7:00 AM' :
                        energyPattern === 'evening' ? '7:00 PM' : '2:00 PM',
        phases,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + strategicPlan.duration * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        strategicPlan // Store the full AI plan for later use
      };

      setRoadmap(roadmap);

      // Generate Day 1 tasks from the AI plan
      const initialTasks = generateInitialTasks(roadmap, checkInTime || '07:00');
      setTasks(initialTasks);

      // === SYNC TO BACKEND - DISABLED ===
      // Using Supabase directly instead of separate backend
      /*
      try {
        // Auto-create user with name from conversation
        await getOrCreateUser(collectedData.name);

        // Create journey in backend
        const backendJourney = await createJourney({
          title: collectedData.goal,
          category,
          duration_months: strategicPlan.duration,
          daily_time_minutes: dailyMinutes,
          skill_level: collectedData.skillLevel as 'beginner' | 'intermediate' | 'advanced',
          strategic_plan: strategicPlan,
        });

        // Generate Day 1 tasks in backend
        await generateDayTasks(backendJourney.id, 1, initialTasks.map(t => ({
          title: t.title,
          description: t.description,
          type: t.type,
          duration: t.duration,
        })));

        // Store journey ID for later use
        localStorage.setItem('coheren_journey_id', backendJourney.id);
      } catch {
        // Backend sync failed, but local data is still valid - app works offline
      }
      */
      // === END BACKEND SYNC ===

      // Complete progress bar
      setGenerationProgress(100);
      setIsTyping(false);

      // Wait a moment to show 100% completion, then transition
      setTimeout(() => setStep(2), 800);

    } catch {
      // Handle plan generation error - use fallback
      setIsTyping(false);
      setGenerationProgress(100); // Complete progress bar even on error

      // Fallback to basic roadmap if AI fails
      const fallbackRoadmap = {
        title: collectedData.goal,
        category,
        duration: 3,
        dailyTime: collectedData.dailyTime || '30 minutes',
        recommendedTime: energyPattern === 'morning' ? '7:00 AM' :
                        energyPattern === 'evening' ? '7:00 PM' : '2:00 PM',
        phases: [
          { title: 'Foundation', weeks: '1-4', description: 'Build your base' },
          { title: 'Development', weeks: '5-8', description: 'Strengthen skills' },
          { title: 'Mastery', weeks: '9-10', description: 'Advanced practice' },
          { title: 'Excellence', weeks: '11-12', description: 'Peak performance' },
        ],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      updateUniversalProfile({
        name: collectedData.name,
        energyPattern,
        skillLevel: collectedData.skillLevel || undefined,
        dailyRoutine: {
          wakeTime: collectedData.wakeTime || '7:00 AM',
          sleepTime: '',
          workHours: { start: '', end: '' },
          freeTimeSlots: []
        }
      });

      updateCurrentGoal({ category, specificGoal: collectedData.goal });
      setRoadmap(fallbackRoadmap);

      const initialTasks = generateInitialTasks(fallbackRoadmap, checkInTime || '07:00');
      setTasks(initialTasks);

      // === SYNC FALLBACK TO BACKEND - DISABLED ===
      // Using Supabase directly instead
      /*
      try {
        await getOrCreateUser(collectedData.name);
        const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);

        const backendJourney = await createJourney({
          title: collectedData.goal,
          category,
          duration_months: 3,
          daily_time_minutes: dailyMinutes,
          skill_level: collectedData.skillLevel as 'beginner' | 'intermediate' | 'advanced',
          strategic_plan: fallbackRoadmap,
        });

        await generateDayTasks(backendJourney.id, 1, initialTasks.map(t => ({
          title: t.title,
          description: t.description,
          type: t.type,
          duration: t.duration,
        })));

        localStorage.setItem('coheren_journey_id', backendJourney.id);
      } catch {
        // Backend sync failed for fallback - app works offline
      }
      */
      // === END FALLBACK BACKEND SYNC ===

      setTimeout(() => setStep(2), 800);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
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
          <LoadingAnimation size="large" />

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

      {/* Hero Section with Back Button */}
      <div style={{
        textAlign: 'center',
        padding: `${tokens.spacing['2xl']} ${tokens.spacing.xl} ${tokens.spacing.lg} ${tokens.spacing.xl}`,
        borderBottom: `1px solid ${tokens.colors.gray[200]}`,
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Back Button */}
        <button
          onClick={() => setStep(0)}
          style={{
            position: 'absolute',
            top: tokens.spacing.xl,
            left: tokens.spacing.xl,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: tokens.typography.sizes.xl,
            color: tokens.colors.text.secondary,
            transition: 'all 0.2s',
            padding: tokens.spacing.sm,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs,
            fontWeight: tokens.typography.weights.light
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = tokens.colors.primary;
            e.currentTarget.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = tokens.colors.text.secondary;
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          ← Back
        </button>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}>
          <h1 style={text.display}>Coheren</h1>
          <button
            onClick={() => {
              setStep(0);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginTop: '-80px',
            }}
          >
            <img
              src="/logo.svg"
              alt="Coheren AI Logo"
              style={{
                width: '220px',
                height: 'auto',
                objectFit: 'contain',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                display: 'block'
              }}
              draggable="false"
            />
          </button>
          <p style={{
            ...text.h3,
            color: tokens.colors.text.secondary,
            fontWeight: tokens.typography.weights.light,
            marginTop: '-80px',
          }}>
            Your AI-powered goal coach
          </p>
        </div>
      </div>

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
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          padding: tokens.spacing.xl,
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}>
        <div style={{
          width: '100%',
          maxWidth: '700px',
          display: 'flex',
          flexDirection: 'column',
          gap: tokens.spacing.lg,
        }}>
          {/* Messages - Clean layout without boxes */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing['2xl'],
            paddingBottom: tokens.spacing.xl,
          }}>
            {messages.map((message) => (
              <div key={message.id} style={{
                animation: 'fadeIn 0.4s ease-out',
              }}>
                {message.role === 'ai' && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.sm,
                    marginBottom: tokens.spacing.md,
                  }}>
                    <Sparkles size={16} strokeWidth={1.5} color={tokens.colors.primary} />
                    <span style={{
                      fontSize: tokens.typography.sizes.sm,
                      color: tokens.colors.text.tertiary,
                      fontWeight: tokens.typography.weights.regular,
                    }}>
                      Coheren AI
                    </span>
                  </div>
                )}
                <p style={{
                  fontSize: tokens.typography.sizes.lg,
                  fontWeight: message.role === 'ai' ? tokens.typography.weights.light : tokens.typography.weights.regular,
                  lineHeight: tokens.typography.lineHeights.relaxed,
                  color: tokens.colors.text.primary,
                  margin: 0,
                  paddingLeft: message.role === 'user' ? tokens.spacing.xl : '0',
                }}>
                  {message.content}
                </p>
              </div>
            ))}

            {/* Typing Indicator - Minimal */}
            {isTyping && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.sm,
                  marginBottom: tokens.spacing.md,
                }}>
                  <Sparkles size={16} strokeWidth={1.5} color={tokens.colors.primary} />
                  <span style={{
                    fontSize: tokens.typography.sizes.sm,
                    color: tokens.colors.text.tertiary,
                    fontWeight: tokens.typography.weights.regular,
                  }}>
                    Coheren AI
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: tokens.colors.text.tertiary,
                    borderRadius: '50%',
                    animation: 'pulse 1.4s infinite ease-in-out both',
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: tokens.colors.text.tertiary,
                    borderRadius: '50%',
                    animation: 'pulse 1.4s infinite ease-in-out both 0.2s',
                  }} />
                  <div style={{
                    width: '8px',
                    height: '8px',
                    backgroundColor: tokens.colors.text.tertiary,
                    borderRadius: '50%',
                    animation: 'pulse 1.4s infinite ease-in-out both 0.4s',
                  }} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Clean, minimal */}
          <div style={{
            display: 'flex',
            gap: tokens.spacing.md,
            padding: `${tokens.spacing.lg} 0`,
            alignItems: 'center',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={onboardingPhase !== 'conversation' ? "Generating your plan..." : "Type your message..."}
              disabled={isTyping || onboardingPhase !== 'conversation'}
              autoFocus
              style={{
                flex: 1,
                fontSize: tokens.typography.sizes.lg,
                fontWeight: tokens.typography.weights.light,
                padding: `${tokens.spacing.lg} 0`,
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${tokens.colors.border}`,
                borderRadius: '0',
                color: tokens.colors.text.primary,
                outline: 'none',
                transition: tokens.transitions.all,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderBottomColor = tokens.colors.primary;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderBottomColor = tokens.colors.border;
              }}
            />
            <button
              onClick={handleSend}
              disabled={!userInput.trim() || isTyping || onboardingPhase !== 'conversation'}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.transform = `scale(${tokens.colors.state.hoverScale})`;
                  e.currentTarget.style.backgroundColor = tokens.colors.primaryHover;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.backgroundColor = tokens.colors.primary;
              }}
              style={{
                ...button.primary,
                width: '44px',
                height: '44px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: userInput.trim() ? 1 : 0.5,
                fontSize: '20px',
                fontWeight: 400
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Auth Gate Overlay — shown after roadmap generation for unauthenticated users */}
      {showAuthGate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: tokens.spacing.xl,
        }}>
          {/* Blurred backdrop */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backdropFilter: 'blur(16px)',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
          }} />

          {/* Modal */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            backgroundColor: 'white',
            borderRadius: tokens.borderRadius['2xl'],
            padding: tokens.spacing['3xl'],
            maxWidth: '440px',
            width: '100%',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: tokens.spacing['2xl'] }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: tokens.colors.primary + '15',
                marginBottom: tokens.spacing.lg,
              }}>
                <Sparkles size={24} color={tokens.colors.primary} />
              </div>
              <h2 style={{
                fontSize: tokens.typography.sizes['2xl'],
                fontWeight: tokens.typography.weights.medium,
                color: tokens.colors.text.primary,
                marginBottom: tokens.spacing.sm,
                letterSpacing: '-0.02em',
              }}>
                Your roadmap is ready! 🎉
              </h2>
              <p style={{
                fontSize: tokens.typography.sizes.sm,
                color: tokens.colors.text.secondary,
                lineHeight: 1.6,
              }}>
                {authGateMode === 'signup'
                  ? 'Create a free account to save your personalized plan and start today.'
                  : 'Sign in to your account to access your roadmap.'}
              </p>
            </div>

            {/* Error */}
            {authError && (
              <div style={{
                padding: tokens.spacing.md,
                backgroundColor: '#FEE2E2',
                borderRadius: tokens.borderRadius.md,
                marginBottom: tokens.spacing.lg,
                color: '#991B1B',
                fontSize: tokens.typography.sizes.sm,
              }}>
                {authError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthGateSubmit}>
              {authGateMode === 'signup' && (
                <div style={{ marginBottom: tokens.spacing.md }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <UserPlus size={18} style={{ position: 'absolute', left: '12px', color: tokens.colors.text.tertiary }} />
                    <input
                      type="text"
                      placeholder="Your name"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: `${tokens.spacing.md} ${tokens.spacing.md} ${tokens.spacing.md} 40px`,
                        border: `1.5px solid ${tokens.colors.border}`,
                        borderRadius: tokens.borderRadius.lg,
                        fontSize: tokens.typography.sizes.base,
                        color: tokens.colors.text.primary,
                        outline: 'none',
                        transition: 'border-color 0.2s',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = tokens.colors.border}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginBottom: tokens.spacing.md }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={18} style={{ position: 'absolute', left: '12px', color: tokens.colors.text.tertiary }} />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: `${tokens.spacing.md} ${tokens.spacing.md} ${tokens.spacing.md} 40px`,
                      border: `1.5px solid ${tokens.colors.border}`,
                      borderRadius: tokens.borderRadius.lg,
                      fontSize: tokens.typography.sizes.base,
                      color: tokens.colors.text.primary,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                    onBlur={(e) => e.currentTarget.style.borderColor = tokens.colors.border}
                  />
                </div>
              </div>

              <div style={{ marginBottom: tokens.spacing.xl }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={18} style={{ position: 'absolute', left: '12px', color: tokens.colors.text.tertiary }} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: '100%',
                      padding: `${tokens.spacing.md} ${tokens.spacing.md} ${tokens.spacing.md} 40px`,
                      border: `1.5px solid ${tokens.colors.border}`,
                      borderRadius: tokens.borderRadius.lg,
                      fontSize: tokens.typography.sizes.base,
                      color: tokens.colors.text.primary,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = tokens.colors.primary}
                    onBlur={(e) => e.currentTarget.style.borderColor = tokens.colors.border}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                style={{
                  ...button.primary,
                  width: '100%',
                  padding: tokens.spacing.lg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: tokens.spacing.sm,
                  opacity: authLoading ? 0.7 : 1,
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  marginBottom: tokens.spacing.lg,
                }}
              >
                {authLoading ? 'Saving your roadmap...' : authGateMode === 'signup' ? (
                  <><UserPlus size={18} /> Save My Roadmap</>
                ) : (
                  <><LogIn size={18} /> Sign In & Continue</>
                )}
              </button>
            </form>

            {/* Toggle */}
            <p style={{
              textAlign: 'center',
              fontSize: tokens.typography.sizes.sm,
              color: tokens.colors.text.secondary,
            }}>
              {authGateMode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => { setAuthGateMode(authGateMode === 'signup' ? 'login' : 'signup'); setAuthError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: tokens.colors.primary,
                  fontWeight: tokens.typography.weights.semibold,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {authGateMode === 'signup' ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
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
