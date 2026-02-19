import React, { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  X,
  MessageSquare,
  Cpu,
  RefreshCw,
  Zap,
  Bot,
  Flame,
  TrendingUp,
  BookOpen,
  Send,
  LayoutDashboard,
  Target,
  Map,
  BarChart2,
  ChevronRight,
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


// Scroll windows for each card: [fadeIn start, fadeIn end]
// Cards appear in order: Stanford(0) → 200+Papers(1) → Dopamine(2) → RealWorld(3)
const CARD_SCROLL_WINDOWS = [
  [0.05, 0.18], // Stanford BJ Fogg  — left top
  [0.22, 0.35], // 200+ Papers       — right top
  [0.39, 0.52], // Dopamine Loop     — left bottom
  [0.56, 0.69], // Real-World        — right bottom
] as const;

function ScienceSection({ wrapperRef }: { wrapperRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Hold decoded Image objects — once loaded they stay decoded in memory
  const framesRef = useRef<HTMLImageElement[]>([]);
  const loadedRef = useRef<boolean[]>([]);

  const { scrollYProgress } = useScroll({
    target: wrapperRef,
    offset: ['start start', 'end end'],
  });

  // Preload + decode all frames. Storing loaded Image objects means canvas.drawImage
  // is a GPU blit — no network fetch, no JPG decode at scroll time.
  useEffect(() => {
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES);
    const loaded: boolean[] = new Array(TOTAL_FRAMES).fill(false);
    framesRef.current = images;
    loadedRef.current = loaded;

    // Draw first frame as soon as it's ready
    const first = new Image();
    first.onload = () => {
      loaded[0] = true;
      images[0] = first;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = first.naturalWidth;
        canvas.height = first.naturalHeight;
        canvas.getContext('2d')?.drawImage(first, 0, 0);
      }
    };
    first.src = `/science-frames/frame_0000.jpg`;

    // Load remaining frames in background
    for (let i = 1; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      const idx = i;
      img.onload = () => { loaded[idx] = true; images[idx] = img; };
      img.src = `/science-frames/frame_${String(i).padStart(4, '0')}.jpg`;
    }
  }, []);

  // Drive frame index — canvas.drawImage is a direct GPU blit, no decode cost
  useEffect(() => {
    return scrollYProgress.on('change', v => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const idx = Math.min(Math.floor(v * TOTAL_FRAMES), TOTAL_FRAMES - 1);
      const img = framesRef.current[idx];
      if (!img || !loadedRef.current[idx]) return;
      canvas.getContext('2d')?.drawImage(img, 0, 0);
    });
  }, [scrollYProgress]);

  // Per-card scroll-driven opacity + x (left cards slide from left, right from right)
  const c0Opacity = useTransform(scrollYProgress, [CARD_SCROLL_WINDOWS[0][0], CARD_SCROLL_WINDOWS[0][1]], [0, 1]);
  const c0X      = useTransform(scrollYProgress, [CARD_SCROLL_WINDOWS[0][0], CARD_SCROLL_WINDOWS[0][1]], [-24, 0]);
  const c1Opacity = useTransform(scrollYProgress, [CARD_SCROLL_WINDOWS[1][0], CARD_SCROLL_WINDOWS[1][1]], [0, 1]);
  const c1X      = useTransform(scrollYProgress, [CARD_SCROLL_WINDOWS[1][0], CARD_SCROLL_WINDOWS[1][1]], [24, 0]);
  const c2Opacity = useTransform(scrollYProgress, [CARD_SCROLL_WINDOWS[2][0], CARD_SCROLL_WINDOWS[2][1]], [0, 1]);
  const c2X      = useTransform(scrollYProgress, [CARD_SCROLL_WINDOWS[2][0], CARD_SCROLL_WINDOWS[2][1]], [-24, 0]);
  const c3Opacity = useTransform(scrollYProgress, [CARD_SCROLL_WINDOWS[3][0], CARD_SCROLL_WINDOWS[3][1]], [0, 1]);
  const c3X      = useTransform(scrollYProgress, [CARD_SCROLL_WINDOWS[3][0], CARD_SCROLL_WINDOWS[3][1]], [24, 0]);

  const cardMotion = [
    { opacity: c0Opacity, x: c0X },
    { opacity: c1Opacity, x: c1X },
    { opacity: c2Opacity, x: c2X },
    { opacity: c3Opacity, x: c3X },
  ];

  return (
    // Sticky inside the 600vh wrapper — stays pinned to top for the full scroll range
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

        {/* Brain — canvas for lag-free GPU frame blitting */}
        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ aspectRatio: '16/9', display: 'block', mixBlendMode: 'screen' }}
        />

        {/* Cover bottom-left watermark */}
        <div className="absolute bottom-0 left-0 w-32 h-14 bg-black" />

        {/* Left column — cards [0] Stanford, [2] Dopamine */}
        <div className="absolute top-4 bottom-4 left-4 w-[26%] flex flex-col gap-3">
          {([0, 2] as const).map((cardIdx) => (
            <motion.div
              key={cardIdx}
              style={cardMotion[cardIdx]}
              className="flex-1 flex flex-col justify-center gap-1.5 text-center group cursor-default hover:scale-110 transition-transform duration-300 ease-out"
            >
              <p className="text-[10px] sm:text-base font-semibold text-white leading-tight">{SCIENCE_CARDS[cardIdx].title}</p>
              <p className="hidden sm:block text-xs sm:text-sm text-white/55 leading-snug group-hover:text-white/80 transition-colors duration-300">{SCIENCE_CARDS[cardIdx].desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Right column — cards [1] 200+, [3] Real-World */}
        <div className="absolute bottom-0 right-0 w-[28%] h-[30%] bg-black hidden sm:block" />
        <div className="absolute top-4 bottom-4 right-4 w-[26%] flex flex-col gap-3">
          {([1, 3] as const).map((cardIdx) => (
            <motion.div
              key={cardIdx}
              style={cardMotion[cardIdx]}
              className="flex-1 flex flex-col justify-center gap-1.5 text-center group cursor-default hover:scale-110 transition-transform duration-300 ease-out"
            >
              <p className="text-[10px] sm:text-base font-semibold text-white leading-tight">{SCIENCE_CARDS[cardIdx].title}</p>
              <p className="hidden sm:block text-xs sm:text-sm text-white/55 leading-snug group-hover:text-white/80 transition-colors duration-300">{SCIENCE_CARDS[cardIdx].desc}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}

// ─── Coheren Demo Section (Chat + Agent Panel) ───────────────────────────────

const CHAT_MESSAGES = [
  { role: 'user' as const, text: "I want to learn guitar — I'm a complete beginner." },
  { role: 'ai'   as const, text: "Love that goal. How much time can you give it each day, and when's your deadline?" },
  { role: 'user' as const, text: "About 30 minutes a day. I'd like to be decent in 3 months." },
  { role: 'ai'   as const, text: "Perfect — 90 days, 30 min/day. I'm mapping your obstacles and building your roadmap now 🎸" },
];

const AGENT_STEPS = [
  { label: 'Goal analyzed',       detail: 'Guitar · Beginner · 90 days',  triggerAt: 2 },
  { label: 'Obstacles mapped',    detail: 'Finger pain · Consistency',     triggerAt: 3 },
  { label: '90-day plan built',   detail: '4 phases · 90 daily tasks',     triggerAt: 4 },
  { label: 'Day 1 task ready',    detail: 'PRACTICE · 15 min',             triggerAt: 'task' as const },
];

function CoherenDemoSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView]           = useState(false);
  const [visibleMsg, setVisibleMsg]   = useState(0);
  const [taskVisible, setTaskVisible] = useState(false);
  const [activeScreen, setActiveScreen] = useState(0); // 0 = chat, 1 = dashboard

  // Scroll-into-view trigger
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Message cascade
  useEffect(() => {
    if (!inView) return;
    if (visibleMsg >= CHAT_MESSAGES.length) {
      const t = setTimeout(() => setTaskVisible(true), 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisibleMsg(v => v + 1), 1400);
    return () => clearTimeout(t);
  }, [inView, visibleMsg]);

  // Slide to dashboard 5 s after task strip appears
  useEffect(() => {
    if (!taskVisible) return;
    const t = setTimeout(() => setActiveScreen(1), 5000);
    return () => clearTimeout(t);
  }, [taskVisible]);

  const isLastAI = (i: number) =>
    CHAT_MESSAGES[i].role === 'ai' && i === CHAT_MESSAGES.length - 1;

  const stepDone = (step: typeof AGENT_STEPS[number]) =>
    step.triggerAt === 'task' ? taskVisible : visibleMsg >= step.triggerAt;

  // ── Sidebar nav for the dashboard screen ──
  const DASH_NAV = [
    { label: 'Today',    Icon: LayoutDashboard, active: true },
    { label: 'Goals',    Icon: Target,          active: false },
    { label: 'Journey',  Icon: Map,             active: false },
    { label: 'Progress', Icon: BarChart2,        active: false },
  ];

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateColumns: '3fr 1fr',
        gap: '20px',
        alignItems: 'stretch',
      }}
    >
      {/* ══════════════════ LEFT — card with sliding screens ══════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{
          backgroundColor: '#FDFCFA',
          border: '1px solid #E2DDD5',
          borderRadius: '1.5rem',
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Window bar */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '13px 18px',
          borderBottom: '1px solid #EBE7E0',
          backgroundColor: '#F5F2EE',
          gap: '12px',
          flexShrink: 0,
        }}>
          {/* Traffic lights */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {['#E8C4B8', '#E8DDB8', '#B8E8C4'].map((c, i) => (
              <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: c }} />
            ))}
          </div>
          {/* Centre: logo + name */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}>
            <div style={{
              width: 20, height: 20, borderRadius: '6px',
              background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Bot size={11} color="#fff" />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#3a3028', letterSpacing: '-0.02em' }}>
              Coheren
            </span>
            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
          </div>
          {/* Screen indicator dots */}
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {[0, 1].map(s => (
              <motion.div
                key={s}
                animate={{ backgroundColor: activeScreen === s ? '#7c3aed' : 'rgba(0,0,0,0.15)', scale: activeScreen === s ? 1.2 : 1 }}
                transition={{ duration: 0.4 }}
                style={{ width: 6, height: 6, borderRadius: '50%' }}
              />
            ))}
          </div>
        </div>

        {/* ── Sliding content area ── */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative', height: '620px' }}>
          <AnimatePresence mode="wait" initial={false}>
            {activeScreen === 0 ? (

              /* ── Screen 0: Chat ── */
              <motion.div
                key="chat"
                initial={{ x: 0 }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
              >
                {/* Messages */}
                <div style={{
                  padding: '28px 24px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto',
                }}>
                  <AnimatePresence>
                    {CHAT_MESSAGES.slice(0, visibleMsg).map((msg, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        style={{
                          display: 'flex',
                          justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                          alignItems: 'flex-end',
                          gap: '9px',
                        }}
                      >
                        {msg.role === 'ai' && (
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 3px 8px rgba(124,58,237,0.28)',
                          }}>
                            <Bot size={14} color="#fff" />
                          </div>
                        )}
                        <div style={{
                          maxWidth: '72%',
                          padding: '10px 15px',
                          borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          backgroundColor: msg.role === 'user' ? '#18160F' : '#F0EDE6',
                          color: msg.role === 'user' ? '#F5F0E8' : '#2D2720',
                          fontSize: '14.5px',
                          lineHeight: 1.55,
                          letterSpacing: '-0.015em',
                          position: 'relative' as const,
                        }}>
                          {msg.text}
                          {isLastAI(i) && (
                            <motion.span
                              animate={{ opacity: [1, 0, 1] }}
                              transition={{ duration: 0.85, repeat: Infinity }}
                              style={{
                                display: 'inline-block', width: '2px', height: '14px',
                                backgroundColor: '#7c3aed', marginLeft: '3px',
                                verticalAlign: 'text-bottom', borderRadius: '1px',
                              }}
                            />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Typing dots */}
                  {inView && visibleMsg < CHAT_MESSAGES.length && CHAT_MESSAGES[visibleMsg].role === 'ai' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{ display: 'flex', gap: '6px', paddingLeft: '39px', alignItems: 'center' }}
                    >
                      {[0, 0.18, 0.36].map((delay, i) => (
                        <motion.div key={i}
                          animate={{ y: [0, -5, 0] }}
                          transition={{ duration: 0.55, repeat: Infinity, delay }}
                          style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#c4b5fd' }}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Input row */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px',
                  borderTop: '1px solid #EBE7E0',
                  backgroundColor: '#FAF9F7',
                  flexShrink: 0,
                }}>
                  <input readOnly placeholder="Tell Coheren your goal…" style={{
                    flex: 1, border: 'none', outline: 'none',
                    fontSize: '13.5px', color: '#b0a89e',
                    backgroundColor: 'transparent', cursor: 'default',
                  }} />
                  <div style={{
                    padding: '7px 13px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'default', boxShadow: '0 2px 8px rgba(124,58,237,0.3)',
                  }}>
                    <Send size={13} color="#fff" />
                  </div>
                </div>

                {/* Task output strip */}
                <AnimatePresence>
                  {taskVisible && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      style={{
                        borderTop: '1px solid rgba(124,58,237,0.15)',
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.05) 0%, rgba(109,40,217,0.02) 100%)',
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 20px 10px' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
                          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
                        }}>
                          <BookOpen size={18} color="#fff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px', flexWrap: 'wrap' as const }}>
                            <span style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '0.07em', padding: '2px 8px', borderRadius: '5px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff' }}>PRACTICE</span>
                            <span style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.04em', padding: '2px 8px', borderRadius: '5px', backgroundColor: 'rgba(124,58,237,0.1)', color: '#7c3aed', border: '1px solid rgba(124,58,237,0.2)' }}>FOUNDATION PHASE</span>
                            <span style={{ fontSize: '11px', color: '#9c8f84' }}>Day 1 of 90</span>
                          </div>
                          <p style={{ fontSize: '15px', color: '#1a1410', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', lineHeight: 1.35 }}>
                            Hold the G, C, D chord shapes — no switching yet
                          </p>
                        </div>
                        <div style={{ flexShrink: 0, textAlign: 'center', padding: '6px 12px', borderRadius: '10px', backgroundColor: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)' }}>
                          <p style={{ fontSize: '15px', color: '#7c3aed', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>15</p>
                          <p style={{ fontSize: '9px', color: '#9c8f84', margin: '1px 0 0', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>min</p>
                        </div>
                      </div>
                      <div style={{ margin: '0 20px 10px', padding: '10px 12px', backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(124,58,237,0.1)', borderRadius: '10px' }}>
                        <p style={{ fontSize: '12px', color: '#5a4f45', margin: 0, lineHeight: 1.55, letterSpacing: '-0.01em' }}>
                          <span style={{ fontWeight: 600, color: '#7c3aed' }}>Coach note:</span> Don't worry about switching yet — just feel where each finger sits. Muscle memory starts here.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', padding: '0 20px 16px', flexWrap: 'wrap' as const }}>
                        {['Hand position', 'Fret pressure', 'String clarity'].map((item) => (
                          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '99px', backgroundColor: 'rgba(255,255,255,0.7)', border: '1px solid #E2DDD5' }}>
                            <CheckCircle2 size={11} color="#10b981" strokeWidth={2.5} />
                            <span style={{ fontSize: '11px', color: '#5a4f45', fontWeight: 500 }}>{item}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

            ) : (

              /* ── Screen 1: Dashboard ── */
              <motion.div
                key="dashboard"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{ position: 'absolute', inset: 0, display: 'flex' }}
              >
                {/* Sidebar */}
                <div style={{
                  width: '148px', flexShrink: 0,
                  background: 'linear-gradient(180deg, #0F0D0A 0%, #1A1610 100%)',
                  borderRight: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex', flexDirection: 'column',
                  padding: '20px 12px',
                }}>
                  {/* Logo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '28px', paddingLeft: '4px' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '7px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Bot size={12} color="#fff" />
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Coheren</span>
                  </div>

                  {/* Nav */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {DASH_NAV.map(({ label, Icon, active }) => (
                      <div key={label} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 10px', borderRadius: '8px',
                        backgroundColor: active ? 'rgba(124,58,237,0.15)' : 'transparent',
                        border: active ? '1px solid rgba(124,58,237,0.25)' : '1px solid transparent',
                      }}>
                        <Icon size={13} color={active ? '#a78bfa' : 'rgba(255,255,255,0.3)'} />
                        <span style={{ fontSize: '12.5px', fontWeight: active ? 600 : 400, color: active ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', letterSpacing: '-0.01em' }}>{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Streak chip at bottom */}
                  <div style={{ marginTop: 'auto', padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                      <Flame size={11} color="#f97316" />
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Streak</span>
                    </div>
                    <p style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>8</p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '1px 0 0' }}>days running</p>
                  </div>
                </div>

                {/* Main content */}
                <div style={{ flex: 1, backgroundColor: '#FAF9F6', padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
                  {/* Header */}
                  <div>
                    <p style={{ fontSize: '11px', color: '#9c8f84', margin: '0 0 2px', letterSpacing: '-0.01em' }}>Good morning ☀️</p>
                    <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1410', margin: 0, letterSpacing: '-0.04em' }}>Day 1 of 90</h3>
                  </div>

                  {/* Task card */}
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    style={{
                      background: 'linear-gradient(135deg, #1e0a3c 0%, #2d1060 50%, #1a0a2e 100%)',
                      borderRadius: '16px',
                      padding: '18px',
                      boxShadow: '0 8px 32px rgba(124,58,237,0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', padding: '2px 7px', borderRadius: '4px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff' }}>PRACTICE</span>
                      <span style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.04em', padding: '2px 7px', borderRadius: '4px', backgroundColor: 'rgba(124,58,237,0.2)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }}>FOUNDATION PHASE</span>
                    </div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 12px', letterSpacing: '-0.02em', lineHeight: 1.35 }}>
                      Hold the G, C, D chord shapes — no switching yet
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                        {['Hand position', 'Fret pressure'].map(item => (
                          <span key={item} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '99px', backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>{item}</span>
                        ))}
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#a78bfa', flexShrink: 0, marginLeft: '8px' }}>15 min</span>
                    </div>
                  </motion.div>

                  {/* Coach note */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35 }}
                    style={{ padding: '12px 14px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #E2DDD5' }}
                  >
                    <p style={{ fontSize: '11.5px', color: '#5a4f45', margin: 0, lineHeight: 1.6, letterSpacing: '-0.01em' }}>
                      <span style={{ fontWeight: 600, color: '#7c3aed' }}>Coach note:</span> Don't worry about switching yet — just feel where each finger sits. Muscle memory starts here.
                    </p>
                  </motion.div>

                  {/* Progress bar */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', color: '#9c8f84', fontWeight: 500 }}>90-day roadmap</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <TrendingUp size={11} color="#7c3aed" />
                        <span style={{ fontSize: '11px', color: '#7c3aed', fontWeight: 600 }}>1% complete</span>
                      </div>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'rgba(124,58,237,0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '1%' }}
                        transition={{ duration: 0.8, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: '100%', background: 'linear-gradient(90deg, #7c3aed, #a78bfa)', borderRadius: '99px' }}
                      />
                    </div>
                    <p style={{ fontSize: '10px', color: '#b0a89e', margin: 0 }}>89 days remaining · Guitar</p>
                  </motion.div>

                  {/* CTA hint */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.65 }}
                    style={{
                      marginTop: 'auto',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(109,40,217,0.03) 100%)',
                      border: '1px solid rgba(124,58,237,0.15)',
                      cursor: 'default',
                    }}
                  >
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#7c3aed', letterSpacing: '-0.01em' }}>Start today's session</span>
                    <ChevronRight size={15} color="#7c3aed" />
                  </motion.div>
                </div>
              </motion.div>

            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ══════════════════ RIGHT — Agent panel (1/4) ══════════════ */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        style={{
          backgroundColor: '#0D0C0A',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '1.5rem',
          padding: '22px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
          boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
          position: 'relative' as const,
          overflow: 'hidden' as const,
        }}
      >
        {/* Subtle purple radial glow top */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-20px',
          width: '160px', height: '160px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{ marginBottom: '20px', position: 'relative' as const }}>
          <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(167,139,250,0.6)', textTransform: 'uppercase' as const, margin: '0 0 6px' }}>
            Under the hood
          </p>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
            5 agents working<br />in parallel
          </p>
        </div>

        {/* Agent steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, position: 'relative' as const }}>
          {AGENT_STEPS.map((step, i) => {
            const done = stepDone(step);
            const active = !done && (
              step.triggerAt === 'task'
                ? visibleMsg >= CHAT_MESSAGES.length
                : visibleMsg === (step.triggerAt as number) - 1
            );
            return (
              <motion.div
                key={i}
                animate={done ? { opacity: 1 } : active ? { opacity: 0.65 } : { opacity: 0.3 }}
                transition={{ duration: 0.5 }}
                style={{
                  display: 'flex', gap: '10px', alignItems: 'flex-start',
                  padding: '10px 10px',
                  borderRadius: '10px',
                  backgroundColor: done ? 'rgba(124,58,237,0.08)' : 'transparent',
                  border: done ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent',
                  transition: 'background-color 0.4s, border-color 0.4s',
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0, marginTop: '1px',
                  background: done ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : active ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.06)',
                  border: done ? 'none' : active ? '1px solid rgba(124,58,237,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: done ? '0 2px 8px rgba(124,58,237,0.4)' : 'none',
                  transition: 'all 0.4s',
                }}>
                  {done ? (
                    <CheckCircle2 size={12} color="#fff" strokeWidth={2.5} />
                  ) : active ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      style={{ width: 8, height: 8, borderRadius: '50%', border: '1.5px solid rgba(167,139,250,0.8)', borderTopColor: 'transparent' }}
                    />
                  ) : (
                    <div style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  )}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: done ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.45)', margin: '0 0 2px', letterSpacing: '-0.01em', transition: 'color 0.4s' }}>
                    {step.label}
                  </p>
                  <p style={{ fontSize: '10.5px', color: done ? 'rgba(167,139,250,0.7)' : 'rgba(255,255,255,0.2)', margin: 0, fontFamily: 'monospace', letterSpacing: '0.01em', transition: 'color 0.4s' }}>
                    {step.detail}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom: live stats */}
        <motion.div
          animate={taskVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          transition={{ duration: 0.5 }}
          style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {[
            { label: 'Streak', value: '8 days', icon: <Flame size={11} color="#f97316" /> },
            { label: 'Plan',   value: '90 days', icon: <TrendingUp size={11} color="#7c3aed" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {icon}
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', letterSpacing: '-0.01em' }}>{label}</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.01em' }}>{value}</span>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

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
        ctaDropdown={[
          { label: 'Sign Up', onClick: () => setStep(3) },
          { label: 'Sign In', onClick: () => setStep(4) },
        ]}
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
          <div className="px-8 lg:px-16 pt-8 pb-0 text-center">
            <span className="mb-3 inline-block rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-violet-400">
              How It Works
            </span>
            <h2 className="mt-3 text-4xl font-light tracking-tight text-white sm:text-5xl md:text-6xl">
              Eliminate the space between
              <br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                'want' and 'did'.
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

      {/* Interactive Chat Mock — "See an example roadmap" */}
      <section id="roadmap-preview" style={{
        padding: `${tokens.spacing['5xl']} ${tokens.spacing.xl}`,
        background: 'linear-gradient(180deg, #FAFBFC 0%, white 100%)',
        position: 'relative',
        zIndex: 10,
        scrollMarginTop: '80px',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            style={{ textAlign: 'center', marginBottom: '56px' }}
          >
            <h2 style={{
              fontSize: tokens.typography.sizes['4xl'],
              fontWeight: tokens.typography.weights.light,
              letterSpacing: '-0.02em',
              marginBottom: tokens.spacing.md,
              color: '#0F172A',
            }}>
              See how it works
            </h2>
            <p style={{ fontSize: tokens.typography.sizes.base, color: '#64748B', margin: 0 }}>
              A real conversation → a real roadmap, in under 60 seconds.
            </p>
          </motion.div>

          <CoherenDemoSection />
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

          {/* Video backdrop — muted until user scrolls to this section */}
          <video
            ref={el => { if (el) { el.muted = true; el.volume = 0; } }}
            src="/backdrop.mp4"
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              zIndex: 0,
            }}
          />

          {/* REWIRE — blend mode on the wrapper so the whole layer inverts against the video */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 10, mixBlendMode: 'difference', pointerEvents: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <h2 style={{ fontSize: '14vw', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', color: '#ffffff', userSelect: 'none', margin: 0 }}>
                REWIRE
              </h2>
            </div>
            <div style={{ position: 'absolute', top: '3rem', left: '3rem', fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', opacity: 0.5, lineHeight: 1.8 }}>
              <p>SYNC_STATE: STABLE</p>
              <p>AGENT_05: RUNNING</p>
            </div>
          </div>

          <motion.div
            style={{
              position: 'absolute', inset: 0,
              x: pricingX,
              zIndex: 30,
              backgroundColor: 'rgba(255,255,255,0.12)',
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
