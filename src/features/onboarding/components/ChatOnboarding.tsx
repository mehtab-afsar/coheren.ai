import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from '@shared/components/ui/icons';
import { CoherenLoader } from '@shared/components/ui/coheren-loader';
import { DitheringShader } from '@shared/components/ui/dithering-shader';


import { useStore } from '@core/store/useStore';
import { callReasoning, callEconomy, callReasoningStream } from '@lib/ai-router';
import { tokens } from '@core/design-system';
import { detectCategory } from '@shared/utils/categoryDetection';
import { retrieveKnowledge, type UserContext } from '@core/rag';
import type { GoalCategory } from '@types-app/index';


// Import agent system
import { runOnboardingAgents, generateCompleteRoadmap, generateTaskBatch, getCurriculumPreview, getPaceCalibration, buildLegacyAgent3Output, buildClarifications } from '@core/agents';
import type { BuildingStone, StoneAnswer, Agent1Output, DailyTask, CurriculumPreview, PaceCalibration, PaceChoice } from '@core/agents';
import type { AgentRoadmapV2 } from '@core/store/useStore';
import StoneQuestions from '@features/onboarding/components/StoneQuestions';
import AdaptiveInterview from '@features/onboarding/components/AdaptiveInterview';
import { flags } from '@config/feature-flags';
import StoneProfileConfirmation from '@features/onboarding/components/StoneProfileConfirmation';
import CurriculumPreviewComponent from '@features/onboarding/components/CurriculumPreview';
import { syncCompleteRoadmap } from '@lib/database';
import { useAuthGate } from '../hooks/useAuthGate';
import { track } from '@lib/analytics';


// Groq client now imported from groq-client.ts with auto-fallback

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

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

// Calculate realistic timeline based on daily minutes (baseline = 60 min/day)
function calculateRealisticTimeline(typicalTimelineStr: string, dailyMinutes: number): string {
  let typicalMonths = 12;
  const yearRange = typicalTimelineStr.match(/(\d+)[–-](\d+)\s*year/i);
  const monthRange = typicalTimelineStr.match(/(\d+)[–-](\d+)\s*month/i);
  const singleYear = typicalTimelineStr.match(/(\d+)\s*year/i);
  const singleMonth = typicalTimelineStr.match(/(\d+)\s*month/i);

  if (yearRange)       typicalMonths = ((parseInt(yearRange[1]) + parseInt(yearRange[2])) / 2) * 12;
  else if (monthRange) typicalMonths = (parseInt(monthRange[1]) + parseInt(monthRange[2])) / 2;
  else if (singleYear) typicalMonths = parseInt(singleYear[1]) * 12;
  else if (singleMonth) typicalMonths = parseInt(singleMonth[1]);

  const adjusted = Math.round(typicalMonths * 60 / Math.max(dailyMinutes, 10));

  if (adjusted <= 2)  return `about ${adjusted} month${adjusted !== 1 ? 's' : ''}`;
  if (adjusted <= 11) return `around ${adjusted} months`;
  if (adjusted < 24)  return `around ${Math.round(adjusted / 3) * 3} months`;
  const yrs = Math.round(adjusted / 12);
  return `roughly ${yrs} year${yrs !== 1 ? 's' : ''}`;
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

export default function ChatOnboarding({ onLoginSuccess: _onLoginSuccess }: ChatOnboardingProps) {
  // Read initial goal and user from store
  const initialGoal = useStore((state) => state.initialGoal);
  const setInitialGoal = useStore((state) => state.setInitialGoal);
  const storeUser = useStore((state) => state.user);
  const userName = storeUser?.user_metadata?.full_name
    || storeUser?.email?.split('@')[0]
    || '';

  const [messages, setMessages] = useState<Message[]>(() => {
    const greeting = userName
      ? `Hey ${userName} — what are you trying to get better at?`
      : "What are you trying to get better at?";
    const initMessages: Message[] = [
      {
        id: '1',
        role: 'ai',
        content: greeting,
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
  const turnCountRef = useRef(0); // tracks how many user messages have been sent

  // Store actions
  const setStep = useStore((state) => state.setStep);
  const updateUniversalProfile = useStore((state) => state.updateUniversalProfile);
  const updateCurrentGoal = useStore((state) => state.updateCurrentGoal);
  const setRoadmap = useStore((state) => state.setRoadmap);
  const setAgentData = useStore((state) => state.setAgentData);
  const setAgentRoadmapV2 = useStore((state) => state.setAgentRoadmapV2);
  const setTasks = useStore((state) => state.setTasks);
  const checkInTime = useStore((state) => state.checkInTime);

  // Collected data from conversation (name comes from signup — not re-asked)
  const [collectedData, setCollectedData] = useState<{
    goal: string;
    category: GoalCategory | null;
    energyPattern: string;
    wakeTime: string;
    dailyTime: string;
    skillLevel: 'beginner' | 'intermediate' | 'advanced' | '';
    subGoals: string[];
    timeline: string | null;
    behavioralFlags: string[];
    practiceEnvironment: string;
  }>({
    goal: initialGoal || '',
    category: initialGoal ? detectCategory(initialGoal) : null,
    energyPattern: '',
    wakeTime: '',
    dailyTime: '',
    skillLevel: '',
    subGoals: [],
    timeline: null,
    behavioralFlags: [],
    practiceEnvironment: '',
  });

  // Agent system state
  const [onboardingPhase, setOnboardingPhase] = useState<
    'conversation' | 'analyzing' | 'stones' | 'stone_confirmation' | 'generating' | 'curriculum_preview'
  >('conversation');
  const [goalAnalysis, setGoalAnalysis] = useState<Agent1Output | null>(null);
  const [stones, setStones] = useState<BuildingStone[]>([]);
  const [agentError, setAgentError] = useState<{ message: string; retryFn: () => void } | null>(null);

  // Realism check state
  const [realismAcknowledged, setRealismAcknowledged] = useState(false);
  // Agent 1 realism gate — shown when Agent 1 flags goal as Unrealistic
  const [realismGateShown, setRealismGateShown] = useState(false);
  const [cachedStones, setCachedStones] = useState<{ requiredStones: BuildingStone[] } | null>(null);

  // Stone answers + profile state
  const [round1Answers, setRound1Answers] = useState<StoneAnswer[]>([]);
  const [stoneProfile, setStoneProfile] = useState<import('@core/agents').Agent2ProfileOutput | null>(null);
  const [curriculumPreviewData, setCurriculumPreviewData] = useState<CurriculumPreview | null>(null);
  const [_agentRoadmapData, setAgentRoadmapData] = useState<AgentRoadmapV2 | null>(null);
  const [_paceCalibration, setPaceCalibration] = useState<PaceCalibration | null>(null);
  // When user picks too_easy/too_intense, we show a revised preview; this holds the pending choice
  const [revisedPaceChoice, setRevisedPaceChoice] = useState<PaceChoice | null>(null);

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
  } = useAuthGate({ collectedData, setInitialGoal, setStep });

  // Rotating loading messages shown while generating the roadmap
  const LOADING_MESSAGES = [
    'Analysing your answers',
    'Mapping your blockers',
    'Designing your curriculum',
    'Building your weekly structure',
    'Calibrating difficulty curve',
    'Almost there',
  ];
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  useEffect(() => {
    if (!isGeneratingPlan) { setLoadingMsgIndex(0); return; }
    const maxIndex = LOADING_MESSAGES.length - 1;
    const id = setInterval(() => {
      setLoadingMsgIndex(i => Math.min(i + 1, maxIndex));
    }, 4000);
    return () => clearInterval(id);
  }, [isGeneratingPlan, LOADING_MESSAGES.length]);

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

  // In-chat realism validator — catches obviously impossible plans before analysis
  function validateGoalRealism(data: typeof collectedData): { issue: string | null } {
    if (!data.timeline || !data.goal) return { issue: null };

    const months = calculateDurationInMonths(data.timeline);
    const dailyMins = data.dailyTime ? parseDailyTimeToMinutes(data.dailyTime) : 0;
    const isExamGoal = data.category === 'Exam' ||
      /upsc|ias|ips|gre|gmat|cat\b|clat|mcat|bar exam|civil service|lsat|sat\b|act\b|jee|neet|board exam/i.test(data.goal);
    const isLanguageGoal = /fluent|speak.*language|learn.*hindi|learn.*french|learn.*spanish|learn.*japanese|learn.*chinese|learn.*german|language.*fluent/i.test(data.goal);

    if (isExamGoal && months < 3) {
      return {
        issue: `Competitive exams like UPSC/IAS typically need 6–18 months of preparation. A ${data.timeline} timeline means most of the syllabus won't get covered — and burnout is very likely. Would you consider 6 months as a target instead?`
      };
    }
    if (isExamGoal && dailyMins > 0 && dailyMins < 90) {
      return {
        issue: `Most exam toppers study 4–8 hours a day. With ${data.dailyTime}/day it'll be very difficult to cover the full syllabus in time. Can you commit to more study time, or would you like to extend the timeline?`
      };
    }
    if (isLanguageGoal && months < 2) {
      return {
        issue: `Reaching conversational fluency typically takes 3–6 months of consistent practice. What level are you aiming for in ${data.timeline} — basic phrases, everyday conversation, or something else?`
      };
    }
    if (months < 0.5) {
      return {
        issue: `${data.timeline} is a very tight window for this kind of goal. What's the specific outcome you need to hit by then?`
      };
    }
    return { issue: null };
  }

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
    turnCountRef.current += 1;

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
- goal: What they want to achieve (e.g., "learn boxing", "get fit", "prepare for UPSC")
- skillLevel: Their experience level - must be one of: "beginner", "intermediate", or "advanced"
- category: Type of goal - one of: "Fitness", "Learning", "Exam", "Habit", "Creative", "Hobby"
- timeline: (string) When they want to achieve it — return as a plain string (e.g., "3 months", "by December", "6 weeks"). NEVER return an object.
- dailyTime: How much time per day (e.g., "30 minutes", "1 hour", "2 hours")
- energyPattern: Peak energy time - one of: "morning", "afternoon", "evening", "night"
- behavioralFlags: Array of obstacle signals detected. Include any that apply: "past_failure_mentioned" (user references previous failed attempts), "conditional_availability" (availability depends on external factors like "if work allows"), "external_accountability_needed" (user wants a partner, deadline, or accountability), "low_confidence" (user expresses doubt about ability), "time_scarcity" (user emphasizes they have very little time), "perfectionist_tendency" (user wants everything to be perfect before starting), "timeline_accepted" (user explicitly says they understand the timeline is aggressive/unrealistic but want to proceed anyway, or says things like "I know it's short", "proceed anyway", "let's try", "I'm aware"). Return [] if none apply.
- practiceEnvironment: WHERE the user will practice or work on their goal. Extract this from context clues. Use one of: "gym", "home", "office", "outdoor", "online", "studio", "classroom", "multiple" (if they mention both home and gym, say "home+gym"). Return "" if not mentioned.

CRITICAL RULES:
1. Use conversation context to understand what each response refers to
2. If the AI asked "What's your goal?" and user says "boxing", extract goal: "boxing" (NOT name!)
3. If a field is already collected (Current Data shows it), keep it null unless user is correcting it
5. Return ONLY the JSON object, no other text
6. TURN RULE: This is conversation turn ${turnCountRef.current}. ${turnCountRef.current <= 1 ? 'On turn 1, ONLY extract goal, category, and skillLevel if clearly stated. Do NOT extract timeline, dailyTime, or energyPattern — those will be collected via explicit questions.' : 'Extract all fields normally.'}

Current Data Already Collected: ${JSON.stringify(collectedData)}`
          },
          ...extractionHistory,
          { role: 'user', content: currentInput }
        ],
        response_format: { type: "json_object" }
      });

      const newData = JSON.parse(extractRaw || '{}');

      // Clean Merge: compute synchronously so whisper logic uses up-to-date values
      const mergedData = { ...collectedData };
      if (newData.goal) mergedData.goal = newData.goal;
      if (newData.skillLevel) mergedData.skillLevel = newData.skillLevel;
      if (newData.timeline) mergedData.timeline = newData.timeline;
      if (newData.dailyTime) mergedData.dailyTime = newData.dailyTime;
      if (newData.category) mergedData.category = newData.category;
      if (newData.energyPattern) mergedData.energyPattern = newData.energyPattern;
      if (Array.isArray(newData.behavioralFlags) && newData.behavioralFlags.length > 0) {
        const combined = new Set([...mergedData.behavioralFlags, ...newData.behavioralFlags]);
        mergedData.behavioralFlags = Array.from(combined);
      }
      if (newData.practiceEnvironment) mergedData.practiceEnvironment = newData.practiceEnvironment;
      if (!mergedData.category && mergedData.goal) {
        mergedData.category = detectCategory(mergedData.goal);
      }

      // Commit to state
      setCollectedData(mergedData);

      // If Agent 1 realism gate was shown, user is now acknowledging — skip normal flow
      if (realismGateShown && cachedStones && goalAnalysis) {
        const convHistory = messages.map(m => ({
          role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
          content: m.content,
        }));
        const { content: ackResponse = "Got it — let's build the plan around what you can realistically achieve in that window." } = await callReasoning({
          messages: [
            {
              role: 'system',
              content: `You are Coheren. The user just responded to a timeline reality check you raised. Acknowledge their response warmly in 1-2 sentences, validate their decision (whether they're adjusting or pushing forward), and let them know you're now moving on to understand them better.`,
            },
            ...convHistory,
            { role: 'user', content: currentInput },
          ],
          temperature: 0.7,
          max_tokens: 80,
        });
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'ai',
          content: ackResponse,
          timestamp: new Date(),
        }]);
        await new Promise(r => setTimeout(r, 1000));
        setStones(cachedStones.requiredStones.slice(0, 5));
        setIsTyping(false);
        setOnboardingPhase('stones');
        return;
      }

      // Beautiful debug table showing exactly what we have
      console.table({
        'Collected So Far': {
          Goal: mergedData.goal || '❌ missing',
          'Skill Level': mergedData.skillLevel || '❌ missing',
          Timeline: mergedData.timeline || '❌ missing',
          'Daily Time': mergedData.dailyTime || '❌ missing',
          Category: mergedData.category || '❌ missing',
          'Energy Pattern': mergedData.energyPattern || '❌ missing',
          'Behavioral Flags': mergedData.behavioralFlags.length > 0 ? mergedData.behavioralFlags.join(', ') : '(none)'
        }
      });

      // --- STEP 2: THE CONVERSATIONAL RESPONSE ---
      const conversationHistory = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content
      }));

      // Build RAG context for science-backed coaching
      const userContext: UserContext = {
        goal: mergedData.goal || undefined,
        category: mergedData.category || undefined,
        energyPattern: mergedData.energyPattern as UserContext['energyPattern'] || undefined,
        skillLevel: mergedData.skillLevel as UserContext['skillLevel'] || undefined,
      };
      const scientificKnowledge = retrieveKnowledge(userContext, 'new-goal');

      // Create the base system prompt with cleaner coaching style
      const systemPrompt = `You are Coheren, an enthusiastic AI goal coach. Your mission is to help the user define their dream and prepare them for a personalized strategic roadmap.${scientificKnowledge}

---
CORE GOAL:
Guide the user through a warm, natural conversation to understand their:
1. Goal (what they want to achieve)
2. Skill Level (beginner to advanced)
3. Timeline & Daily Time Commitment
4. Energy Patterns (when they are most productive)

COACHING STYLE (Self-Determination Theory):
- AUTONOMY: Offer suggestions, not commands. Use "You might try" instead of "You must."
- COMPETENCE: Celebrate their ambition. If they say "I want to learn Boxing," respond with "That's a powerful skill to build! I love the focus on discipline."
- RELATEDNESS: ${userName ? `Address the user as ${userName}.` : 'Be warm and personal.'} Be a supportive partner, not a robotic script.

CONVERSATION RULES:
- Keep responses SHORT (1-3 sentences). People hate walls of text in chat.
- Ask ONLY ONE question at a time. Do not overwhelm them.
- If they are vague, ask intelligent follow-up questions (e.g., if the goal is "Fitness," ask "Are we looking at weight loss, strength, or maybe a specific sport like Boxing?").
- Use "Habit Stacking" advice: Suggest attaching their new goal to an existing routine.

TRANSITION LOGIC:
Once you feel you have a solid grasp of their goal, timeline, and lifestyle, simply wrap up the thought and tell them you're ready to build the plan.
(Example: "That gives me everything I need${userName ? `, ${userName}` : ''}! I'm putting the pieces together for your roadmap now...")

IMPORTANT:
The system will automatically detect when the data is complete and transition to the next phase. You do not need to use any specific 'magic words' or commands. Just be a helpful coach until the screen changes.`;

      // --- STEP 3: AI WHISPERING (Dynamic Guidance) ---
      // Use mergedData (not stale collectedData) so whisper reflects what was just extracted
      let nextQuestion: string | null = null;
      if (!mergedData.timeline) nextQuestion = 'their target timeline or deadline (e.g. "3 months", "6 weeks", "by December")';
      else if (!mergedData.dailyTime) nextQuestion = 'how much time per day they can commit (e.g. "30 minutes", "1 hour")';
      else if (!mergedData.skillLevel) nextQuestion = 'their current experience level (beginner / intermediate / advanced)';

      // Create the "Whisper"
      let whisper: string;
      if (nextQuestion) {
        whisper = `\n\n(SYSTEM WHISPER: Your ONLY job in this reply is to ask specifically about: ${nextQuestion}. Ask it as a single warm question. Do NOT wrap up or say the plan is ready yet.)`;
      } else {
        // All fields collected — run realism check before declaring ready
        const realism = validateGoalRealism(mergedData);
        if (realism.issue && !realismAcknowledged) {
          whisper = `\n\n(SYSTEM WHISPER: Before saying the plan is ready, you MUST gently push back on this concern: "${realism.issue}" Raise it warmly, explain the risk, and ask if they want to adjust OR confirm they want to proceed. Do NOT start generating the plan yet.)`;
        } else {
          whisper = `\n\n(SYSTEM WHISPER: You have all the data! Wrap up the conversation warmly and let them know the plan is ready.)`;
        }
      }

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
      return;
    }

    // Guard: prevent re-trigger while analysis is running
    setIsGeneratingPlan(true);
    setIsTyping(true);

    try {
      const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);
      const durationInMonths = collectedData.timeline
        ? calculateDurationInMonths(collectedData.timeline)
        : 3;
      const timelineDays = durationInMonths * 30;

      // ── Parallel streaming coach voice ──
      // Streams a 2-3 sentence acknowledgement while Agent 1+2 run concurrently.
      const streamMsgId = `stream-${Date.now()}`;
      setMessages(prev => [...prev, { id: streamMsgId, role: 'ai', content: '', timestamp: new Date() }]);
      const streamCoachVoice = async () => {
        try {
          for await (const token of callReasoningStream({
            messages: [
              { role: 'system', content: "You are Coheren. In 2-3 sentences, acknowledge the user's goal and name one key challenge they'll likely face. Be direct, use 'you' language, no lists." },
              { role: 'user', content: `Goal: "${collectedData.goal}"` },
            ],
            temperature: 0.7,
            max_tokens: 120,
          })) {
            setMessages(prev => prev.map(m =>
              m.id === streamMsgId ? { ...m, content: m.content + token } : m
            ));
          }
        } catch { /* suppress — UX only */ }
      };

      // Run Agent 1 & 2 — pass everything from chat so Agent 2 won't re-ask it
      const [agentsResult] = await Promise.all([
        withTimeout(
          runOnboardingAgents(
            collectedData.goal,
            timelineDays,
            dailyMinutes,
            collectedData.behavioralFlags,
            {
              skillLevel: collectedData.skillLevel || undefined,
              energyPattern: collectedData.energyPattern || undefined,
              category: collectedData.category || undefined,
              practiceEnvironment: collectedData.practiceEnvironment || undefined,
            }
          ),
          30_000,
          'Goal analysis'
        ),
        streamCoachVoice(),
      ]);
      // Remove streaming message if nothing was produced
      setMessages(prev => prev.filter(m => m.id !== streamMsgId || m.content.length > 0));

      const { goalAnalysis: analysis, stones: identifiedStones } = agentsResult;
      setGoalAnalysis(analysis);

      // Check if Agent 1 flagged the goal as unrealistic — surface specific data to user
      const ag = analysis.goalAnalysis;
      const isAgentUnrealistic =
        ag.realismChecks.timeRealism === 'Unrealistic' ||
        ag.realismChecks.effortRealism === 'Unrealistic';

      if (isAgentUnrealistic && !realismGateShown) {
        // Cache stones so we don't re-run the LLM after user acknowledges
        setCachedStones(identifiedStones);

        // Build a specific, data-backed realism message using Agent 1's analysis
        const clarifications = buildClarifications(analysis);
        const rc = clarifications.realityCheck;
        const durationInMonths = collectedData.timeline
          ? calculateDurationInMonths(collectedData.timeline)
          : 3;

        if (rc) {
          // Prefer the deterministic feasibility anchor (real hours math) over the
          // LLM's soft "typical timeline" string when it's available.
          const fa = ag.feasibility;
          let realisticTime: string;
          if (fa && fa.requiredHours > 0) {
            const daysNeeded = (fa.requiredHours * 60) / Math.max(dailyMinutes, 10);
            const monthsNeeded = Math.max(1, Math.round(daysNeeded / 30));
            realisticTime = monthsNeeded <= 11
              ? `around ${monthsNeeded} month${monthsNeeded !== 1 ? 's' : ''}`
              : `roughly ${Math.round(monthsNeeded / 12)} year${Math.round(monthsNeeded / 12) !== 1 ? 's' : ''}`;
          } else {
            realisticTime = calculateRealisticTimeline(rc.typicalTimeline, dailyMinutes);
          }

          const msg1 = `One thing I want to flag before we build your plan — ${rc.headline.toLowerCase()}.`;
          const msg2 = fa
            ? `At ${dailyMinutes} min/day you'll have about **${fa.availableHours} hours** before your deadline. ${fa.skillLabel.charAt(0).toUpperCase() + fa.skillLabel.slice(1)} usually needs ~${fa.requiredHours}h for basic competence — so a realistic timeline here is **${realisticTime}**.`
            : `At ${dailyMinutes} min/day, ${ag.category} goals like this typically take **${realisticTime}**. You're targeting ${durationInMonths} month${durationInMonths !== 1 ? 's' : ''}.`;
          const msg3 = fa?.rescopedGoalSuggestion
            ? `We can aim at a sharper first target — ${fa.rescopedGoalSuggestion} — and expand from there, or push forward as an intensive sprint knowing the bar is high. What feels right?`
            : `You can adjust to a more realistic timeline, or push forward as an intensive sprint knowing the bar is high. What feels right to you?`;

          setMessages(prev => [...prev, { id: `realism-1-${Date.now()}`, role: 'ai', content: msg1, timestamp: new Date() }]);
          await new Promise(r => setTimeout(r, 700));
          setMessages(prev => [...prev, { id: `realism-2-${Date.now()}`, role: 'ai', content: msg2, timestamp: new Date() }]);
          await new Promise(r => setTimeout(r, 600));
          setMessages(prev => [...prev, { id: `realism-3-${Date.now()}`, role: 'ai', content: msg3, timestamp: new Date() }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'ai',
            content: `I want to flag that this goal typically needs more time than you've planned. Would you like to adjust your timeline, or push forward as-is?`,
            timestamp: new Date(),
          }]);
        }

        setRealismGateShown(true);
        setIsGeneratingPlan(false);
        setIsTyping(false);
        setOnboardingPhase('conversation');
        return; // Wait for user to acknowledge before going to stones
      }

      // Brief delay for the analyzing transition to be visible
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Go straight to stone questions
      setStones(identifiedStones.requiredStones.slice(0, 5));
      setOnboardingPhase('stones');
      setIsTyping(false);
      setIsGeneratingPlan(false);

    } catch (error) {
      console.error('❌ Error running onboarding agents:', error);
      setIsTyping(false);
      setIsGeneratingPlan(false);
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

  // Sync realismAcknowledged from behavioral flags (user said "proceed anyway")
  useEffect(() => {
    if (collectedData.behavioralFlags.includes('timeline_accepted')) {
      setRealismAcknowledged(true);
    }
  }, [collectedData.behavioralFlags]);

  // The "Bulletproof" Trigger (No setTimeout) - State-Driven
  // Placed here (after runAnalysisAndGetStones) to satisfy react-hooks/immutability rule
  useEffect(() => {
    // If Agent 1 realism gate was shown, handleSend handles the transition — don't re-trigger
    if (realismGateShown) return;

    const isReady = !!(
      collectedData.goal &&
      collectedData.skillLevel &&
      collectedData.dailyTime &&
      collectedData.timeline
    );

    // Block trigger if local heuristic catches obviously unrealistic goals before Agent 1 runs
    const realism = validateGoalRealism(collectedData);
    const needsRealismAck = realism.issue !== null && !realismAcknowledged;

    if (isReady && !needsRealismAck && onboardingPhase === 'conversation' && !isGeneratingPlan) {
      setOnboardingPhase('analyzing');
      runAnalysisAndGetStones();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectedData, onboardingPhase, isGeneratingPlan, realismAcknowledged, realismGateShown]);

  // Stone questions complete → extract profile directly → show confirmation
  const handleStoneQuestionsComplete = async (answers: StoneAnswer[]) => {
    setRound1Answers(answers);

    if (!goalAnalysis) {
      setOnboardingPhase('generating');
      generateStrategicPlanWithAgents(answers);
      return;
    }

    try {
      const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);
      const timelineDays = (collectedData.timeline ? calculateDurationInMonths(collectedData.timeline) : 3) * 30;
      const { extractStones } = await import('@core/agents');
      const profile = await extractStones(
        { userId: 'temp', goal: collectedData.goal, timeline: timelineDays, dailyTimeAvailable: dailyMinutes },
        goalAnalysis,
        answers
      );
      setStoneProfile(profile);
      setOnboardingPhase('stone_confirmation');
    } catch {
      setOnboardingPhase('generating');
      generateStrategicPlanWithAgents(answers);
    }
  };

  // Adaptive interview complete → extract profile with linguistic + readiness enrichment
  const handleAdaptiveInterviewComplete = async (
    answers: StoneAnswer[],
    rawTexts: string[],
    readinessProfile?: { importance: number; selfEfficacy: number }
  ) => {
    setRound1Answers(answers);

    if (!goalAnalysis) {
      setOnboardingPhase('generating');
      generateStrategicPlanWithAgents(answers);
      return;
    }

    try {
      const dailyMinutes = parseDailyTimeToMinutes(collectedData.dailyTime);
      const timelineDays = (collectedData.timeline ? calculateDurationInMonths(collectedData.timeline) : 3) * 30;
      const { extractStones } = await import('@core/agents');
      const profile = await extractStones(
        { userId: 'temp', goal: collectedData.goal, timeline: timelineDays, dailyTimeAvailable: dailyMinutes },
        goalAnalysis,
        answers,
        { answerTexts: rawTexts, readinessProfile }
      );
      setStoneProfile(profile);
      setOnboardingPhase('stone_confirmation');
    } catch {
      setOnboardingPhase('generating');
      generateStrategicPlanWithAgents(answers);
    }
  };

  // User confirmed stone profile → proceed to curriculum generation + preview
  const handleStoneProfileConfirmed = () => {
    const allAnswers = round1Answers; // profile already extracted
    setOnboardingPhase('generating');
    generateStrategicPlanWithAgents(allAnswers, stoneProfile ?? undefined);
  };

  // User said stone profile doesn't fit → proceed with raw answers (feedback logged)
  const handleStoneProfileDoesntFit = (_feedback?: string) => {
    setOnboardingPhase('generating');
    generateStrategicPlanWithAgents(round1Answers);
  };

  // User selected pace on preview screen
  const handlePaceSelect = async (choice: PaceChoice, _feedback?: string) => {
    const calibration = getPaceCalibration(choice);
    setPaceCalibration(calibration);

    const pending = (window as unknown as Record<string, unknown>).__pendingOnboarding as {
      agentRoadmap: AgentRoadmapV2;
      firstTask: DailyTask;
      stoneProfile: import('@core/agents').Agent2ProfileOutput;
      dailyMinutes: number;
      durationInMonths: number;
      answers: StoneAnswer[];
    } | undefined;

    if (!pending) {
      const currentUser = useStore.getState().user;
      if (currentUser) {
        setStep(2);
      } else {
        setShowAuthGate(true);
      }
      return;
    }

    const { agentRoadmap, firstTask, stoneProfile: sp, dailyMinutes, durationInMonths } = pending;

    // For too_easy / too_intense: show a revised preview before finalising
    if (choice !== 'just_right' && revisedPaceChoice !== choice) {
      const revisedMinutes = Math.round(dailyMinutes * calibration.difficultyMultiplier);
      const newPreview = getCurriculumPreview(agentRoadmap, collectedData.category || collectedData.goal, revisedMinutes);
      setCurriculumPreviewData(newPreview);
      setRevisedPaceChoice(choice);
      return; // stay on preview screen, CurriculumPreview will show confirm button
    }

    // Build legacy Agent3Output for Agent 4 / DB sync (still uses old format)
    const legacyRoadmap = buildLegacyAgent3Output(agentRoadmap);

    // Convert agent roadmap to our existing UI format using the V2 months structure
    const roadmap = {
      title: collectedData.goal,
      category: collectedData.category!,
      duration: durationInMonths,
      dailyTime: collectedData.dailyTime || '30 minutes',
      recommendedTime: collectedData.energyPattern === 'morning' ? '7:00 AM' :
                      collectedData.energyPattern === 'evening' ? '7:00 PM' : '2:00 PM',
      phases: agentRoadmap.months.map(month => ({
        title: month.title,
        weeks: `${month.startWeek}-${month.endWeek}`,
        description: month.primaryGoals.join('. ')
      })),
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().getTime() + durationInMonths * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      // Embed calibration note for Agent 4 to read
      paceCalibrationNote: calibration.note,
      difficultyMultiplier: calibration.difficultyMultiplier,
    };

    updateUniversalProfile({
      name: userName,
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
    setAgentData(legacyRoadmap, sp);    // legacy format for Agent 4
    setAgentRoadmapV2(agentRoadmap);    // V2 for Journey/Library views

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
      segments: agentTask.task.segments ?? [],
      steps: agentTask.task.steps.map(step => step.instruction),
      tips: agentTask.task.tips,
      successCriteria: agentTask.task.successCriteria.primary,
      coachTips: agentTask.task.coachTips ?? [],
      requiresPrep: agentTask.task.requiresPrep,
      // Carry the study resources so the video shows on Day 1 before any reload.
      resources: agentTask.task.resources,
    });

    const initialTasks = [toStoreTask(firstTask, 1)];
    setTasks(initialTasks);

    // Generate days 2-7 in background with calibration applied
    generateTaskBatch(2, 7, legacyRoadmap, sp, dailyMinutes, collectedData.category || undefined, collectedData.skillLevel || 'beginner')
      .then((batchTasks: DailyTask[]) => {
        const extraTasks = batchTasks.map((t: DailyTask, i: number) => toStoreTask(t, i + 2));
        const allTasks = [...initialTasks, ...extraTasks];
        setTasks(allTasks);
        const u = useStore.getState().user;
        if (u) {
          syncCompleteRoadmap(u.id, collectedData.goal, `Generated via AI for ${collectedData.category}`, goalAnalysis!, pending.answers, legacyRoadmap, allTasks, sp)
            .catch(() => { /* non-critical */ });
        } else {
          // Value-first funnel: user hasn't signed up yet — update pending sync with full task list
          setPendingSyncData(prev => prev ? { ...prev, initialTasksData: allTasks } : prev);
        }
      })
      .catch(() => { /* non-critical */ });

    track({ event: 'onboarding_completed', properties: { goal_category: collectedData.category ?? undefined } });
    delete (window as unknown as Record<string, unknown>).__pendingOnboarding;

    // If user is already authenticated, go straight to dashboard.
    // If not (value-first funnel), show auth gate — handleAuthGateSubmit will call setStep(2)
    // after setting the user in the store, preventing the step=2 && !user white screen.
    const currentUser = useStore.getState().user;
    if (currentUser) {
      setStep(2);
    } else {
      setPendingSyncData({
        goalAnalysisData: goalAnalysis!,
        answers: pending.answers,
        agentRoadmap: legacyRoadmap,
        initialTasksData: initialTasks,
        stoneProfile: sp,
      });
      setShowAuthGate(true);
    }
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
    const durationInMonths = collectedData.timeline
      ? calculateDurationInMonths(collectedData.timeline)
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
      const { roadmap: agentRoadmap, firstTask, stoneProfile } = await withTimeout(
        generateCompleteRoadmap(
          collectedData.goal,
          timelineDays,
          dailyMinutes,
          answers,
          collectedData.category || undefined,
          collectedData.skillLevel || 'beginner',
          collectedData.behavioralFlags,
          preComputedStoneProfile,
          undefined,
          undefined,
          collectedData.practiceEnvironment || undefined,
          goalAnalysis || undefined, // reuse Agent 1 output — don't re-run it
        ),
        30_000,
        'Curriculum generation'
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
      (window as unknown as Record<string, unknown>).__pendingOnboarding = {
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



  // Render AI message content: split paragraphs on \n\n, render **bold**, single \n as space
  const renderMessageContent = (content: string) => {
    const paragraphs = content.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    return (
      <div className="flex flex-col gap-3">
        {paragraphs.map((para, pi) => {
          // Split on **bold** markers
          const parts = para.split(/\*\*([^*]+)\*\*/g);
          return (
            <p key={pi} className="text-[1.05rem] font-normal leading-[1.8] text-zinc-900 m-0">
              {parts.map((part, idx) =>
                idx % 2 === 1
                  ? <strong key={idx} className="font-semibold text-zinc-900">{part}</strong>
                  : part.replace(/\n/g, ' ')
              )}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#ffffff',
      position: 'relative',
      overflow: 'hidden'
    }}>

      {/* Loading Overlay - shown during plan generation */}
      {isGeneratingPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#fff',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
        }}>
          <CoherenLoader size={48} color="#18181b" />

          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: 15,
              fontWeight: 400,
              color: '#18181b',
              margin: '0 0 6px',
              letterSpacing: '-0.01em',
            }}>
              Building your roadmap
            </p>
            <p style={{ fontSize: 13, color: '#a1a1aa', margin: 0, transition: 'opacity 0.4s' }}>
              {LOADING_MESSAGES[loadingMsgIndex]}
            </p>
          </div>

          <div style={{
            width: '200px',
            height: '2px',
            backgroundColor: '#f4f4f5',
            borderRadius: 99,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${generationProgress}%`,
              backgroundColor: '#18181b',
              transition: 'width 0.5s ease',
            }} />
          </div>
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
          <Icons.logo style={{ width: '18px', height: '18px', color: '#18181b' }} />
          <span style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#18181b',
            letterSpacing: '-0.02em',
          }}>
            coheren
          </span>
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
            <CoherenLoader size={40} color="#18181b" />
            <p style={{ fontSize: 14, color: '#71717a', margin: 0, letterSpacing: '-0.01em' }}>
              Analyzing your responses…
            </p>
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
                A few quick questions
              </h2>
              <p style={{
                fontSize: tokens.typography.sizes.base,
                color: tokens.colors.text.secondary,
                lineHeight: 1.6
              }}>
                Your answers shape how the roadmap is built
              </p>
            </div>
            {flags.USE_ADAPTIVE_INTERVIEW ? (
              <AdaptiveInterview
                onComplete={handleAdaptiveInterviewComplete}
              />
            ) : (
              <StoneQuestions
                stones={stones}
                onComplete={handleStoneQuestionsComplete}
              />
            )}
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
            onDoesntFit={(feedback) => handleStoneProfileDoesntFit(feedback)}
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
            revisedChoice={revisedPaceChoice}
          />
        </div>
      )}

      {/* Chat Container */}
      {onboardingPhase === 'conversation' && (
        <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">
          <div className="w-full flex flex-col h-full">

            {/* Messages scroll area */}
            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="max-w-2xl mx-auto px-6 pt-12 pb-28 flex flex-col gap-1">
                {messages.map((message, i) => (
                  <div
                    key={message.id}
                    className={`animate-[fadeIn_0.3s_ease-out] ${message.role === 'user' ? 'flex justify-end mt-3' : 'flex mt-6'}`}
                  >
                    {message.role === 'ai' ? (
                      <div style={{ maxWidth: '88%' }}>
                        {/* small label on first AI message only */}
                        {i === 0 && (
                          <p className="text-[11px] font-medium text-zinc-400 mb-2 tracking-wider uppercase">
                            coheren
                          </p>
                        )}
                        {renderMessageContent(message.content)}
                      </div>
                    ) : (
                      <div className="bg-zinc-100 text-zinc-800 rounded-2xl rounded-br-sm px-4 py-2.5 text-[0.9rem] leading-relaxed max-w-[78%]">
                        {message.content}
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex mt-6">
                    <div className="flex items-center gap-1.5 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" style={{ animation: 'pulse 1.4s infinite ease-in-out both' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" style={{ animation: 'pulse 1.4s infinite ease-in-out both 0.2s' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" style={{ animation: 'pulse 1.4s infinite ease-in-out both 0.4s' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input area — floating */}
            <div className="fixed bottom-0 left-0 right-0 flex justify-center px-5" style={{ zIndex: 50, paddingBottom: 'max(20px, env(safe-area-inset-bottom))', background: 'linear-gradient(to top, #fff 70%, transparent)' }}>
              {isTyping || onboardingPhase !== 'conversation' ? (
                <div className="w-full max-w-xl mx-auto flex items-center px-4 h-11 rounded-xl bg-zinc-50 border border-zinc-100 mb-1">
                  <span className="text-sm text-zinc-400">
                    {onboardingPhase !== 'conversation' ? 'Building your plan…' : ''}
                  </span>
                </div>
              ) : (
                <div className="w-full max-w-xl mx-auto flex items-center gap-2 bg-white border border-zinc-200 rounded-xl px-4 h-11 shadow-[0_2px_12px_rgba(0,0,0,0.06)] focus-within:border-zinc-400 transition-colors mb-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    placeholder="Reply…"
                    autoFocus
                    className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-800 placeholder:text-zinc-400"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!userInput.trim()}
                    className="flex-shrink-0 w-6 h-6 rounded-lg bg-zinc-900 disabled:bg-zinc-200 flex items-center justify-center transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                background: 'linear-gradient(135deg, #C4552D, #A8451F)',
                boxShadow: '0 2px 10px rgba(196, 85, 45, 0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#F5E4DA',
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
                  colorFront="#7A2E14"
                  pxSize={2}
                  speed={0.9}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                />
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  boxShadow: 'inset 0 0 0 1px rgba(221, 161, 137, 0.15)',
                  background: 'radial-gradient(circle at 68% 28%, rgba(221, 161, 137, 0.08) 0%, transparent 60%)',
                }} />
              </div>
              <div style={{
                position: 'absolute',
                width: 480, height: 140, borderRadius: '50%',
                background: 'radial-gradient(ellipse, rgba(196, 85, 45, 0.18) 0%, transparent 70%)',
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
                {/* Honest value props — no fabricated usage metrics. */}
                {[['Science-backed', 'Behavioral research'], ['One task', 'A day'], ['Free', 'To start']].map(([val, lbl]) => (
                  <div key={lbl} style={{ textAlign: 'center' }}>
                    <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: 500, letterSpacing: '-0.03em', margin: 0 }}>{val}</p>
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
                      background: authLoading ? '#F9EDE6' : 'linear-gradient(135deg, #C4552D 0%, #A8451F 100%)',
                      color: authLoading ? '#A8451F' : '#fff',
                      boxShadow: authLoading ? 'none' : '0 4px 18px rgba(196, 85, 45, 0.35)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!authLoading) { e.currentTarget.style.boxShadow = '0 6px 24px rgba(196, 85, 45, 0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = authLoading ? 'none' : '0 4px 18px rgba(196, 85, 45, 0.35)'; e.currentTarget.style.transform = 'none'; }}
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
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#C4552D', padding: 0 }}
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
  el.style.borderColor = '#C4552D';
  el.style.background = '#fff';
  el.style.boxShadow = '0 0 0 3px rgba(196, 85, 45, 0.08)';
}

function applyAuthGateBlur(el: HTMLInputElement) {
  el.style.borderColor = '#e5e7eb';
  el.style.background = '#fafafa';
  el.style.boxShadow = 'none';
}
