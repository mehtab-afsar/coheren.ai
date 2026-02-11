import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  X
} from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';

interface LandingPageProps {
  onGetStarted?: (goal: string) => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const setStep = useStore((state) => state.setStep);
  const [goalInput, setGoalInput] = useState('');
  const [placeholderText, setPlaceholderText] = useState('');

  const placeholderExamples = [
    "I want to learn boxing",
    "I want to prepare for CAT",
    "I want to build reading habits",
    "I want to learn guitar",
    "I want to get fit",
    "I want to learn Spanish",
    "I want to code daily"
  ];

  // Typing animation effect
  useEffect(() => {
    let currentText = '';
    let currentIndex = 0;
    let isDeleting = false;
    let phraseIndex = 0;

    const type = () => {
      const currentPhrase = placeholderExamples[phraseIndex];

      if (!isDeleting) {
        currentText = currentPhrase.substring(0, currentIndex + 1);
        currentIndex++;

        if (currentIndex === currentPhrase.length) {
          isDeleting = true;
          setTimeout(type, 2000); // Pause at end
          setPlaceholderText(currentText);
          return;
        }
      } else {
        currentText = currentPhrase.substring(0, currentIndex - 1);
        currentIndex--;

        if (currentIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % placeholderExamples.length;
          setTimeout(type, 500); // Pause before next phrase
          setPlaceholderText(currentText);
          return;
        }
      }

      setPlaceholderText(currentText);
      setTimeout(type, isDeleting ? 50 : 100);
    };

    const timer = setTimeout(type, 1000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGetStarted = (customGoal?: string) => {
    const goal = customGoal || goalInput.trim();
    if (goal) {
      if (onGetStarted) {
        onGetStarted(goal);
      } else {
        setStep(1); // Fallback: Go to ChatOnboarding directly
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && goalInput.trim()) {
      handleGetStarted();
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFBFC', overflow: 'hidden' }}>
      {/* Enhanced background with animated gradients */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 20% 10%, rgba(67, 56, 202, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.05) 0%, transparent 50%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* Floating orbs for visual interest */}
      <div style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0
      }}>
        <motion.div
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            top: '10%',
            left: '10%',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(67, 56, 202, 0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <motion.div
          animate={{
            y: [0, 40, 0],
            x: [0, -30, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
          style={{
            position: 'absolute',
            bottom: '10%',
            right: '10%',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Navigation */}
      <nav style={{
        position: 'sticky',
        top: 0,
        width: '100%',
        zIndex: 100,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(250, 251, 252, 0.35) 50%, rgba(255, 255, 255, 0.25) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.2)',
        boxShadow: '0 4px 32px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.4)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: `${tokens.spacing.lg} ${tokens.spacing['2xl']}`,
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
        {/* Brand Text */}
        <button
          onClick={() => {
            setStep(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          <span style={{
            fontSize: tokens.typography.sizes['2xl'],
            fontWeight: tokens.typography.weights.light,
            color: '#0F172A',
            letterSpacing: '-0.02em'
          }}>
            coheren.ai
          </span>
        </button>

        {/* Navigation Links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing['2xl']
        }}>
          <button
            onClick={() => {
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.secondary,
              transition: 'color 0.2s',
              padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = tokens.colors.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = tokens.colors.text.secondary}
          >
            How it Works
          </button>

          <button
            onClick={() => {
              document.getElementById('roadmap-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.secondary,
              transition: 'color 0.2s',
              padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = tokens.colors.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = tokens.colors.text.secondary}
          >
            Features
          </button>

          <button
            onClick={() => {
              document.getElementById('why-coheren')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.secondary,
              transition: 'color 0.2s',
              padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = tokens.colors.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = tokens.colors.text.secondary}
          >
            Why Coheren
          </button>

          <button
            onClick={() => {
              document.getElementById('science')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: tokens.typography.sizes.base,
              fontWeight: tokens.typography.weights.medium,
              color: tokens.colors.text.secondary,
              transition: 'color 0.2s',
              padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = tokens.colors.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = tokens.colors.text.secondary}
          >
            Science
          </button>
        </div>
        </div>
      </nav>

      {/* Hero Section - Full Page */}
      <section style={{
        position: 'relative',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        textAlign: 'center',
        maxWidth: '1000px',
        margin: '0 auto',
        zIndex: 1
      }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            style={{
              fontSize: '96px',
              fontWeight: 200,
              letterSpacing: '-0.04em',
              marginBottom: tokens.spacing['2xl'],
              background: 'linear-gradient(135deg, #0F172A 0%, #334155 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.05
            }}
          >
            Think less. Do more.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{
              fontSize: '28px',
              fontWeight: tokens.typography.weights.light,
              color: '#475569',
              lineHeight: 1.6,
              maxWidth: '800px',
              margin: `0 auto ${tokens.spacing['4xl']} auto`
            }}
          >
            AI that turns your goals into{' '}
            <span style={{
              color: tokens.colors.primary,
              fontWeight: tokens.typography.weights.medium,
              position: 'relative'
            }}>
              one simple task
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 1.2 }}
                style={{
                  position: 'absolute',
                  bottom: '-4px',
                  left: 0,
                  right: 0,
                  height: '2px',
                  background: `linear-gradient(90deg, ${tokens.colors.primary}, rgba(16, 185, 129, 0.8))`,
                  transformOrigin: 'left',
                  borderRadius: '2px'
                }}
              />
            </span>
            {' '}per day.
          </motion.p>

          {/* Enhanced input field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            style={{
              maxWidth: '700px',
              margin: `0 auto ${tokens.spacing['2xl']} auto`
            }}
          >
            <div style={{
              position: 'relative',
              display: 'flex',
              gap: tokens.spacing.sm,
              padding: '8px',
              background: 'linear-gradient(135deg, white 0%, #F8FAFC 100%)',
              borderRadius: tokens.borderRadius['2xl'],
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(67, 56, 202, 0.12), 0 2px 8px rgba(0,0,0,0.06)';
              e.currentTarget.style.borderColor = 'rgba(67, 56, 202, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)';
              e.currentTarget.style.borderColor = '#E2E8F0';
            }}
            >
              <input
                type="text"
                placeholder={placeholderText || "What's your goal?"}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  padding: `${tokens.spacing.xl} ${tokens.spacing['2xl']}`,
                  border: 'none',
                  outline: 'none',
                  fontSize: tokens.typography.sizes.xl,
                  backgroundColor: 'transparent',
                  color: '#0F172A',
                  fontWeight: tokens.typography.weights.light
                }}
              />
              <motion.button
                onClick={() => handleGetStarted()}
                disabled={!goalInput.trim()}
                whileHover={goalInput.trim() ? { scale: 1.05 } : {}}
                whileTap={goalInput.trim() ? { scale: 0.95 } : {}}
                style={{
                  padding: `${tokens.spacing.lg} ${tokens.spacing['2xl']}`,
                  background: goalInput.trim()
                    ? `linear-gradient(135deg, ${tokens.colors.primary} 0%, #5B4FCF 100%)`
                    : '#E2E8F0',
                  color: goalInput.trim() ? 'white' : '#94A3B8',
                  border: 'none',
                  borderRadius: tokens.borderRadius.xl,
                  cursor: goalInput.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '24px',
                  fontWeight: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: tokens.spacing.sm,
                  boxShadow: goalInput.trim() ? '0 4px 12px rgba(67, 56, 202, 0.3)' : 'none',
                  transition: 'all 0.3s ease',
                  minWidth: '56px'
                }}
              >
                →
              </motion.button>
            </div>
          </motion.div>

          {/* Quick examples with enhanced styling */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: tokens.spacing.lg,
              marginTop: tokens.spacing.xl
            }}
          >
            <span style={{
              fontSize: tokens.typography.sizes.sm,
              color: '#94A3B8',
              fontWeight: tokens.typography.weights.regular,
              letterSpacing: '0.05em',
              textTransform: 'uppercase'
            }}>
              or try
            </span>

            <div style={{
              display: 'flex',
              gap: tokens.spacing.md,
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {['Learn guitar', 'Get fit', 'Learn to code'].map((example, index) => (
                <motion.button
                  key={example}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  onClick={() => handleGetStarted(example)}
                  whileHover={{
                    scale: 1.05,
                    y: -2
                  }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 251, 252, 0.95) 100%)',
                    border: '1px solid rgba(226, 232, 240, 0.6)',
                    borderRadius: tokens.borderRadius.full,
                    cursor: 'pointer',
                    fontSize: tokens.typography.sizes.base,
                    color: '#475569',
                    fontWeight: tokens.typography.weights.medium,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                    e.currentTarget.style.color = tokens.colors.primary;
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(67, 56, 202, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 232, 255, 0.4) 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.6)';
                    e.currentTarget.style.color = '#475569';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(250, 251, 252, 0.95) 100%)';
                  }}
                >
                  {example}
                </motion.button>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 1.5 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.xs,
                marginTop: tokens.spacing.md
              }}
            >
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#10B981'
              }} />
              <span style={{
                fontSize: tokens.typography.sizes.sm,
                color: '#64748B',
                fontWeight: tokens.typography.weights.regular
              }}>
                No signup required to start
              </span>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works - Second Page/Section */}
      <section id="how-it-works" style={{
        minHeight: '100vh',
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        background: 'linear-gradient(180deg, #FAFBFC 0%, white 50%, #FAFBFC 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        scrollMarginTop: '80px'
      }}>
        {/* Enhanced Decorative elements */}
        <div style={{
          position: 'absolute',
          top: '5%',
          left: '5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(67, 56, 202, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          right: '5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: tokens.spacing['5xl'] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              style={{
                display: 'inline-block',
                padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                background: `linear-gradient(135deg, ${tokens.colors.primary}15 0%, rgba(16, 185, 129, 0.15) 100%)`,
                borderRadius: tokens.borderRadius.full,
                marginBottom: tokens.spacing.xl,
                border: `1px solid ${tokens.colors.primary}30`
              }}
            >
              <span style={{
                fontSize: tokens.typography.sizes.sm,
                fontWeight: tokens.typography.weights.semibold,
                color: tokens.colors.primary,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                How It Works
              </span>
            </motion.div>

            <h2 style={{
              fontSize: '56px',
              fontWeight: 200,
              letterSpacing: '-0.03em',
              marginBottom: tokens.spacing.md,
              color: '#0F172A',
              lineHeight: 1.1
            }}>
              Three steps to success
            </h2>
            <p style={{
              fontSize: tokens.typography.sizes.xl,
              color: '#64748B',
              maxWidth: '650px',
              margin: '0 auto',
              lineHeight: 1.6,
              fontWeight: tokens.typography.weights.light
            }}>
              Simple enough for today. Powerful enough for any goal.
            </p>
          </motion.div>

          {/* Modern Card Grid Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: tokens.spacing['2xl'],
            position: 'relative',
            maxWidth: '1400px',
            margin: '0 auto'
          }}>

            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                padding: tokens.spacing['3xl'],
                textAlign: 'left'
              }}
            >
              <div style={{
                fontSize: tokens.typography.sizes.sm,
                fontWeight: tokens.typography.weights.semibold,
                color: tokens.colors.primary,
                marginBottom: tokens.spacing.md,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Step 1
              </div>

              <h3 style={{
                fontSize: tokens.typography.sizes['3xl'],
                fontWeight: tokens.typography.weights.semibold,
                marginBottom: tokens.spacing.lg,
                color: '#0F172A',
                letterSpacing: '-0.02em'
              }}>
                Share your goal
              </h3>

              <p style={{
                fontSize: tokens.typography.sizes.lg,
                color: '#64748B',
                lineHeight: 1.8,
                fontWeight: tokens.typography.weights.light
              }}>
                Tell Coheren what you want to achieve. "Learn Spanish", "Run a 5K", "Build an app" — anything goes.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                padding: tokens.spacing['3xl'],
                textAlign: 'left'
              }}
            >
              <div style={{
                fontSize: tokens.typography.sizes.sm,
                fontWeight: tokens.typography.weights.semibold,
                color: tokens.colors.primary,
                marginBottom: tokens.spacing.md,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Step 2
              </div>

              <h3 style={{
                fontSize: tokens.typography.sizes['3xl'],
                fontWeight: tokens.typography.weights.semibold,
                marginBottom: tokens.spacing.lg,
                color: '#0F172A',
                letterSpacing: '-0.02em'
              }}>
                AI creates your roadmap
              </h3>

              <p style={{
                fontSize: tokens.typography.sizes.lg,
                color: '#64748B',
                lineHeight: 1.8,
                fontWeight: tokens.typography.weights.light
              }}>
                Our AI instantly generates a personalized timeline with daily micro-tasks calibrated to your pace.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                padding: tokens.spacing['3xl'],
                textAlign: 'left'
              }}
            >
              <div style={{
                fontSize: tokens.typography.sizes.sm,
                fontWeight: tokens.typography.weights.semibold,
                color: tokens.colors.primary,
                marginBottom: tokens.spacing.md,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Step 3
              </div>

              <h3 style={{
                fontSize: tokens.typography.sizes['3xl'],
                fontWeight: tokens.typography.weights.semibold,
                marginBottom: tokens.spacing.lg,
                color: '#0F172A',
                letterSpacing: '-0.02em'
              }}>
                Focus on today
              </h3>

              <p style={{
                fontSize: tokens.typography.sizes.lg,
                color: '#64748B',
                lineHeight: 1.8,
                fontWeight: tokens.typography.weights.light
              }}>
                Each morning, get your ONE task. Complete it, build momentum, achieve your goal.
              </p>
            </motion.div>
          </div>

          {/* Enhanced CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginTop: tokens.spacing['4xl'] }}
          >
            <motion.button
              onClick={() => handleGetStarted()}
              whileHover={{
                scale: 1.05,
                boxShadow: '0 12px 32px rgba(67, 56, 202, 0.4)'
              }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: `${tokens.spacing.lg} ${tokens.spacing['3xl']}`,
                background: `linear-gradient(135deg, ${tokens.colors.primary} 0%, #5B4FCF 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: tokens.borderRadius['2xl'],
                cursor: 'pointer',
                fontSize: tokens.typography.sizes.lg,
                fontWeight: tokens.typography.weights.semibold,
                display: 'inline-flex',
                alignItems: 'center',
                gap: tokens.spacing.md,
                boxShadow: '0 8px 24px rgba(67, 56, 202, 0.35)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease'
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>Create my roadmap</span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ position: 'relative', zIndex: 1 }}
              >
                <ArrowRight size={20} />
              </motion.span>
              {/* Shine effect */}
              <motion.div
                animate={{
                  x: ['-100%', '200%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '50%',
                  height: '100%',
                  background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  transform: 'skewX(-20deg)'
                }}
              />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Example Roadmap Section - Enhanced */}
      <section id="roadmap-preview" style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        background: 'linear-gradient(180deg, #FAFBFC 0%, white 100%)',
        position: 'relative',
        scrollMarginTop: '80px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: tokens.spacing['3xl'] }}
          >
            <h2 style={{
              fontSize: tokens.typography.sizes['4xl'],
              fontWeight: tokens.typography.weights.light,
              letterSpacing: '-0.02em',
              marginBottom: tokens.spacing.lg,
              color: '#0F172A'
            }}>
              See an example roadmap
            </h2>
            <p style={{
              fontSize: tokens.typography.sizes.lg,
              color: '#64748B',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Goal: "I want to learn guitar"
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{
              backgroundColor: 'white',
              borderRadius: tokens.borderRadius['2xl'],
              padding: tokens.spacing['3xl'],
              boxShadow: '0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
              border: '1px solid #E2E8F0',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Decorative gradient overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(67, 56, 202, 0.06) 0%, transparent 70%)',
              pointerEvents: 'none'
            }} />
            {/* Week 1-2 */}
            <div style={{ marginBottom: tokens.spacing['2xl'] }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.md,
                marginBottom: tokens.spacing.lg
              }}>
                <div style={{
                  padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
                  backgroundColor: tokens.colors.primary + '15',
                  color: tokens.colors.primary,
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.medium
                }}>
                  Week 1-2
                </div>
                <h3 style={{
                  fontSize: tokens.typography.sizes.xl,
                  fontWeight: tokens.typography.weights.medium,
                  color: '#0F172A'
                }}>
                  Foundation
                </h3>
              </div>

              <div style={{ paddingLeft: tokens.spacing.xl }}>
                {[
                  { day: 1, task: 'Learn to hold guitar correctly', time: '10 min' },
                  { day: 2, task: 'Practice G, C, D chords', time: '15 min' },
                  { day: 3, task: 'Chord switching drill', time: '15 min' }
                ].map((item) => (
                  <div key={item.day} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.md,
                    padding: `${tokens.spacing.md} 0`,
                    borderBottom: '1px solid #F1F5F9'
                  }}>
                    <CheckCircle2 size={18} color={tokens.colors.primary} />
                    <span style={{
                      fontSize: tokens.typography.sizes.sm,
                      color: '#94A3B8',
                      minWidth: '60px'
                    }}>
                      Day {item.day}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: tokens.typography.sizes.base,
                      color: '#475569'
                    }}>
                      {item.task}
                    </span>
                    <span style={{
                      fontSize: tokens.typography.sizes.sm,
                      color: '#94A3B8'
                    }}>
                      {item.time}
                    </span>
                  </div>
                ))}
                <div style={{
                  padding: `${tokens.spacing.md} 0`,
                  fontSize: tokens.typography.sizes.sm,
                  color: '#94A3B8',
                  fontStyle: 'italic'
                }}>
                  ...
                </div>
              </div>
            </div>

            {/* Week 3-4 */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.md,
                marginBottom: tokens.spacing.lg
              }}>
                <div style={{
                  padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
                  backgroundColor: tokens.colors.primary + '15',
                  color: tokens.colors.primary,
                  borderRadius: tokens.borderRadius.md,
                  fontSize: tokens.typography.sizes.sm,
                  fontWeight: tokens.typography.weights.medium
                }}>
                  Week 3-4
                </div>
                <h3 style={{
                  fontSize: tokens.typography.sizes.xl,
                  fontWeight: tokens.typography.weights.medium,
                  color: '#0F172A'
                }}>
                  Your First Song
                </h3>
              </div>

              <div style={{ paddingLeft: tokens.spacing.xl }}>
                {[
                  { day: 8, task: 'Learn "Horse With No Name" intro', time: '20 min' },
                  { day: 9, task: 'Practice verse progression', time: '20 min' }
                ].map((item) => (
                  <div key={item.day} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.md,
                    padding: `${tokens.spacing.md} 0`,
                    borderBottom: '1px solid #F1F5F9'
                  }}>
                    <CheckCircle2 size={18} color={tokens.colors.primary} />
                    <span style={{
                      fontSize: tokens.typography.sizes.sm,
                      color: '#94A3B8',
                      minWidth: '60px'
                    }}>
                      Day {item.day}
                    </span>
                    <span style={{
                      flex: 1,
                      fontSize: tokens.typography.sizes.base,
                      color: '#475569'
                    }}>
                      {item.task}
                    </span>
                    <span style={{
                      fontSize: tokens.typography.sizes.sm,
                      color: '#94A3B8'
                    }}>
                      {item.time}
                    </span>
                  </div>
                ))}
                <div style={{
                  padding: `${tokens.spacing.md} 0`,
                  fontSize: tokens.typography.sizes.sm,
                  color: '#94A3B8',
                  fontStyle: 'italic'
                }}>
                  ...
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      </section>

      {/* Not Another Todo App - Problem/Solution Format */}
      <section id="why-coheren" style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        backgroundColor: 'white',
        scrollMarginTop: '80px'
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: tokens.spacing['4xl'] }}
          >
            <h2 style={{
              fontSize: tokens.typography.sizes['4xl'],
              fontWeight: tokens.typography.weights.light,
              letterSpacing: '-0.02em',
              color: '#0F172A'
            }}>
              Not another todo app
            </h2>
          </motion.div>

          <div style={{
            display: 'grid',
            gap: tokens.spacing['2xl']
          }}>
            {[
              {
                wrong: 'Most apps: You plan, organize, and execute',
                right: 'Coheren: We plan and organize. You just execute.'
              },
              {
                wrong: 'Most apps: Overwhelming task lists',
                right: 'Coheren: One task. Every day. That\'s it.'
              },
              {
                wrong: 'Most apps: Generic advice for everyone',
                right: 'Coheren: AI trained on behavioral science, personalized to you'
              },
              {
                wrong: 'Most apps: Guilt when you skip',
                right: 'Coheren: We adjust. No judgment. Just forward motion.'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: tokens.spacing.xl,
                  padding: tokens.spacing.xl,
                  borderRadius: tokens.borderRadius.xl,
                  backgroundColor: '#FAFBFC'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: tokens.spacing.md
                }}>
                  <X size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{
                    fontSize: tokens.typography.sizes.base,
                    color: '#64748B',
                    lineHeight: 1.6
                  }}>
                    {item.wrong}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: tokens.spacing.md
                }}>
                  <CheckCircle2 size={20} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{
                    fontSize: tokens.typography.sizes.base,
                    color: '#0F172A',
                    lineHeight: 1.6,
                    fontWeight: tokens.typography.weights.medium
                  }}>
                    {item.right}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* The Science Behind Coheren - Clean & Simple */}
      <section id="science" style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        backgroundColor: 'white',
        scrollMarginTop: '80px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: tokens.spacing['4xl'] }}>
            <h2 style={{
              fontSize: '56px',
              fontWeight: 200,
              letterSpacing: '-0.03em',
              marginBottom: tokens.spacing.md,
              color: '#0F172A',
              lineHeight: 1.1
            }}>
              The science behind Coheren
            </h2>
            <p style={{
              fontSize: tokens.typography.sizes.xl,
              color: '#64748B',
              maxWidth: '650px',
              margin: '0 auto',
              lineHeight: 1.6,
              fontWeight: tokens.typography.weights.light
            }}>
              Our AI doesn't guess. It knows.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: tokens.spacing['3xl']
          }}>
            {[
              { title: 'Stanford Behavior Design Lab', desc: 'Built on proven behavior change frameworks' },
              { title: '200+ Peer-Reviewed Papers', desc: 'Research on habit formation and motivation' },
              { title: 'Dopamine Science', desc: 'Temporal motivation theory applied' },
              { title: 'Real-World Testing', desc: 'Validated with beta users' }
            ].map((item, index) => (
              <div
                key={index}
                style={{
                  padding: tokens.spacing['2xl'],
                  textAlign: 'left'
                }}
              >
                <h3 style={{
                  fontSize: tokens.typography.sizes['2xl'],
                  fontWeight: tokens.typography.weights.semibold,
                  marginBottom: tokens.spacing.md,
                  color: '#0F172A',
                  letterSpacing: '-0.02em'
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: tokens.typography.sizes.lg,
                  color: '#64748B',
                  lineHeight: 1.8,
                  fontWeight: tokens.typography.weights.light
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer - Minimal & Clean */}
      <footer style={{
        borderTop: '1px solid #E2E8F0',
        backgroundColor: 'white'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: `${tokens.spacing.xl} ${tokens.spacing['2xl']}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: tokens.spacing.xl,
          flexWrap: 'wrap'
        }}>
          {/* Left side - Full Logo */}
          <div style={{
            display: 'flex',
            alignItems: 'center'
          }}>
            <img
              src="/logo-full.svg"
              alt="Coheren"
              style={{
                width: '180px',
                height: 'auto',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>

          {/* Right side - Mailing list */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm
          }}>
            <input
              type="email"
              placeholder="Enter your email"
              style={{
                padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                border: '1px solid #E2E8F0',
                borderRadius: tokens.borderRadius.lg,
                fontSize: tokens.typography.sizes.sm,
                color: '#475569',
                outline: 'none',
                transition: 'all 0.2s',
                width: '240px'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = tokens.colors.primary;
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(67, 56, 202, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              style={{
                padding: `${tokens.spacing.sm} ${tokens.spacing.lg}`,
                background: tokens.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: tokens.borderRadius.lg,
                cursor: 'pointer',
                fontSize: tokens.typography.sizes.sm,
                fontWeight: tokens.typography.weights.medium,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = tokens.colors.primaryHover;
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = tokens.colors.primary;
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              Join Waitlist
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
