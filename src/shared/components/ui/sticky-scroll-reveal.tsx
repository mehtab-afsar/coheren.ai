import React, { useRef, useState } from "react";
import { useScroll, useMotionValueEvent, motion, AnimatePresence } from "framer-motion";
import { cn } from "@lib/utils";

export const StickyScroll = ({
  content,
  contentClassName,
}: {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode;
  }[];
  contentClassName?: string;
}) => {
  const [activeCard, setActiveCard] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // "start start" → "end start": gives each section exactly 100vh of scroll time
  // (scroll distance = full container height, not container - viewport)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // Divide the 0→1 range into equal bands, one per card.
    // Use (n-1) slots so the last card fills from breakpoint to 1.0
    const band = 1 / content.length;
    const idx = Math.min(
      Math.floor(latest / band),
      content.length - 1
    );
    setActiveCard(idx);
  });

  const gradients = [
    "#FAF9F7",
    "#FAF9F7",
    "#FAF9F7",
    "#FAF9F7",
  ];

  return (
    // Tall outer container — one viewport height per card
    <div
      ref={containerRef}
      style={{ height: `${content.length * 100}vh` }}
      className="relative"
    >
      {/* Sticky inner — stays pinned to the viewport */}
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className={cn("mx-auto flex w-full max-w-7xl items-center gap-16 px-6 lg:px-16", contentClassName)}>

          {/* Left: cross-fading text */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCard}
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Step number */}
                <span className="mb-6 block text-sm font-semibold uppercase tracking-[0.25em] text-clay-500">
                  {String(activeCard + 1).padStart(2, "0")} / {String(content.length).padStart(2, "0")}
                </span>

                {/* Title */}
                <h3 className="mb-6 text-5xl font-semibold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
                  {content[activeCard].title}
                </h3>

                {/* Description */}
                <p className="max-w-lg text-xl leading-relaxed text-white/55 sm:text-2xl">
                  {content[activeCard].description}
                </p>

                {/* Progress bar */}
                <div className="mt-12 flex items-center gap-2">
                  {content.map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        width: i === activeCard ? 32 : 6,
                        opacity: i === activeCard ? 1 : 0.25,
                        backgroundColor: i === activeCard ? "#C4552D" : "#ffffff33",
                      }}
                      transition={{ duration: 0.35 }}
                      className="h-1.5 rounded-full"
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: cross-fading visual panel */}
          <div className="hidden lg:block w-[520px] flex-shrink-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCard}
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="h-[420px] w-full rounded-3xl overflow-hidden flex items-center justify-center"
                style={{
                  background: gradients[activeCard % gradients.length],
                  boxShadow: "0 8px 40px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
                }}
              >
                {content[activeCard].content ?? null}
              </motion.div>
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
};
