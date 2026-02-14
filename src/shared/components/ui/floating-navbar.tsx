import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
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
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY < 50) {
        setVisible(true);
      } else if (currentY > lastScrollY.current) {
        setVisible(false);
        setMenuOpen(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ y: visible ? 0 : -80, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={cn(
          "fixed inset-x-0 top-8 z-[5000] mx-auto w-full max-w-2xl px-4",
          className,
        )}
      >
        {/* Main pill */}
        <div className="flex items-center justify-between rounded-full border border-black/[0.08] bg-white/90 backdrop-blur-md px-6 py-2.5 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)]">
          {/* Brand */}
          <button
            onClick={onBrandClick}
            className="text-base font-light tracking-tight text-slate-900 transition-opacity hover:opacity-70"
          >
            {brand}
          </button>

          {/* Nav links — desktop only */}
          <div className="hidden sm:flex items-center gap-1">
            {navItems.map((item, idx) => (
              <button
                key={idx}
                onClick={item.onClick}
                className={cn(
                  "group relative px-3 py-1.5 text-sm text-neutral-500 transition-colors duration-200",
                  "rounded-full hover:text-violet-600",
                )}
              >
                <span className="absolute inset-0 rounded-full bg-violet-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <span className="relative">{item.name}</span>
              </button>
            ))}
          </div>

          {/* CTA — desktop only */}
          <button
            onClick={onCtaClick}
            className={cn(
              "hidden sm:block group relative rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-black",
              "transition-all duration-200 hover:border-violet-300 hover:text-violet-700 hover:shadow-[0_0_12px_rgba(139,92,246,0.2)]",
            )}
          >
            <span>{ctaLabel}</span>
            <span className="absolute inset-x-0 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-violet-500 to-transparent transition-opacity duration-200 group-hover:opacity-100 opacity-60" />
          </button>

          {/* Hamburger — mobile only */}
          <button
            className="sm:hidden p-1.5 rounded-full text-slate-600 hover:text-violet-600 transition-colors"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-2 rounded-2xl border border-black/[0.08] bg-white/95 backdrop-blur-md shadow-lg overflow-hidden"
            >
              <div className="flex flex-col py-2">
                {navItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => { item.onClick(); setMenuOpen(false); }}
                    className="px-6 py-3 text-sm text-neutral-600 hover:text-violet-600 hover:bg-violet-50 text-left transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
                <div className="mx-4 my-2 h-px bg-slate-100" />
                <button
                  onClick={() => { onCtaClick?.(); setMenuOpen(false); }}
                  className="mx-4 mb-2 rounded-full bg-violet-600 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors"
                >
                  {ctaLabel}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
