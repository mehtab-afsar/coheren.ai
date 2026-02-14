import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const ROW_1 = [
  "Backed by science",
  "Built for humans",
  "One task. Every day.",
  "Dopamine-loop design",
  "200+ peer-reviewed papers",
  "Built for humans",
  "No overwhelm",
  "Stanford BJ Fogg model",
];

const ROW_2 = [
  "Tiny habits that stack",
  "AI that adapts",
  "Zero guilt. Pure momentum.",
  "Your roadmap. Recalibrated.",
  "Motivation × Ability × Prompt",
  "Goals become identity",
  "One focus. Infinite progress.",
  "Science-first coaching",
];

const STATS = [
  { value: 10000, suffix: "+", label: "Goals tracked" },
  { value: 92, suffix: "%", label: "Retention rate" },
  { value: 500000, suffix: "+", label: "Tasks completed" },
  { value: 66, suffix: " days", label: "To form a habit" },
];

function AnimatedCount({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1400;
    const step = 16;
    const increment = target / (duration / step);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, step);
    return () => clearInterval(timer);
  }, [inView, target]);

  return (
    <span ref={ref}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

function MarqueeRow({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  // Duplicate for seamless loop
  const doubled = [...items, ...items, ...items];

  return (
    <div className="overflow-hidden w-full py-2">
      <motion.div
        className="flex gap-0 whitespace-nowrap"
        animate={{ x: reverse ? ["0%", "33.333%"] : ["0%", "-33.333%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {doubled.map((text, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-4 px-6 text-sm font-medium tracking-wide"
          >
            <span className="text-gray-800">{text}</span>
            <span className="text-violet-400 text-lg">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function MomentumStrip() {
  return (
    <div className="relative w-full overflow-hidden">
      {/* Gradient from white */}
      <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
      {/* Gradient to violet-50 */}
      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-[#f5f3ff] to-transparent z-10 pointer-events-none" />

      <div
        className="py-16"
        style={{ background: "linear-gradient(180deg, #ffffff 0%, #faf8ff 40%, #f5f3ff 100%)" }}
      >
        {/* Radial glow behind marquee */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Marquee rows */}
        <div className="relative mb-10">
          <MarqueeRow items={ROW_1} />
          <MarqueeRow items={ROW_2} reverse />
        </div>

        {/* Stats counters */}
        <div className="relative max-w-4xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-3xl font-semibold text-gray-900 tabular-nums">
                <AnimatedCount target={s.value} suffix={s.suffix} />
              </span>
              <span className="text-xs uppercase tracking-widest text-violet-500 font-medium">
                {s.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
