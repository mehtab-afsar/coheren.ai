import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { tokens, text } from '../design-system';
import { useStore } from '../store/useStore';
import Groq from 'groq-sdk';

// Initialize Groq client
const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

export default function WelcomeAnimation() {
  const [quote, setQuote] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  const { universalProfile, roadmap, setStep } = useStore();

  useEffect(() => {
    generateMotivationalQuote();
  }, []);

  const generateMotivationalQuote = async () => {
    try {
      // Generate a motivational quote based on the user's goal
      const prompt = `Generate a short, powerful motivational quote (max 2 sentences) for someone starting their journey to: "${roadmap?.title}".

Make it personal, inspiring, and action-oriented. Do NOT use generic quotes. Make it specific to their ${roadmap?.category} goal.

Return ONLY the quote, no explanations or attribution.`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        max_tokens: 100,
      });

      const generatedQuote = completion.choices[0]?.message?.content?.trim() ||
        "Every master was once a beginner. Your journey starts today.";

      setQuote(generatedQuote);
      setIsLoading(false);
      setFadeIn(true);

      // After 4 seconds, fade out and go to dashboard
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setStep(8); // Navigate to Dashboard
        }, 800); // Wait for fade out animation
      }, 4000);

    } catch (error) {
      console.error('Error generating quote:', error);
      setQuote("Every master was once a beginner. Your journey starts today.");
      setIsLoading(false);
      setFadeIn(true);

      setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setStep(8);
        }, 800);
      }, 4000);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.colors.background,
      padding: tokens.spacing['3xl'],
      opacity: fadeOut ? 0 : (fadeIn ? 1 : 0),
      transition: 'opacity 0.8s ease-in-out'
    }}>
      {/* Animated Sparkle Icon */}
      <div style={{
        marginBottom: tokens.spacing['2xl'],
        animation: 'pulse 2s ease-in-out infinite'
      }}>
        <Sparkles size={64} color={tokens.colors.primary} strokeWidth={1.5} />
      </div>

      {/* Welcome Message */}
      <h1 style={{
        ...text.display,
        fontSize: '48px',
        marginBottom: tokens.spacing.lg,
        textAlign: 'center',
        color: tokens.colors.text.primary
      }}>
        Welcome, {universalProfile.name}! 🎉
      </h1>

      {/* Goal Title */}
      <p style={{
        ...text.h3,
        marginBottom: tokens.spacing['3xl'],
        textAlign: 'center',
        color: tokens.colors.text.secondary,
        fontWeight: 300
      }}>
        Let's begin your {roadmap?.category} journey
      </p>

      {/* Motivational Quote */}
      <div style={{
        maxWidth: '600px',
        padding: tokens.spacing['2xl'],
        backgroundColor: tokens.colors.gray[50],
        borderRadius: tokens.borderRadius.xl,
        border: `1px solid ${tokens.colors.gray[200]}`,
        textAlign: 'center',
        marginBottom: tokens.spacing['3xl']
      }}>
        {isLoading ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: tokens.spacing.md
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: tokens.colors.primary,
              borderRadius: '50%',
              animation: 'bounce 1.4s infinite ease-in-out both',
              animationDelay: '-0.32s'
            }} />
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: tokens.colors.primary,
              borderRadius: '50%',
              animation: 'bounce 1.4s infinite ease-in-out both',
              animationDelay: '-0.16s'
            }} />
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: tokens.colors.primary,
              borderRadius: '50%',
              animation: 'bounce 1.4s infinite ease-in-out both'
            }} />
          </div>
        ) : (
          <p style={{
            ...text.h4,
            fontStyle: 'italic',
            color: tokens.colors.text.primary,
            fontWeight: 300,
            lineHeight: 1.6
          }}>
            "{quote}"
          </p>
        )}
      </div>

      {/* Quick Tips */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: tokens.spacing.md,
        maxWidth: '500px',
        textAlign: 'center'
      }}>
        <p style={{
          ...text.body,
          color: tokens.colors.text.tertiary,
          fontSize: '14px'
        }}>
          ✨ Complete daily tasks to build your streak
        </p>
        <p style={{
          ...text.body,
          color: tokens.colors.text.tertiary,
          fontSize: '14px'
        }}>
          📈 Track your progress week by week
        </p>
        <p style={{
          ...text.body,
          color: tokens.colors.text.tertiary,
          fontSize: '14px'
        }}>
          🎯 Stay consistent, adjust as you grow
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }

        @keyframes bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
