import React, { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, type MotionStyle } from 'framer-motion';
import {
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
import { StickyScroll } from '@shared/components/ui/sticky-scroll-reveal';
import { Testimonials } from '@shared/components/ui/unique-testimonial';
import { MinimalFooter } from '@shared/components/ui/minimal-footer';
import { PricingSection } from '@shared/components/ui/pricing-section';

const TOTAL_FRAMES = 192;

// Scroll thresholds: each card reveals over a 0.12 window, spaced 0.2 apart
const CARD_WINDOWS = [
  [0.10, 0.22], // top-left
  [0.30, 0.42], // top-right
  [0.50, 0.62], // bottom-left
  [0.70, 0.82], // bottom-right
] as const;

const SCIENCE_CARDS = [
  {
    title: 'Stanford BJ Fogg Model',
    desc: "Built on BJ Fogg's Tiny Habits — motivation alone fails. We pair the right behavior with the right moment and make it tiny enough to always win.",
    foot: 'Motivation × Ability × Prompt',
    dot: 'bg-violet-500',
    side: 'left',
  },
  {
    title: '200+ Peer-Reviewed Papers',
    desc: 'Every nudge and recalibration is derived from published research on habit formation, self-efficacy, and intrinsic motivation.',
    stats: [['66', 'days to habit'], ['3×', 'retention'], ['91%', 'clarity']] as [string, string][],
    side: 'right',
  },
  {
    title: 'Dopamine-Loop Design',
    desc: 'Temporal Motivation Theory — urgency and reward proximity drive action. One task per day creates a dopamine loop your brain learns to crave.',
    bars: true,
    side: 'left',
  },
  {
    title: 'Real-World Testing',
    desc: 'Stress-tested across goals from "run a marathon" to "learn ML" — in every case the AI adapted without breaking.',
    foot: 'Fitness · Writing · Coding · Finance · Language',
    dot: 'bg-amber-500',
    side: 'right',
  },
] as const;

function ScienceCard({ card, style }: { card: typeof SCIENCE_CARDS[number]; style: MotionStyle }) {
  return (
    <motion.div
      style={style}
      className="flex-1 flex flex-col justify-center gap-1 text-center cursor-default"
      whileHover={{ scale: 1.12 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <h3 className="text-base font-semibold text-white leading-tight tracking-tight">{card.title}</h3>
      <p className="text-sm text-white/55 leading-snug">{card.desc}</p>
    </motion.div>
  );
}

function ScienceSection({ wrapperRef }: { wrapperRef: React.RefObject<HTMLDivElement | null> }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  });

  // Drive frame index imperatively (no re-render)
  useEffect(() => {
    return scrollYProgress.on('change', v => {
      if (!imgRef.current) return;
      const idx = Math.min(Math.floor(v * TOTAL_FRAMES), TOTAL_FRAMES - 1);
      imgRef.current.src = `/science-frames/frame_${String(idx).padStart(4, '0')}.jpg`;
    });
  }, [scrollYProgress]);

  // Each card: opacity + translate from its respective side
  const c0Opacity = useTransform(scrollYProgress, [CARD_WINDOWS[0][0], CARD_WINDOWS[0][1]], [0, 1]);
  const c0X      = useTransform(scrollYProgress, [CARD_WINDOWS[0][0], CARD_WINDOWS[0][1]], [-32, 0]);
  const c1Opacity = useTransform(scrollYProgress, [CARD_WINDOWS[1][0], CARD_WINDOWS[1][1]], [0, 1]);
  const c1X      = useTransform(scrollYProgress, [CARD_WINDOWS[1][0], CARD_WINDOWS[1][1]], [32, 0]);
  const c2Opacity = useTransform(scrollYProgress, [CARD_WINDOWS[2][0], CARD_WINDOWS[2][1]], [0, 1]);
  const c2X      = useTransform(scrollYProgress, [CARD_WINDOWS[2][0], CARD_WINDOWS[2][1]], [-32, 0]);
  const c3Opacity = useTransform(scrollYProgress, [CARD_WINDOWS[3][0], CARD_WINDOWS[3][1]], [0, 1]);
  const c3X      = useTransform(scrollYProgress, [CARD_WINDOWS[3][0], CARD_WINDOWS[3][1]], [32, 0]);

  const cardMotionStyles = [
    { opacity: c0Opacity, x: c0X },
    { opacity: c1Opacity, x: c1X },
    { opacity: c2Opacity, x: c2X },
    { opacity: c3Opacity, x: c3X },
  ] as const;

  return (
    // Sticky inside the 500vh wrapper — stays pinned to top for the full scroll range
    <section
      id="science"
      className="sticky top-0 z-10 h-screen scroll-mt-20 flex flex-col items-center justify-center px-6 gap-6 overflow-hidden"
      style={{ backgroundColor: '#000000' }}
    >
      {/* Heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center"
      >
        <h2 className="text-4xl font-light tracking-tight text-white sm:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          The science behind Coheren
        </h2>
        <p className="mt-3 text-base text-white/40 max-w-md mx-auto leading-relaxed font-light">
          Our AI doesn't guess. It knows.
        </p>
      </motion.div>

      {/* Brain full-width, cards overlaid on top */}
      <div className="relative w-full max-w-6xl">

        {/* Brain — fills the container */}
        <img
          ref={imgRef}
          src="/science-frames/frame_0000.jpg"
          className="w-full"
          style={{ aspectRatio: '16/9', display: 'block', mixBlendMode: 'screen' }}
          alt="Brain animation"
        />

        {/* Cover bottom-left watermark */}
        <div className="absolute bottom-0 left-0 w-32 h-14 bg-black" />

        {/* Left column — pinned top to bottom, cards fill equally */}
        <div className="absolute top-4 bottom-4 left-4 w-[26%] flex flex-col gap-3">
          <ScienceCard card={SCIENCE_CARDS[0]} style={cardMotionStyles[0] as MotionStyle} />
          <ScienceCard card={SCIENCE_CARDS[2]} style={cardMotionStyles[2] as MotionStyle} />
        </div>

        {/* Right column */}
        <div className="absolute bottom-0 right-0 w-[28%] h-[30%] bg-black" />
        <div className="absolute top-4 bottom-4 right-4 w-[26%] flex flex-col gap-3">
          <ScienceCard card={SCIENCE_CARDS[1]} style={cardMotionStyles[1] as MotionStyle} />
          <ScienceCard card={SCIENCE_CARDS[3]} style={cardMotionStyles[3] as MotionStyle} />
        </div>

      </div>
    </section>
  );
}

interface LandingPageProps {
  onGetStarted?: (goal: string) => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const setStep = useStore((state) => state.setStep);
  const [goalInput] = useState('');
  const scienceWrapperRef = useRef<HTMLDivElement>(null);
  const pricingWrapperRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: pricingScrollYProgress } = useScroll({
    target: pricingWrapperRef,
    offset: ['start start', 'end end'],
  });
  const pricingX = useTransform(pricingScrollYProgress, [0, 0.6], ['100%', '0%']);

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
      <section id="how-it-works" className="scroll-mt-0 relative z-10 bg-transparent mt-0 pt-16 pb-0 px-4 lg:px-8">

        {/* Floating card — slides over the pinned hero like a curtain */}
        <div
          className="relative mx-auto max-w-7xl rounded-[2.5rem] border border-white/[0.06] bg-[#0A0A0A] shadow-[0_-24px_80px_-8px_rgba(0,0,0,0.6),0_8px_60px_-12px_rgba(0,0,0,0.5)]"
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
        zIndex: 10,
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
        position: 'relative',
        zIndex: 10,
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


      {/* 600vh wrapper: science is sticky 0→600vh; testimonials slide in from 500vh, covering science */}
      <div ref={scienceWrapperRef} style={{ height: '600vh', position: 'relative', backgroundColor: '#000000' }}>
        <ScienceSection wrapperRef={scienceWrapperRef} />
        {/* Testimonials start at 500vh inside the wrapper — they scroll into view from below
            while science is still pinned, producing the curtain effect */}
        <div style={{ position: 'absolute', top: '500vh', left: 0, right: 0, zIndex: 20 }}>
          <Testimonials />
        </div>
      </div>

      {/* Pricing curtain slides in from right over testimonials — 300vh scroll window */}
      <div ref={pricingWrapperRef} style={{ height: '300vh', position: 'relative' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>

          {/* GIF backdrop — plays automatically, pricing curtain covers it */}
          <img
            src="/backdrop.gif"
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              zIndex: 0,
            }}
          />

          <motion.div
            style={{
              position: 'absolute', inset: 0,
              x: pricingX,
              zIndex: 30,
              backgroundColor: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderRadius: '3rem 0 0 3rem',
              boxShadow: '-50px 0 100px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            <PricingSection />
          </motion.div>
        </div>
      </div>

      <MinimalFooter />
    </div>
  );
}
