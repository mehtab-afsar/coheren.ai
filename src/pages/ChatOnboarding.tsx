import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import Groq from 'groq-sdk';
import { useStore } from '../store/useStore';
import { tokens, text, button, input as inputStyles } from '../design-system';
import { generateInitialTasks } from '../utils/taskGenerator';
import { detectCategory } from '../utils/categoryDetection';
import type { GoalCategory } from '../types';

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

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

      const systemPrompt = `You are Coheren, an AI goal coach. Have natural conversations to help users achieve their goals.

Your task: Extract these 5 details through conversation:
1. Their goal
2. Their name
3. Energy pattern (morning/afternoon/evening)
4. Wake time
5. Daily time commitment

What we have so far:
- Goal: ${collectedData.goal || 'not yet'}
- Name: ${collectedData.name || 'not yet'}
- Energy: ${collectedData.energyPattern || 'not yet'}
- Wake time: ${collectedData.wakeTime || 'not yet'}
- Daily time: ${collectedData.dailyTime || 'not yet'}

RULES:
- Be conversational and friendly
- Keep responses SHORT (1-2 sentences)
- Only ask about missing information
- When you have ALL 5 details, say "Perfect! Let me create your personalized plan now..."
- Don't repeat yourself`;

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

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      setIsTyping(false);

      // Check if AI says plan is ready
      if (aiResponse.toLowerCase().includes('personalized plan') ||
          aiResponse.toLowerCase().includes('creating your plan')) {
        setTimeout(() => {
          if (collectedData.goal && collectedData.name) {
            generateRoadmap();
          }
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

    // Extract goal from first message
    if (!collectedData.goal && messages.length === 1) {
      const category = detectCategory(input);
      setCollectedData(prev => ({ ...prev, goal: input, category }));
    }

    // Extract name
    if (!collectedData.name) {
      const nameMatch = input.match(/(?:i'?m|my name is|call me)\s+([a-z]+)/i);
      if (nameMatch) {
        setCollectedData(prev => ({ ...prev, name: nameMatch[1] }));
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
    if (!collectedData.wakeTime && /\d{1,2}(:\d{2})?\s*(am|pm)?/i.test(input)) {
      setCollectedData(prev => ({ ...prev, wakeTime: input }));
    }

    // Extract daily time
    if (!collectedData.dailyTime && (lower.includes('minute') || lower.includes('hour') || /\d+\s*min/i.test(input))) {
      setCollectedData(prev => ({ ...prev, dailyTime: input }));
    }
  };

  const generateRoadmap = () => {
    const category = collectedData.category || 'Fitness';
    const energyPattern = collectedData.energyPattern as 'morning' | 'afternoon' | 'evening' | 'night';

    updateUniversalProfile({
      name: collectedData.name,
      energyPattern,
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

    const roadmap = {
      title: collectedData.goal,
      category,
      duration: 6,
      dailyTime: collectedData.dailyTime || '30 minutes',
      recommendedTime: energyPattern === 'morning' ? '7:00 AM' :
                      energyPattern === 'evening' ? '7:00 PM' : '2:00 PM',
      phases: [
        { title: 'Foundation', weeks: '1-4', description: 'Build your base' },
        { title: 'Development', weeks: '5-12', description: 'Strengthen skills' },
        { title: 'Mastery', weeks: '13-20', description: 'Advanced practice' },
        { title: 'Excellence', weeks: '21-24', description: 'Peak performance' },
      ],
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    setRoadmap(roadmap);

    const initialTasks = generateInitialTasks(roadmap, checkInTime || '07:00');
    setTasks(initialTasks);

    setTimeout(() => setStep(7), 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: tokens.colors.background }}>
      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        padding: `${tokens.spacing['3xl']} ${tokens.spacing.xl}`,
        borderBottom: `1px solid ${tokens.colors.gray[200]}`,
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
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isTyping}
              style={{
                ...inputStyles.base,
                flex: 1,
              }}
            />
            <button
              onClick={handleSend}
              disabled={!userInput.trim() || isTyping}
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
