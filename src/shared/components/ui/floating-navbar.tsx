import React, { useState } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from "framer-motion";
import { cn } from "@lib/utils";

interface NavItem {
  name: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface FloatingNavProps {
  brand?: string;
  onBrandClick?: () => void;
  navItems: NavItem[];
  ctaLabel?: string;
  onCtaClick?: () => void;
  className?: string;
}

export const FloatingNav = ({
  brand = "coheren.ai",
  onBrandClick,
  navItems,
  ctaLabel = "Get Started",
  onCtaClick,
  className,
}: FloatingNavProps) => {
  const { scrollYProgress } = useScroll();
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrollYProgress, "change", (current) => {
    if (typeof current === "number") {
      const direction = current - scrollYProgress.getPrevious()!;
      setVisible(direction <= 0);
    }
  });

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -100 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed inset-x-0 top-8 z-[5000] mx-auto flex w-full max-w-2xl items-center justify-between",
          "rounded-full border border-black/[0.08] bg-white/90 backdrop-blur-md",
          "px-6 py-2.5 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]",
          className,
        )}
      >
        {/* Brand */}
        <button
          onClick={onBrandClick}
          className="text-base font-light tracking-tight text-slate-900 transition-opacity hover:opacity-70"
        >
          {brand}
        </button>

        {/* Nav links — centered */}
        <div className="flex items-center gap-1">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              onClick={item.onClick}
              className={cn(
                "group relative px-3 py-1.5 text-sm text-neutral-500 transition-colors duration-200",
                "rounded-full hover:text-violet-600",
              )}
            >
              {/* purple pill bg on hover */}
              <span className="absolute inset-0 rounded-full bg-violet-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="relative hidden sm:block">{item.name}</span>
              <span className="relative block sm:hidden">{item.icon}</span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onCtaClick}
          className={cn(
            "group relative rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-black",
            "transition-all duration-200 hover:border-violet-300 hover:text-violet-700 hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]",
          )}
        >
          <span>{ctaLabel}</span>
          <span className="absolute inset-x-0 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-violet-500 to-transparent transition-opacity duration-200 group-hover:opacity-100 opacity-60" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
