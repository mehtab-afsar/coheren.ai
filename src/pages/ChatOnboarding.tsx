import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import Groq from 'groq-sdk';
import { useStore } from '../store/useStore';
import { tokens, text, button, input as inputStyles } from '../design-system';
import { generateInitialTasks } from '../utils/taskGenerator';
import { detectCategory } from '../utils/categoryDetection';
import { retrieveKnowledge, type UserContext } from '../rag';
import { getOrCreateUser, createJourney, generateDayTasks } from '../api/client';
import type { GoalCategory } from '../types';

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

// Helper function to parse daily time commitment to minutes
function parseDailyTimeToMinutes(dailyTime: string): number {
  if (!dailyTime) return 30; // Default 30 minutes

  const lower = dailyTime.toLowerCase();

  // Match patterns like "2 hr", "2 hours", "120 min", "120 minutes", "1.5 hours"
  const hourMatch = lower.match(/(\d+\.?\d*)\s*(hour|hr)s?/);
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1]);
    console.log(`⏰ Parsed daily time: ${dailyTime} = ${hours * 60} minutes`);
    return Math.round(hours * 60);
  }

  const minMatch = lower.match(/(\d+)\s*(minute|min)s?/);
  if (minMatch) {
    const minutes = parseInt(minMatch[1]);
    console.log(`⏰ Parsed daily time: ${dailyTime} = ${minutes} minutes`);
    return minutes;
  }

  // Just a number - assume minutes
  const justNumber = dailyTime.match(/^(\d+)$/);
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
    console.log(`📅 Calculated duration: ${targetYear} is ${monthsFromYears} months from now`);
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

export default function ChatOnboarding() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'ai',
      content: "Hey there! 👋 I'm Coheren, your AI goal coach. I'm here to help turn your dreams into reality with a personalized action plan. What would you like to achieve?",
      timestamp: new Date(),
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [planGenerationTriggered, setPlanGenerationTriggered] = useState(false);
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
    goal: '',
    category: null,
    name: '',
    energyPattern: '',
    wakeTime: '',
    dailyTime: '',
    skillLevel: '',
    subGoals: [],
    timeline: null
  });

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
    if (!planGenerationTriggered && !isGeneratingPlan) {
      inputRef.current?.focus();
    }
  }, [planGenerationTriggered, isGeneratingPlan]);

  // Watch for all required data being collected and AI mentioning plan
  const [aiMentionedPlan, setAiMentionedPlan] = useState(false);

  useEffect(() => {
    // Check if we have ALL required data
    const hasAllData = !!(
      collectedData.goal &&
      collectedData.category &&
      collectedData.name &&
      collectedData.skillLevel &&
      collectedData.timeline
    );

    console.log('📊 Data check in useEffect:', {
      hasAllData,
      aiMentionedPlan,
      isGeneratingPlan,
      planGenerationTriggered,
      data: {
        goal: !!collectedData.goal,
        category: !!collectedData.category,
        name: !!collectedData.name,
        skillLevel: !!collectedData.skillLevel,
        timeline: !!collectedData.timeline,
      }
    });

    // Trigger plan generation if all conditions met
    if (hasAllData && aiMentionedPlan && !isGeneratingPlan && !planGenerationTriggered) {
      console.log('✅ All conditions met! Triggering plan generation from useEffect...');
      setPlanGenerationTriggered(true);
      setTimeout(() => {
        generateStrategicPlan();
      }, 1000);
    }
  }, [collectedData, aiMentionedPlan, isGeneratingPlan, planGenerationTriggered]);

  const handleSend = async () => {
    if (!userInput.trim()) return;

    // If plan generation is triggered, immediately call generateStrategicPlan instead of continuing chat
    if (planGenerationTriggered) {
      setUserInput(''); // Clear input
      generateStrategicPlan();
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
      // Extract data from user input
      extractDataFromInput(currentInput);

      // Build conversation for Groq
      const conversationHistory = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' as const : 'user' as const,
        content: m.content
      }));

      // Build category-specific context
      const categoryContext = collectedData.category
        ? `
DETECTED CATEGORY: ${collectedData.category}

Category-specific guidance:
${collectedData.category === 'Fitness' ? '- Ask about current fitness level, specific sport/activity, injuries/limitations, training location' :
  collectedData.category === 'Learning' ? '- Ask about why they want to learn this, prior experience, target proficiency level, specific subject/language' :
  collectedData.category === 'Exam' ? '- Ask about exam date, previous attempts, realistic study hours per day' :
  collectedData.category === 'Habit' ? '- Ask about previous attempts, specific target frequency/duration, obstacles they face' :
  collectedData.category === 'Hobby' ? '- Ask about beginner/experienced, available equipment/tools, goal (fun vs mastery)' :
  collectedData.category === 'Creative' ? '- Ask about specific project, completion timeline, prior creative experience' :
  '- Ask contextual follow-up questions based on their goal'}
`
        : '';

      // Build RAG context for science-backed coaching
      const userContext: UserContext = {
        goal: collectedData.goal || undefined,
        category: collectedData.category || undefined,
        energyPattern: collectedData.energyPattern as UserContext['energyPattern'] || undefined,
        skillLevel: collectedData.skillLevel as UserContext['skillLevel'] || undefined,
      };
      const scientificKnowledge = retrieveKnowledge(userContext, 'new-goal');

      const systemPrompt = `You are Coheren, an enthusiastic AI goal coach who genuinely cares about helping people achieve their dreams. You're supportive, motivating, and conversational.

${scientificKnowledge}

---

${collectedData.goal ? `\nUser's goal: "${collectedData.goal}"` : '\nSTART by asking: "What would you like to achieve?" if they greet you or say something casual.'}
${categoryContext}

Your task: Extract these details through natural, engaging conversation:
1. Their goal (what they want to achieve) - MUST be substantive, not just "hey" or "hello"
2. Skill level (beginner / intermediate / advanced)
3. Specific sub-goals or focus areas
4. Timeline and milestones (when they want to achieve it, intermediate checkpoints)
5. Their name
6. Energy pattern (morning / afternoon / evening / night)
7. Daily time commitment

What we have so far:
- Goal: ${collectedData.goal || 'not yet'}
- Category: ${collectedData.category || 'not detected yet'}
- Skill level: ${collectedData.skillLevel || 'not yet'}
- Sub-goals: ${collectedData.subGoals.length > 0 ? collectedData.subGoals.join(', ') : 'not yet'}
- Timeline: ${collectedData.timeline ? collectedData.timeline.target : 'not yet'}
- Milestones: ${collectedData.timeline?.milestones.length ? collectedData.timeline.milestones.join('; ') : 'not yet'}
- Name: ${collectedData.name || 'not yet'}
- Energy: ${collectedData.energyPattern || 'not yet'}
- Daily time: ${collectedData.dailyTime || 'not yet'}

PERSONALITY & TONE (Based on Self-Determination Theory):
- Support AUTONOMY: Give choices, avoid controlling language ("you must"), say "you might consider"
- Build COMPETENCE: Celebrate progress, start achievable, express confidence in them
- Foster RELATEDNESS: Be warm, show genuine care, use their name
- Be enthusiastic (use phrases like "That's awesome!", "Love it!", "I'm excited for you!")
- Mirror their communication style - if they're casual, be casual; if formal, be professional

SCIENCE-BACKED COACHING TIPS:
- For beginners: Mention the "Two-Minute Rule" - start so small you can't fail
- For timelines: Habits take ~66 days on average to form, set realistic expectations
- For energy patterns: Match challenging tasks to peak energy times
- Use "habit stacking": "After [existing habit], you'll [new habit]"

CONVERSATION RULES:
- Keep responses SHORT (1-2 sentences max, sometimes just a quick question)
- If user greets you without stating a goal, ask "What would you like to achieve?"
- React positively to their answers ("Nice!", "That's a great goal!", "I love your ambition!")
- Ask intelligent, category-specific follow-up questions ONLY after you know the category
- Only ask about ONE missing piece of information at a time
- Build on their previous answers naturally
- When you have ALL details (goal with category, skill level, sub-goals, timeline, name, energy, daily time), say exactly: "Perfect! Let me create your personalized strategic plan now..." then STOP - do not continue the conversation
- Don't repeat yourself or ask the same question twice

CRITICAL: When you say "Perfect! Let me create your personalized strategic plan now..." you MUST STOP immediately. Do NOT add any other text, explanation, or continuation after that exact phrase.`;


      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: currentInput }
        ],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 150,
      });

      const aiResponse = completion.choices[0]?.message?.content || "Tell me more!";
      console.log('🤖 AI Response:', aiResponse);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);

      // Check if AI says plan is ready - the useEffect will handle triggering when data is ready
      const hasPersonalized = aiResponse.toLowerCase().includes('personalized');
      const hasPlan = aiResponse.toLowerCase().includes('plan') || aiResponse.toLowerCase().includes('strategic');

      console.log('🔍 Plan trigger check:', {
        hasPersonalized,
        hasPlan,
        shouldTrigger: hasPersonalized && hasPlan,
      });

      if (hasPersonalized && hasPlan) {
        console.log('✅ AI mentioned creating personalized plan! Setting aiMentionedPlan flag...');
        setAiMentionedPlan(true);

        // Direct trigger with delay to allow state to settle
        setTimeout(() => {
          console.log('⏰ Delayed plan trigger - checking if we should generate...');
          // Access latest state via functional update pattern
          setPlanGenerationTriggered(prev => {
            if (!prev) {
              console.log('🚀 Triggering plan generation directly from AI response handler!');
              generateStrategicPlan();
              return true;
            }
            return prev;
          });
        }, 1500);
      }

    } catch (error) {
      console.error('Groq error:', error);
      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: "I'm here to help! What would you like to achieve?",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, fallbackMessage]);
      setIsTyping(false);
    }
  };

  const extractDataFromInput = (input: string) => {
    const lower = input.toLowerCase();
    console.log('📝 Extracting data from input:', input);

    // Extract name first (before goal, as name can be in early messages)
    let nameExtracted = false;
    if (!collectedData.name) {
      // Match "I'm X", "my name is X", "call me X", or just a standalone name
      const nameMatch = input.match(/(?:i'?m|my name is|call me)\s+([a-z]+)/i);
      if (nameMatch) {
        console.log('👤 Extracted name (pattern match):', nameMatch[1]);
        setCollectedData(prev => ({ ...prev, name: nameMatch[1] }));
        nameExtracted = true;
      }

      // If AI just asked "what's your name" and user responds with just a name
      if (!nameExtracted && input.trim().length > 2 && input.trim().length < 20 && /^[a-z\s]+$/i.test(input.trim())) {
        // Check if previous AI message asked about name
        const lastAIMessage = messages.filter(m => m.role === 'ai').pop();
        if (lastAIMessage && lastAIMessage.content.toLowerCase().includes('name')) {
          console.log('👤 Extracted name (direct response):', input.trim());
          setCollectedData(prev => ({ ...prev, name: input.trim() }));
          nameExtracted = true;
        }
      }
    }

    // Extract goal - but NOT from greetings, introductions, or very short messages
    if (!collectedData.goal) {
      const isGreeting = /^(hi|hey|hello|yo|sup|what's up|hola|howdy|greetings)\.?$/i.test(input.trim());
      const isQuestion = /^(what|how|who|when|where|why)\s/i.test(input.trim());
      const isTooShort = input.trim().length < 4; // Reduced from 8 to allow "upsc", "jee" etc.
      const isIntroduction = nameExtracted; // Don't use intro message as goal

      // Only extract goal if it's substantive content (not greeting, not question, not intro, long enough)
      if (!isGreeting && !isQuestion && !isTooShort && !isIntroduction) {
        const category = detectCategory(input);
        console.log('🎯 Extracted goal:', input, '| Category:', category);
        setCollectedData(prev => ({ ...prev, goal: input, category }));
      }
    }

    // Extract skill level
    if (!collectedData.skillLevel) {
      // Be flexible with typos and variations
      if (lower.includes('beginner') || lower.includes('beginer') || lower.includes('begin') ||
          lower.includes('never') || lower.includes('starting fresh') || lower.includes('complete novice') ||
          lower.includes('just start') || lower.includes('from scratch')) {
        console.log('💪 Extracted skill level: beginner');
        setCollectedData(prev => ({ ...prev, skillLevel: 'beginner' }));
      } else if (lower.includes('intermediate') || lower.includes('intermediat') ||
                 lower.includes('some experience') || lower.includes('used to') ||
                 lower.includes('done before') || lower.includes('tried')) {
        console.log('💪 Extracted skill level: intermediate');
        setCollectedData(prev => ({ ...prev, skillLevel: 'intermediate' }));
      } else if (lower.includes('advanced') || lower.includes('advanc') ||
                 lower.includes('experienced') || lower.includes('expert') ||
                 lower.includes('good at') || lower.includes('pro')) {
        console.log('💪 Extracted skill level: advanced');
        setCollectedData(prev => ({ ...prev, skillLevel: 'advanced' }));
      }
    }

    // Extract sub-goals (look for specific mentions based on category)
    if (collectedData.category && collectedData.subGoals.length === 0) {
      const subGoalPatterns: Record<string, RegExp[]> = {
        'Fitness': [/(?:specific|focus on)\s+(\w+)/i, /(cardio|strength|flexibility|endurance)/i],
        'Learning': [/learn\s+(\w+)/i, /(spanish|python|guitar|cooking)/i],
        'Habit': [/(reading|meditation|journaling|exercise)\s+habit/i],
        'Creative': [/(book|novel|app|website|podcast|blog)/i],
        'Exam': [/(upsc|gmat|sat|gre|certification)/i],
        'Hobby': [/(photography|cooking|painting|gardening)/i]
      };

      const patterns = subGoalPatterns[collectedData.category] || [];
      patterns.forEach(pattern => {
        const match = input.match(pattern);
        if (match && match[1]) {
          setCollectedData(prev => ({
            ...prev,
            subGoals: [...new Set([...prev.subGoals, match[1].toLowerCase()])]
          }));
        }
      });
    }

    // Extract timeline and milestones
    if (!collectedData.timeline) {
      // Match various timeline formats:
      // - "3 months", "6 weeks", "2 years"
      // - "by 2027", "by June", "by December"
      // - Just a year: "2025", "2027"
      const timelineMatch = input.match(
        /(\d+)\s*(week|month|year|day)s?|(?:in|within|over|for|by)\s+(\d+)\s*(week|month|year|day)?s?|(?:by\s+)?(\d{4})|by\s+(\w+)/i
      );

      if (timelineMatch) {
        const target = timelineMatch[0];
        console.log('📅 Extracted timeline:', target);
        setCollectedData(prev => ({ ...prev, timeline: { target, milestones: [] } }));
      } else if (/^\d{4}$/.test(input.trim())) {
        // Just a year like "2027"
        const year = input.trim();
        console.log('📅 Extracted year as timeline:', year);
        setCollectedData(prev => ({ ...prev, timeline: { target: `by ${year}`, milestones: [] } }));
      }

      // Extract milestones like "run 5k", "read 6 books", "finish 10 chapters"
      const milestoneMatch = input.match(/(\d+)\s+(book|chapter|km|mile|page|hour|level|lesson)s?/gi);
      if (milestoneMatch && collectedData.timeline) {
        console.log('🎯 Extracted milestones:', milestoneMatch);
        setCollectedData(prev => ({
          ...prev,
          timeline: prev.timeline
            ? { ...prev.timeline, milestones: [...prev.timeline.milestones, ...milestoneMatch] }
            : { target: '', milestones: milestoneMatch }
        }));
      }
    }

    // Extract energy pattern
    if (!collectedData.energyPattern) {
      if (lower.includes('morning')) setCollectedData(prev => ({ ...prev, energyPattern: 'morning' }));
      else if (lower.includes('afternoon')) setCollectedData(prev => ({ ...prev, energyPattern: 'afternoon' }));
      else if (lower.includes('evening')) setCollectedData(prev => ({ ...prev, energyPattern: 'evening' }));
      else if (lower.includes('night')) setCollectedData(prev => ({ ...prev, energyPattern: 'night' }));
    }

    // Extract wake time
    if (!collectedData.wakeTime) {
      const timeMatch = input.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      if (timeMatch) {
        setCollectedData(prev => ({ ...prev, wakeTime: timeMatch[1] }));
      }
    }

    // Extract daily time
    if (!collectedData.dailyTime && (lower.includes('minute') || lower.includes('hour') || lower.includes('hr') || /\d+\s*min/i.test(input))) {
      const timeMatch = input.match(/(\d+)\s*(minute|min|hour|hr)s?/i);
      if (timeMatch) {
        console.log('⏰ Extracted daily time:', timeMatch[0]);
        setCollectedData(prev => ({ ...prev, dailyTime: timeMatch[0] }));
      }
    }
  };

  const generateStrategicPlan = async () => {
    // Prevent multiple calls
    if (isGeneratingPlan) {
      console.log('Plan generation already in progress, skipping...');
      return;
    }

    // NEVER proceed without a category - this should never happen with proper conversation flow
    if (!collectedData.category) {
      console.error('Cannot generate plan without category');
      return;
    }

    setIsGeneratingPlan(true);
    setGenerationProgress(0);

    const category = collectedData.category;
    const energyPattern = collectedData.energyPattern as 'morning' | 'afternoon' | 'evening' | 'night';

    console.log('🎯 Creating plan with category:', category);
    console.log('📋 Full collected data:', collectedData);

    // Show loading message
    const loadingMessage: Message = {
      id: Date.now().toString(),
      role: 'ai',
      content: `✨ Awesome! Creating your personalized ${collectedData.timeline?.target || '3-month'} strategic plan for ${collectedData.goal}... This will just take a moment!`,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, loadingMessage]);
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

      console.log(`📊 Duration calculation: ${collectedData.timeline?.target} = ${durationInMonths} months = ${totalWeeks} weeks`);
      console.log(`⏰ Daily time: ${collectedData.dailyTime} = ${dailyMinutes} minutes (Practice: ${practiceDuration}, Learning: ${learningDuration}, Reflection: ${reflectionDuration})`);

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

      console.log('🚀 Calling Groq API to generate strategic plan...');
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: planPrompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 4000,
      });

      const responseText = completion.choices[0]?.message?.content || '';
      console.log('📦 Groq API response length:', responseText.length, 'characters');
      console.log('📦 Response preview:', responseText.substring(0, 200));

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
        console.log('✅ Successfully parsed strategic plan:', strategicPlan);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.log('📄 Full response:', responseText);

        // Create a default strategic plan structure instead of throwing
        console.log('⚠️ Creating default strategic plan structure...');
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
        console.log('✅ Created default strategic plan:', strategicPlan);
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
      const phases = strategicPlan.weekTemplates.slice(0, 4).map((week: any, idx: number) => ({
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

      // === SYNC TO BACKEND ===
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

        console.log('✅ Journey saved to backend:', backendJourney.id);

        // Generate Day 1 tasks in backend
        await generateDayTasks(backendJourney.id, 1, initialTasks.map(t => ({
          title: t.title,
          description: t.description,
          type: t.type,
          duration: t.duration,
        })));

        console.log('✅ Day 1 tasks saved to backend');

        // Store journey ID for later use
        localStorage.setItem('coheren_journey_id', backendJourney.id);
      } catch (backendError) {
        // Backend sync failed, but local data is still valid
        console.warn('⚠️ Backend sync failed (app will work offline):', backendError);
      }
      // === END BACKEND SYNC ===

      // Complete progress bar
      setGenerationProgress(100);
      setIsTyping(false);

      // Wait a moment to show 100% completion, then transition
      setTimeout(() => setStep(7), 800);

    } catch (error) {
      console.error('❌ Strategic plan generation error:', error);
      console.log('🔄 Using fallback roadmap...');
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

      // === SYNC FALLBACK TO BACKEND ===
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
        console.log('✅ Fallback journey saved to backend:', backendJourney.id);
      } catch (backendError) {
        console.warn('⚠️ Backend sync failed for fallback:', backendError);
      }
      // === END FALLBACK BACKEND SYNC ===

      console.log('✅ Fallback roadmap created, transitioning to dashboard...');
      setTimeout(() => setStep(7), 800);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: tokens.colors.background, position: 'relative', overflow: 'hidden' }}>
      {/* Animated Background Illustrations */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        opacity: 0.03,
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

      {/* Progress Bar - shown during plan generation */}
      {isGeneratingPlan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: tokens.colors.gray[100],
          zIndex: 1000,
        }}>
          <div style={{
            height: '100%',
            width: `${generationProgress}%`,
            backgroundColor: tokens.colors.primary,
            transition: 'width 0.3s ease',
            boxShadow: `0 0 10px ${tokens.colors.primary}`,
          }} />
        </div>
      )}

      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        padding: `${tokens.spacing['3xl']} ${tokens.spacing.xl}`,
        borderBottom: `1px solid ${tokens.colors.gray[200]}`,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ marginBottom: tokens.spacing.md }}>
          <h1 style={text.display}>Coheren</h1>
          <div style={{
            height: '1px',
            width: '96px',
            backgroundColor: tokens.colors.primary,
            margin: '0 auto',
          }} />
        </div>
        <p style={{
          ...text.h3,
          color: tokens.colors.text.secondary,
          fontWeight: tokens.typography.weights.light,
        }}>
          Your AI-powered goal coach
        </p>
      </div>

      {/* Chat Container */}
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
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.lg,
            paddingBottom: tokens.spacing.xl,
          }}>
            {messages.map((message) => (
              <div key={message.id} style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: tokens.spacing.lg,
                  borderRadius: tokens.borderRadius.lg,
                  backgroundColor: message.role === 'ai' ? tokens.colors.gray[50] : tokens.colors.text.primary,
                  color: message.role === 'ai' ? tokens.colors.text.primary : tokens.colors.text.inverse,
                  border: `1px solid ${message.role === 'ai' ? tokens.colors.gray[200] : tokens.colors.text.primary}`,
                }}>
                  {message.role === 'ai' && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: tokens.spacing.sm,
                      marginBottom: tokens.spacing.sm,
                    }}>
                      <Sparkles size={16} color={tokens.colors.text.tertiary} />
                      <span style={{
                        ...text.caption,
                        color: tokens.colors.text.tertiary,
                        fontWeight: tokens.typography.weights.medium,
                      }}>
                        Coheren AI
                      </span>
                    </div>
                  )}
                  <p style={{ ...text.body, margin: 0 }}>{message.content}</p>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: tokens.spacing.lg,
                  borderRadius: tokens.borderRadius.lg,
                  backgroundColor: tokens.colors.gray[50],
                  border: `1px solid ${tokens.colors.gray[200]}`,
                }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: tokens.colors.gray[600],
                      borderRadius: '50%',
                      animation: 'pulse 1.4s infinite ease-in-out both',
                    }} />
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: tokens.colors.gray[600],
                      borderRadius: '50%',
                      animation: 'pulse 1.4s infinite ease-in-out both 0.2s',
                    }} />
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: tokens.colors.gray[600],
                      borderRadius: '50%',
                      animation: 'pulse 1.4s infinite ease-in-out both 0.4s',
                    }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div style={{
            display: 'flex',
            gap: tokens.spacing.md,
            padding: tokens.spacing.lg,
            backgroundColor: tokens.colors.background,
            borderTop: `1px solid ${tokens.colors.gray[200]}`,
          }}>
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={planGenerationTriggered ? "Generating your plan..." : "Type your message..."}
              disabled={isTyping || planGenerationTriggered}
              autoFocus
              style={{
                ...inputStyles.base,
                flex: 1,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!userInput.trim() || isTyping || planGenerationTriggered}
              style={{
                ...button.primary,
                width: '48px',
                height: '48px',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(1); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
