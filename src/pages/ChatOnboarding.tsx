import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useStore } from '../store/useStore';
import { tokens, text, button, input as inputStyles } from '../design-system';
import { generateInitialTasks } from '../utils/taskGenerator';
import { detectCategory } from '../utils/categoryDetection';
import type { GoalCategory } from '../types';

// ============================================================================
// TODO: GROQ API INTEGRATION
// ============================================================================
// Replace the setTimeout simulation in handleSend() with actual Groq API calls
//
// Example integration:
// 1. Install: npm install groq-sdk
// 2. Add API key to .env: VITE_GROQ_API_KEY=your_key_here
// 3. Import: import Groq from 'groq-sdk'
// 4. Initialize: const groq = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY })
// 5. Replace setTimeout with:
//    const response = await groq.chat.completions.create({
//      messages: [...messages, userMessage],
//      model: 'mixtral-8x7b-32768',
//    })
// ============================================================================

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
      content: "Hi! I'm Coheren, your AI goal coach. I help you turn any goal into a clear, actionable plan. What would you like to achieve?",
      timestamp: new Date(),
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }>({
    goal: '',
    category: null,
    name: '',
    energyPattern: '',
    wakeTime: '',
    dailyTime: ''
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!userInput.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = userInput; // Save before clearing
    setUserInput('');
    setIsTyping(true);

    // TODO: Replace this with Groq API call
    // For now, simulate AI response with conversation flow
    setTimeout(() => {
      let aiResponse = '';

      // Simple conversation flow based on message count
      const messageCount = messages.filter(m => m.role === 'user').length;

      if (messageCount === 0) {
        // First user response - they told us their goal
        const detectedCategory = detectCategory(currentInput);
        setCollectedData(prev => ({ ...prev, goal: currentInput, category: detectedCategory }));
        aiResponse = `${currentInput} - great choice! Let me ask you a few quick questions to create your personalized roadmap. First, what's your name?`;
      } else if (messageCount === 1) {
        // Got their name
        setCollectedData(prev => ({ ...prev, name: currentInput }));
        aiResponse = `Nice to meet you, ${currentInput}! When do you usually have the most energy during the day - morning, afternoon, or evening?`;
      } else if (messageCount === 2) {
        // Got energy pattern
        const energyPattern = currentInput.toLowerCase();
        setCollectedData(prev => ({ ...prev, energyPattern }));
        aiResponse = "Perfect! And what time do you typically wake up? (e.g., 7:00 AM)";
      } else if (messageCount === 3) {
        // Got wake time
        setCollectedData(prev => ({ ...prev, wakeTime: currentInput }));
        aiResponse = "Great! Last question - how much time can you dedicate to this daily? (e.g., 30 minutes, 1 hour)";
      } else if (messageCount === 4) {
        // Got daily time commitment
        const finalData = { ...collectedData, dailyTime: currentInput };

        // Save to store
        const energyPattern = finalData.energyPattern as 'morning' | 'afternoon' | 'evening' | 'night';
        updateUniversalProfile({
          name: finalData.name,
          energyPattern,
          dailyRoutine: {
            wakeTime: finalData.wakeTime,
            sleepTime: '',
            workHours: { start: '', end: '' },
            freeTimeSlots: []
          }
        });

        // Use detected category or fallback to Fitness
        const goalCategory = finalData.category || 'Fitness';

        updateCurrentGoal({
          category: goalCategory,
          specificGoal: finalData.goal,
        });

        // Generate category-appropriate roadmap
        const getCategoryPhases = (category: GoalCategory) => {
          const phaseMap: Record<GoalCategory, Array<{title: string, weeks: string, description: string}>> = {
            Fitness: [
              { title: 'Foundation', weeks: '1-4', description: 'Build cardio base & form' },
              { title: 'Development', weeks: '5-12', description: 'Increase strength & skill' },
              { title: 'Mastery', weeks: '13-20', description: 'Advanced techniques' },
              { title: 'Excellence', weeks: '21-24', description: 'Peak performance' },
            ],
            Exam: [
              { title: 'Foundation', weeks: '1-4', description: 'Core concepts & syllabus' },
              { title: 'Practice', weeks: '5-12', description: 'Problem solving & tests' },
              { title: 'Revision', weeks: '13-16', description: 'Comprehensive review' },
              { title: 'Final Prep', weeks: '17-20', description: 'Mock tests & refinement' },
            ],
            Hobby: [
              { title: 'Basics', weeks: '1-2', description: 'Learn fundamentals' },
              { title: 'Practice', weeks: '3-8', description: 'Build skills through repetition' },
              { title: 'Creativity', weeks: '9-12', description: 'Experiment & create' },
            ],
            Learning: [
              { title: 'Beginner', weeks: '1-4', description: 'Foundation & basics' },
              { title: 'Intermediate', weeks: '5-12', description: 'Expand knowledge' },
              { title: 'Advanced', weeks: '13-20', description: 'Complex concepts' },
              { title: 'Fluency', weeks: '21-24', description: 'Natural application' },
            ],
            Habit: [
              { title: 'Formation', weeks: '1-3', description: 'Build consistency' },
              { title: 'Reinforcement', weeks: '4-8', description: 'Make it automatic' },
              { title: 'Mastery', weeks: '9-12', description: 'Habit is second nature' },
            ],
            Creative: [
              { title: 'Planning', weeks: '1-2', description: 'Outline & research' },
              { title: 'Creation', weeks: '3-12', description: 'Build your project' },
              { title: 'Refinement', weeks: '13-16', description: 'Polish & improve' },
              { title: 'Launch', weeks: '17-20', description: 'Share with world' },
            ],
          };
          return phaseMap[category];
        };

        const generatedRoadmap = {
          title: finalData.goal,
          category: goalCategory,
          duration: 6,
          dailyTime: finalData.dailyTime,
          recommendedTime: finalData.energyPattern === 'morning' ? '7:00 AM' :
                          finalData.energyPattern === 'evening' ? '7:00 PM' : '2:00 PM',
          phases: getCategoryPhases(goalCategory),
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };

        setRoadmap(generatedRoadmap);

        // Generate Day 1 tasks
        const initialTasks = generateInitialTasks(generatedRoadmap, checkInTime || '07:00');
        setTasks(initialTasks);

        aiResponse = "Excellent! I'm creating your personalized roadmap now. This will just take a moment...";

        // After showing this message, redirect to dashboard
        setTimeout(() => {
          setStep(7); // Go to dashboard
        }, 2500);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: tokens.colors.background,
      }}
    >
      {/* Hero Section */}
      <div
        style={{
          textAlign: 'center',
          padding: `${tokens.spacing['3xl']} ${tokens.spacing.xl}`,
          borderBottom: `1px solid ${tokens.colors.gray[200]}`,
        }}
      >
        <div style={{ marginBottom: tokens.spacing.md }}>
          <h1 style={text.display}>Coheren</h1>
          <div
            style={{
              height: '1px',
              width: '96px',
              backgroundColor: tokens.colors.primary,
              margin: '0 auto',
            }}
          />
        </div>
        <p
          style={{
            ...text.h3,
            color: tokens.colors.text.secondary,
            fontWeight: tokens.typography.weights.light,
          }}
        >
          Your AI-powered goal coach
        </p>
      </div>

      {/* Chat Container */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          padding: tokens.spacing.xl,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '700px',
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.lg,
          }}
        >
          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: tokens.spacing.lg,
              paddingBottom: tokens.spacing.xl,
            }}
          >
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '80%',
                    padding: tokens.spacing.lg,
                    borderRadius: tokens.borderRadius.lg,
                    backgroundColor:
                      message.role === 'ai'
                        ? tokens.colors.gray[50]
                        : tokens.colors.text.primary,
                    color:
                      message.role === 'ai'
                        ? tokens.colors.text.primary
                        : tokens.colors.text.inverse,
                    border: `1px solid ${
                      message.role === 'ai'
                        ? tokens.colors.gray[200]
                        : tokens.colors.text.primary
                    }`,
                  }}
                >
                  {message.role === 'ai' && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: tokens.spacing.sm,
                        marginBottom: tokens.spacing.sm,
                      }}
                    >
                      <Sparkles size={16} color={tokens.colors.text.tertiary} />
                      <span
                        style={{
                          ...text.caption,
                          color: tokens.colors.text.tertiary,
                          fontWeight: tokens.typography.weights.medium,
                        }}
                      >
                        CONSIST AI
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
                <div
                  style={{
                    padding: tokens.spacing.lg,
                    borderRadius: tokens.borderRadius.lg,
                    backgroundColor: tokens.colors.gray[50],
                    border: `1px solid ${tokens.colors.gray[200]}`,
                  }}
                >
                  <div style={{ display: 'flex', gap: tokens.spacing.xs }}>
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: tokens.colors.text.tertiary,
                        animation: 'pulse 1.5s infinite',
                      }}
                    />
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: tokens.colors.text.tertiary,
                        animation: 'pulse 1.5s infinite 0.2s',
                      }}
                    />
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: tokens.colors.text.tertiary,
                        animation: 'pulse 1.5s infinite 0.4s',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div
            style={{
              display: 'flex',
              gap: tokens.spacing.md,
              padding: tokens.spacing.lg,
              backgroundColor: tokens.colors.background,
              borderTop: `1px solid ${tokens.colors.gray[200]}`,
              borderRadius: tokens.borderRadius.lg,
            }}
          >
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              style={{
                ...inputStyles.base,
                flex: 1,
                marginBottom: 0,
              }}
              disabled={isTyping}
            />
            <button
              onClick={handleSend}
              disabled={!userInput.trim() || isTyping}
              style={{
                ...button.primary,
                minWidth: '48px',
                padding: tokens.spacing.md,
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

      {/* Pulse animation for typing indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
