import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  X,
  MessageSquare,
  Cpu,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useStore } from '@core/store/useStore';
import { tokens } from '@core/design-system';
import { HeroSection } from './HeroSection';
import { FloatingNav } from '@shared/components/ui/floating-navbar';
import { Timeline } from '@shared/components/ui/timeline';
import { StickyScroll } from '@shared/components/ui/sticky-scroll-reveal';

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
    <div style={{ minHeight: '100vh', backgroundColor: '#FAF9F7' }}>

      <FloatingNav
        brand="coheren.ai"
        onBrandClick={() => { setStep(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        navItems={[
          { name: "How it Works", onClick: () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
          { name: "Features",     onClick: () => document.getElementById('roadmap-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
          { name: "Why Coheren",  onClick: () => document.getElementById('why-coheren')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
          { name: "Science",      onClick: () => document.getElementById('science')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
        ]}
        ctaLabel="Get Started"
        onCtaClick={() => handleGetStarted()}
      />

      <HeroSection
        badge={{
          text: "AI-powered goal coaching",
          action: {
            text: "See how it works",
            onClick: () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }),
          },
        }}
        description="AI that turns your goals into one simple task per day."
        onGoalSubmit={(goal) => handleGetStarted(goal)}
        secondaryAction={{
          text: "See how it works",
          onClick: () => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }),
        }}
      />

      {/* How It Works — Floating Card + Pinned Sticky Scroll */}
      <section id="how-it-works" className="scroll-mt-0 relative bg-transparent mt-0 pt-16 pb-24 px-4 lg:px-8">
        {/* Single spherical glow — large enough to cover end of hero + start of this section */}
        <div
          className="pointer-events-none absolute inset-x-0 flex justify-center"
          style={{ top: '-480px' }}
          aria-hidden
        >
          <div
            style={{
              width: '1100px',
              height: '1100px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, hsla(262,83%,58%,0.32) 0%, hsla(262,83%,58%,0.14) 45%, transparent 70%)',
              filter: 'blur(90px)',
            }}
          />
        </div>

        {/* Floating card */}
        <div
          className="relative mx-auto max-w-7xl rounded-[2rem] border border-white/[0.06] bg-[#0A0A0A] shadow-[0_8px_60px_-12px_rgba(0,0,0,0.5),0_2px_4px_rgba(0,0,0,0.2)]"
          style={{ overflow: "clip" }}
        >
          {/* Section header inside the card */}
          <div className="px-8 lg:px-16 pt-16 pb-4 text-center">
            <span className="mb-4 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
              How It Works
            </span>
            <h2 className="mt-4 text-4xl font-light tracking-tight text-white sm:text-5xl md:text-6xl">
              From goal to action,{' '}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                automatically.
              </span>
            </h2>
          </div>

          {/* StickyScroll — 400vh tall, inner content pinned to viewport */}
          <StickyScroll
            content={[
              {
                title: "The Brain Dump",
                description: "Don't worry about formatting. Speak naturally. Tell Coheren you want to \"Learn Python in 3 months\" or \"Write a Sci-Fi novel.\" Our RAG agents scan your input to understand the intent behind the goal.",
                content: (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6">
                    {/* Input bar mockup */}
                    <div className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 flex items-center gap-3">
                      <MessageSquare className="h-4 w-4 text-white/60 flex-shrink-0" />
                      <span className="text-sm text-white/80 font-light">I want to learn Python in 3 months</span>
                      <span className="ml-auto h-4 w-px bg-white/60 animate-pulse" />
                    </div>
                    {/* RAG tag row */}
                    <div className="flex gap-2">
                      {["Intent ✓", "Domain ✓", "Timeline ✓"].map(t => (
                        <span key={t} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium text-white/80">{t}</span>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                title: "Agentic Architecture",
                description: "This isn't a template. A swarm of AI agents collaborate to break your goal into \"Micro-Habits.\" They check for dependencies, estimate difficulty, and build a timeline that respects your actual free time.",
                content: (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6">
                    {/* Agent node diagram */}
                    <div className="relative flex items-center justify-center">
                      {/* Central node */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 border border-white/30 z-10">
                        <Cpu className="h-5 w-5 text-white" />
                      </div>
                      {/* Satellite nodes */}
                      {[
                        { label: "Goal", deg: -90 },
                        { label: "Time", deg: -10 },
                        { label: "Risk", deg: 170 },
                      ].map(({ label, deg }) => (
                        <div
                          key={label}
                          className="absolute flex h-8 w-14 items-center justify-center rounded-full bg-white/10 border border-white/20 text-[10px] font-semibold text-white/70"
                          style={{
                            transform: `rotate(${deg}deg) translateX(52px) rotate(${-deg}deg)`,
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                    <p className="text-center text-[11px] text-white/50 tracking-wide uppercase">5 agents · 1 roadmap</p>
                  </div>
                ),
              },
              {
                title: "Dynamic Recalibration",
                description: "Life happens. If you miss a task, Coheren doesn't just show a red \"X\". It shifts the roadmap. Your agents analyze why you stalled and suggest a smaller, 2-minute version of the task to get your momentum back.",
                content: (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6">
                    {/* Before row — missed */}
                    <div className="w-full rounded-lg bg-red-500/20 border border-red-400/30 px-3 py-2 flex items-center gap-2">
                      <X className="h-3.5 w-3.5 text-red-300 flex-shrink-0" />
                      <span className="text-xs text-white/60 line-through">Write 500 words · Day 4</span>
                    </div>
                    {/* Arrow */}
                    <RefreshCw className="h-4 w-4 text-white/40" />
                    {/* After row — adjusted */}
                    <div className="w-full rounded-lg bg-white/10 border border-white/20 px-3 py-2 flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 flex-shrink-0" />
                      <span className="text-xs text-white/80">Write 1 sentence · 2 min</span>
                    </div>
                    <p className="text-[10px] text-white/40 tracking-wide">Roadmap adjusted · Momentum restored</p>
                  </div>
                ),
              },
              {
                title: "The 'One' Focus",
                description: "Every morning, you get one notification. No list. No overwhelm. Just the single most important move you can make today to stay on track. Focus on the \"now,\" let the AI worry about the \"later.\"",
                content: (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-6">
                    {/* Notification card */}
                    <div className="w-full rounded-2xl bg-white/10 border border-white/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center">
                          <Zap className="h-3 w-3 text-yellow-300" />
                        </div>
                        <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Today's focus</span>
                      </div>
                      <p className="text-sm font-medium text-white leading-snug">
                        Write the opening line of Chapter 1.
                      </p>
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] text-white/40">Est. 12 min · Day 3 of 90</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-white/30 tracking-wide">Nothing else. Just this.</p>
                  </div>
                ),
              },
            ]}
          />
        </div>{/* end floating card */}
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
