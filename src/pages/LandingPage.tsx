import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Target,
  CheckCircle2,
  Brain,
  Zap,
  Shield,
  Mail,
  Lock,
  X,
  ChevronDown,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { tokens } from '../design-system';

export default function LandingPage() {
  const setStep = useStore((state) => state.setStep);
  const [goalInput, setGoalInput] = useState('');
  const [showFAQ, setShowFAQ] = useState<number | null>(null);

  const handleGetStarted = (customGoal?: string) => {
    if (customGoal || goalInput.trim()) {
      // Could store the goal here if needed
      setStep(1); // Go to ChatOnboarding
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && goalInput.trim()) {
      handleGetStarted();
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFBFC', overflow: 'hidden' }}>
      {/* Subtle background gradient */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(circle at 20% 10%, rgba(67, 56, 202, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.02) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      {/* Navigation */}
      <nav style={{
        position: 'relative',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: `${tokens.spacing.xl} ${tokens.spacing['2xl']}`,
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <button
          onClick={() => {
            setStep(0);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.sm,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0
          }}
        >
          <img
            src="/logo.png"
            alt="Coheren"
            style={{
              height: '40px',
              width: 'auto',
              objectFit: 'contain'
            }}
          />
        </button>

        <button
          onClick={() => handleGetStarted()}
          style={{
            padding: `${tokens.spacing.sm} ${tokens.spacing.xl}`,
            background: tokens.colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: tokens.borderRadius.lg,
            cursor: 'pointer',
            fontSize: tokens.typography.sizes.base,
            fontWeight: tokens.typography.weights.medium,
            display: 'flex',
            alignItems: 'center',
            gap: tokens.spacing.xs
          }}
        >
          Start <ArrowRight size={16} />
        </button>
      </nav>

      {/* Hero Section - Redesigned */}
      <section style={{
        position: 'relative',
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        textAlign: 'center',
        maxWidth: '900px',
        margin: '0 auto'
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 style={{
            fontSize: '64px',
            fontWeight: tokens.typography.weights.thin,
            letterSpacing: '-0.03em',
            marginBottom: tokens.spacing.lg,
            color: '#0F172A',
            lineHeight: 1.1
          }}>
            Think less. Do more.
          </h1>

          <p style={{
            fontSize: tokens.typography.sizes.xl,
            fontWeight: tokens.typography.weights.light,
            color: '#475569',
            marginBottom: tokens.spacing['3xl'],
            lineHeight: 1.6
          }}>
            AI that turns your goals into one simple task per day.
          </p>

          {/* Direct input field */}
          <div style={{
            maxWidth: '600px',
            margin: '0 auto',
            marginBottom: tokens.spacing.xl
          }}>
            <div style={{
              display: 'flex',
              gap: tokens.spacing.sm,
              padding: tokens.spacing.xs,
              backgroundColor: 'white',
              borderRadius: tokens.borderRadius.xl,
              border: '2px solid #E2E8F0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              transition: 'all 0.3s'
            }}>
              <input
                type="text"
                placeholder="What's your goal?"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                  border: 'none',
                  outline: 'none',
                  fontSize: tokens.typography.sizes.lg,
                  backgroundColor: 'transparent',
                  color: '#0F172A'
                }}
              />
              <button
                onClick={() => handleGetStarted()}
                disabled={!goalInput.trim()}
                style={{
                  padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                  background: goalInput.trim() ? tokens.colors.primary : '#CBD5E1',
                  color: 'white',
                  border: 'none',
                  borderRadius: tokens.borderRadius.lg,
                  cursor: goalInput.trim() ? 'pointer' : 'not-allowed',
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.medium,
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing.xs,
                  transition: 'all 0.2s'
                }}
              >
                <ArrowRight size={20} />
              </button>
            </div>
          </div>

          {/* Quick examples */}
          <div style={{
            display: 'flex',
            gap: tokens.spacing.md,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginBottom: tokens.spacing.sm
          }}>
            <span style={{ fontSize: tokens.typography.sizes.sm, color: '#64748B' }}>or try:</span>
            {['Learn guitar', 'Get fit', 'Learn to code'].map((example) => (
              <button
                key={example}
                onClick={() => handleGetStarted(example)}
                style={{
                  padding: `${tokens.spacing.xs} ${tokens.spacing.md}`,
                  backgroundColor: 'white',
                  border: '1px solid #E2E8F0',
                  borderRadius: tokens.borderRadius.full,
                  cursor: 'pointer',
                  fontSize: tokens.typography.sizes.sm,
                  color: '#475569',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = tokens.colors.primary;
                  e.currentTarget.style.color = tokens.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                {example}
              </button>
            ))}
          </div>

          <p style={{
            fontSize: tokens.typography.sizes.sm,
            color: '#94A3B8',
            marginTop: tokens.spacing.md
          }}>
            No signup required to start
          </p>
        </motion.div>
      </section>

      {/* How It Works - Redesigned with specifics */}
      <section style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        backgroundColor: 'white'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
              How Coheren works
            </h2>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: tokens.spacing['3xl']
          }}>
            {/* Step 1 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              style={{
                padding: tokens.spacing['2xl'],
                textAlign: 'left'
              }}
            >
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: tokens.colors.primary + '15',
                color: tokens.colors.primary,
                fontSize: tokens.typography.sizes.xl,
                fontWeight: tokens.typography.weights.medium,
                marginBottom: tokens.spacing.lg
              }}>
                1
              </div>

              <h3 style={{
                fontSize: tokens.typography.sizes['2xl'],
                fontWeight: tokens.typography.weights.medium,
                marginBottom: tokens.spacing.md,
                color: '#0F172A'
              }}>
                Tell us your goal
              </h3>

              <p style={{
                fontSize: tokens.typography.sizes.base,
                color: '#64748B',
                lineHeight: 1.7,
                marginBottom: tokens.spacing.lg
              }}>
                "I want to learn guitar"
              </p>

              <p style={{
                fontSize: tokens.typography.sizes.sm,
                color: '#94A3B8',
                lineHeight: 1.6,
                marginBottom: tokens.spacing.sm
              }}>
                AI asks: Your schedule? Energy patterns? Experience level?
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: tokens.spacing.xs,
                padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                backgroundColor: '#F1F5F9',
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.sizes.xs,
                color: '#64748B',
                fontWeight: tokens.typography.weights.medium
              }}>
                <Clock size={12} />5 minutes
              </div>
            </motion.div>

            {/* Step 2 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{
                padding: tokens.spacing['2xl'],
                textAlign: 'left'
              }}
            >
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: tokens.colors.primary + '15',
                color: tokens.colors.primary,
                fontSize: tokens.typography.sizes.xl,
                fontWeight: tokens.typography.weights.medium,
                marginBottom: tokens.spacing.lg
              }}>
                2
              </div>

              <h3 style={{
                fontSize: tokens.typography.sizes['2xl'],
                fontWeight: tokens.typography.weights.medium,
                marginBottom: tokens.spacing.md,
                color: '#0F172A'
              }}>
                We plan everything
              </h3>

              <p style={{
                fontSize: tokens.typography.sizes.base,
                color: '#64748B',
                lineHeight: 1.7,
                marginBottom: tokens.spacing.sm
              }}>
                AI analyzes behavioral research + your life context
              </p>

              <p style={{
                fontSize: tokens.typography.sizes.base,
                color: '#64748B',
                lineHeight: 1.7,
                marginBottom: tokens.spacing.lg
              }}>
                Creates 180-day roadmap with daily tasks
              </p>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: tokens.spacing.xs,
                padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                backgroundColor: '#F1F5F9',
                borderRadius: tokens.borderRadius.md,
                fontSize: tokens.typography.sizes.xs,
                color: '#64748B',
                fontWeight: tokens.typography.weights.medium
              }}>
                <Zap size={12} />Instant
              </div>
            </motion.div>

            {/* Step 3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{
                padding: tokens.spacing['2xl'],
                textAlign: 'left'
              }}
            >
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: tokens.colors.primary + '15',
                color: tokens.colors.primary,
                fontSize: tokens.typography.sizes.xl,
                fontWeight: tokens.typography.weights.medium,
                marginBottom: tokens.spacing.lg
              }}>
                3
              </div>

              <h3 style={{
                fontSize: tokens.typography.sizes['2xl'],
                fontWeight: tokens.typography.weights.medium,
                marginBottom: tokens.spacing.md,
                color: '#0F172A'
              }}>
                You just show up
              </h3>

              <p style={{
                fontSize: tokens.typography.sizes.base,
                color: '#64748B',
                lineHeight: 1.7,
                marginBottom: tokens.spacing.sm
              }}>
                Every day: one task, perfectly sized for you
              </p>

              <p style={{
                fontSize: tokens.typography.sizes.base,
                color: '#64748B',
                lineHeight: 1.7,
                marginBottom: tokens.spacing.sm
              }}>
                Complete it. Tomorrow's task appears.
              </p>

              <p style={{
                fontSize: tokens.typography.sizes.base,
                color: '#0F172A',
                lineHeight: 1.7,
                fontWeight: tokens.typography.weights.medium,
                marginTop: tokens.spacing.md
              }}>
                No decisions. No planning. Just consistency.
              </p>
            </motion.div>
          </div>

          {/* CTA */}
          <div style={{ textAlign: 'center', marginTop: tokens.spacing['4xl'] }}>
            <button
              onClick={() => handleGetStarted()}
              style={{
                padding: `${tokens.spacing.lg} ${tokens.spacing['2xl']}`,
                background: tokens.colors.primary,
                color: 'white',
                border: 'none',
                borderRadius: tokens.borderRadius.xl,
                cursor: 'pointer',
                fontSize: tokens.typography.sizes.lg,
                fontWeight: tokens.typography.weights.medium,
                display: 'inline-flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
                boxShadow: '0 4px 16px rgba(67, 56, 202, 0.3)'
              }}
            >
              Create my roadmap <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>

      {/* Example Roadmap Section - NEW */}
      <section style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        backgroundColor: '#FAFBFC'
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
            transition={{ duration: 0.6 }}
            style={{
              backgroundColor: 'white',
              borderRadius: tokens.borderRadius['2xl'],
              padding: tokens.spacing['2xl'],
              boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
              border: '1px solid #E2E8F0'
            }}
          >
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

            {/* Footer */}
            <div style={{
              marginTop: tokens.spacing['2xl'],
              padding: tokens.spacing.lg,
              backgroundColor: '#F8FAFC',
              borderRadius: tokens.borderRadius.lg,
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: tokens.typography.sizes.base,
                color: '#475569',
                marginBottom: tokens.spacing.sm
              }}>
                This is custom-generated for YOUR schedule, experience level, and learning style.
              </p>
              <button
                onClick={() => handleGetStarted()}
                style={{
                  marginTop: tokens.spacing.md,
                  padding: `${tokens.spacing.sm} ${tokens.spacing.xl}`,
                  background: tokens.colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: tokens.borderRadius.lg,
                  cursor: 'pointer',
                  fontSize: tokens.typography.sizes.base,
                  fontWeight: tokens.typography.weights.medium,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: tokens.spacing.xs
                }}
              >
                Create my roadmap <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Not Another Todo App - Problem/Solution Format */}
      <section style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        backgroundColor: 'white'
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

      {/* FAQ Section - NEW */}
      <section style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        backgroundColor: '#FAFBFC'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
              color: '#0F172A'
            }}>
              Questions?
            </h2>
          </motion.div>

          <div style={{ display: 'grid', gap: tokens.spacing.md }}>
            {[
              {
                q: 'How long does it take?',
                a: '5 minutes to chat with AI, then one daily task (10-30 min).'
              },
              {
                q: 'What if I skip a day?',
                a: 'No guilt. AI adjusts your plan. Just pick up tomorrow.'
              },
              {
                q: 'Can I change my goal mid-journey?',
                a: 'Yes. AI rebuilds your roadmap from current progress.'
              },
              {
                q: 'What if I have no time?',
                a: 'Tell us your schedule. We create 10-min tasks if needed.'
              },
              {
                q: 'Is my data private?',
                a: 'Your goals and progress are private. We never sell data.'
              }
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                style={{
                  backgroundColor: 'white',
                  borderRadius: tokens.borderRadius.xl,
                  padding: tokens.spacing.xl,
                  border: '1px solid #E2E8F0',
                  cursor: 'pointer'
                }}
                onClick={() => setShowFAQ(showFAQ === index ? null : index)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: tokens.spacing.md
                }}>
                  <h3 style={{
                    fontSize: tokens.typography.sizes.lg,
                    fontWeight: tokens.typography.weights.medium,
                    color: '#0F172A'
                  }}>
                    {faq.q}
                  </h3>
                  <ChevronDown
                    size={20}
                    style={{
                      transform: showFAQ === index ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s',
                      color: '#94A3B8'
                    }}
                  />
                </div>
                {showFAQ === index && (
                  <p style={{
                    marginTop: tokens.spacing.md,
                    fontSize: tokens.typography.sizes.base,
                    color: '#64748B',
                    lineHeight: 1.6
                  }}>
                    {faq.a}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Science Behind Coheren - NEW (replaces fake stats) */}
      <section style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        backgroundColor: 'white'
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
              marginBottom: tokens.spacing.lg,
              color: '#0F172A'
            }}>
              The science behind Coheren
            </h2>
            <p style={{
              fontSize: tokens.typography.sizes.lg,
              color: '#64748B',
              maxWidth: '700px',
              margin: '0 auto'
            }}>
              Our AI doesn't guess. It knows.
            </p>
          </motion.div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: tokens.spacing['2xl']
          }}>
            {[
              { icon: Brain, title: 'Stanford Behavior Design Lab', desc: 'Built on proven behavior change frameworks' },
              { icon: Target, title: '200+ Peer-Reviewed Papers', desc: 'Research on habit formation and motivation' },
              { icon: Lightbulb, title: 'Dopamine Science', desc: 'Temporal motivation theory applied' },
              { icon: BarChart3, title: 'Real-World Testing', desc: 'Validated with beta users' }
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  style={{
                    padding: tokens.spacing.xl,
                    textAlign: 'center'
                  }}
                >
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: tokens.borderRadius.xl,
                    backgroundColor: tokens.colors.primary + '10',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    marginBottom: tokens.spacing.md
                  }}>
                    <Icon size={28} color={tokens.colors.primary} strokeWidth={1.5} />
                  </div>
                  <h3 style={{
                    fontSize: tokens.typography.sizes.lg,
                    fontWeight: tokens.typography.weights.medium,
                    marginBottom: tokens.spacing.sm,
                    color: '#0F172A'
                  }}>
                    {item.title}
                  </h3>
                  <p style={{
                    fontSize: tokens.typography.sizes.sm,
                    color: '#64748B',
                    lineHeight: 1.6
                  }}>
                    {item.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA - Redesigned */}
      <section style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        backgroundColor: '#0F172A',
        textAlign: 'center'
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 style={{
              fontSize: tokens.typography.sizes['4xl'],
              fontWeight: tokens.typography.weights.light,
              letterSpacing: '-0.02em',
              marginBottom: tokens.spacing.lg,
              color: 'white'
            }}>
              Start building consistency
            </h2>

            {/* Repeat input field */}
            <div style={{
              maxWidth: '600px',
              margin: '0 auto',
              marginBottom: tokens.spacing.lg
            }}>
              <div style={{
                display: 'flex',
                gap: tokens.spacing.sm,
                padding: tokens.spacing.xs,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: tokens.borderRadius.xl,
                border: '2px solid rgba(255, 255, 255, 0.2)'
              }}>
                <input
                  type="text"
                  placeholder="What's your goal?"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  style={{
                    flex: 1,
                    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
                    border: 'none',
                    outline: 'none',
                    fontSize: tokens.typography.sizes.lg,
                    backgroundColor: 'transparent',
                    color: 'white'
                  }}
                />
                <button
                  onClick={() => handleGetStarted()}
                  disabled={!goalInput.trim()}
                  style={{
                    padding: `${tokens.spacing.md} ${tokens.spacing.xl}`,
                    background: goalInput.trim() ? 'white' : 'rgba(255, 255, 255, 0.2)',
                    color: goalInput.trim() ? tokens.colors.primary : 'rgba(255, 255, 255, 0.5)',
                    border: 'none',
                    borderRadius: tokens.borderRadius.lg,
                    cursor: goalInput.trim() ? 'pointer' : 'not-allowed',
                    fontSize: tokens.typography.sizes.base,
                    fontWeight: tokens.typography.weights.medium,
                    display: 'flex',
                    alignItems: 'center',
                    gap: tokens.spacing.xs
                  }}
                >
                  <ArrowRight size={20} />
                </button>
              </div>
            </div>

            <p style={{
              fontSize: tokens.typography.sizes.sm,
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              No signup required to start
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer - Trust Signals */}
      <footer style={{
        padding: `${tokens.spacing['2xl']} ${tokens.spacing.xl}`,
        backgroundColor: '#0F172A',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: tokens.spacing['2xl'],
            marginBottom: tokens.spacing.lg,
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.xs,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: tokens.typography.sizes.sm
            }}>
              <Lock size={14} />
              <span>Your data is encrypted and private</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.xs,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: tokens.typography.sizes.sm
            }}>
              <Mail size={14} />
              <span>hello@coheren.ai</span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.xs,
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: tokens.typography.sizes.sm
            }}>
              <Shield size={14} />
              <span>Made in India, used globally</span>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: tokens.spacing.xl,
            fontSize: tokens.typography.sizes.xs,
            color: 'rgba(255, 255, 255, 0.4)'
          }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Security</a>
          </div>

          <p style={{
            marginTop: tokens.spacing.lg,
            fontSize: tokens.typography.sizes.xs,
            color: 'rgba(255, 255, 255, 0.3)'
          }}>
            © 2024 Coheren. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Clock({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}
