import { useState } from 'react';
import { motion } from 'framer-motion';
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
import { GlowingEffect } from '@shared/components/ui/glowing-effect';

interface LandingPageProps {
  onGetStarted?: (goal: string) => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const setStep = useStore((state) => state.setStep);
  const [goalInput] = useState('');

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


      {/* The Science Behind Coheren */}
      <section id="science" className="relative z-10 overflow-hidden py-24 px-4 lg:px-8 scroll-mt-20" style={{ backgroundColor: '#0A0A0A' }}>
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-light tracking-tight text-white sm:text-6xl" style={{ letterSpacing: '-0.03em' }}>
              The science behind Coheren
            </h2>
            <p className="mt-4 text-lg text-white/40 max-w-xl mx-auto leading-relaxed font-light">
              Our AI doesn't guess. It knows.
            </p>
          </motion.div>

          {/* 2×2 grid — curtain reveal from center outwards */}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Stanford BJ Fogg Model',
                desc: "Coheren's task engine is built directly on BJ Fogg's Tiny Habits research — motivation alone fails. We pair the right behavior with the right moment and make it tiny enough to always win.",
                foot: 'Motivation × Ability × Prompt',
                dot: 'bg-violet-500',
              },
              {
                title: '200+ Peer-Reviewed Papers',
                desc: 'Every nudge, cadence, and recalibration is derived from published research on habit formation, self-efficacy, and intrinsic motivation — not guesswork.',
                stats: [['66', 'days avg to habit'], ['3×', 'higher retention'], ['91%', 'clarity']],
              },
              {
                title: 'Dopamine-Loop Design',
                desc: 'We apply Temporal Motivation Theory — urgency and reward proximity drive action. One task per day creates a daily dopamine loop your brain learns to crave.',
                bars: true,
              },
              {
                title: 'Real-World Testing',
                desc: 'Stress-tested across goals from "run a marathon" to "write a novel" to "learn ML" — in every case the AI adapted without breaking.',
                foot: 'Fitness · Writing · Coding · Finance · Language',
                dot: 'bg-amber-500',
              },
            ].map((card, index) => (
              <motion.li
                key={index}
                className="min-h-[18rem] list-none"
                initial={{ opacity: 0, scale: 0.88 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative h-full rounded-2xl border border-white/[0.08] bg-white/[0.03] p-2 transition-all duration-300 hover:border-violet-500/40">
                  <GlowingEffect spread={36} glow proximity={80} inactiveZone={0.01} borderWidth={2} disabled={false} />
                  <div className="relative flex h-full flex-col justify-between gap-4 overflow-hidden rounded-xl border border-white/[0.05] bg-white/[0.02] p-7">
                    <div className="flex flex-col gap-3">
                      <h3 className="text-xl font-semibold text-white leading-snug tracking-tight">{card.title}</h3>
                      <p className="text-sm text-white/50 leading-relaxed">{card.desc}</p>
                    </div>
                    {card.foot && (
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${card.dot}`} />
                        <span className="text-xs text-white/30">{card.foot}</span>
                      </div>
                    )}
                    {card.stats && (
                      <div className="flex items-center gap-6">
                        {card.stats.map(([stat, label]) => (
                          <div key={label} className="flex flex-col">
                            <span className="text-base font-bold text-white">{stat}</span>
                            <span className="text-[10px] text-white/30 leading-tight">{label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {card.bars && (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`h-1.5 rounded-full ${i <= 4 ? 'bg-emerald-500' : 'bg-white/10'}`} style={{ width: `${i * 6}px` }} />
                          ))}
                        </div>
                        <span className="text-xs text-white/30">momentum builds daily</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white pb-6 pt-16 lg:pb-8 lg:pt-24">
        <div className="px-4 lg:px-8 max-w-7xl mx-auto">
          {/* Top row: brand + social */}
          <div className="md:flex md:items-start md:justify-between">
            <a href="/" className="flex items-center gap-x-2" aria-label="coheren.ai">
              <img src="/logo-full.svg" alt="Coheren" className="h-7 w-auto" />
            </a>
            <ul className="flex list-none mt-6 md:mt-0 space-x-3">
              {[
                { label: 'Twitter', href: 'https://twitter.com', icon: (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                )},
                { label: 'LinkedIn', href: 'https://linkedin.com', icon: (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                )},
              ].map((link, i) => (
                <li key={i}>
                  <a
                    href={link.href}
                    target="_blank"
                    aria-label={link.label}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900"
                  >
                    {link.icon}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom row: copyright + nav + legal */}
          <div className="border-t border-slate-100 mt-6 pt-6 md:mt-4 md:pt-8 lg:grid lg:grid-cols-10">
            {/* Copyright — left col */}
            <div className="mt-6 text-sm leading-6 text-slate-400 whitespace-nowrap lg:mt-0 lg:row-[1/3] lg:col-[1/4]">
              <div>© {new Date().getFullYear()} coheren.ai</div>
              <div>All rights reserved.</div>
            </div>

            {/* Main nav links */}
            <nav className="lg:mt-0 lg:col-[4/11]">
              <ul className="list-none flex flex-wrap -my-1 -mx-2 lg:justify-end">
                {[
                  { label: 'How it Works', href: '#how-it-works' },
                  { label: 'Features', href: '#roadmap-preview' },
                  { label: 'Why Coheren', href: '#why-coheren' },
                  { label: 'Science', href: '#science' },
                ].map((link, i) => (
                  <li key={i} className="my-1 mx-2 shrink-0">
                    <a
                      href={link.href}
                      onClick={(e) => { e.preventDefault(); document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' }); }}
                      className="text-sm text-slate-700 underline-offset-4 hover:underline"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            {/* Legal links */}
            <div className="mt-6 lg:mt-0 lg:col-[4/11]">
              <ul className="list-none flex flex-wrap -my-1 -mx-3 lg:justify-end">
                {[
                  { label: 'Privacy Policy', href: '#' },
                  { label: 'Terms of Service', href: '#' },
                ].map((link, i) => (
                  <li key={i} className="my-1 mx-3 shrink-0">
                    <a href={link.href} className="text-sm text-slate-400 underline-offset-4 hover:underline">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
