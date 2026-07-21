import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@lib/utils";

interface NavItem {
  name: string;
  onClick: () => void;
  icon?: React.ReactNode;
}

interface CtaDropdownItem {
  label: string;
  onClick: () => void;
}

interface FloatingNavProps {
  brand?: string;
  onBrandClick?: () => void;
  navItems: NavItem[];
  ctaLabel?: string;
  onCtaClick?: () => void;
  ctaDropdown?: CtaDropdownItem[];
  className?: string;
}

export const FloatingNav = ({
  brand = "coheren.ai",
  onBrandClick,
  navItems,
  ctaLabel = "Get Started",
  onCtaClick,
  ctaDropdown,
  className,
}: FloatingNavProps) => {
  const [visible, setVisible] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ctaOpen, setCtaOpen] = useState(false);
  const ctaRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  // Close CTA dropdown on outside click
  useEffect(() => {
    if (!ctaOpen) return;
    const handler = (e: MouseEvent) => {
      if (ctaRef.current && !ctaRef.current.contains(e.target as Node)) {
        setCtaOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ctaOpen]);

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
                  "rounded-full hover:text-clay-600",
                )}
              >
                <span className="absolute inset-0 rounded-full bg-clay-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                <span className="relative">{item.name}</span>
              </button>
            ))}
          </div>

          {/* CTA — desktop only */}
          <div ref={ctaRef} className="hidden sm:block relative">
            <button
              onClick={ctaDropdown ? () => setCtaOpen(v => !v) : onCtaClick}
              className={cn(
                "group relative rounded-full border border-neutral-200 px-4 py-1.5 text-sm font-medium text-black flex items-center gap-1",
                "transition-all duration-200 hover:border-clay-300 hover:text-clay-700 hover:shadow-[0_0_12px_rgba(206, 107, 69,0.2)]",
                ctaOpen && "border-clay-300 text-clay-700",
              )}
            >
              <span>{ctaLabel}</span>
              <span className="absolute inset-x-0 -bottom-px mx-auto h-px w-1/2 bg-gradient-to-r from-transparent via-clay-500 to-transparent transition-opacity duration-200 group-hover:opacity-100 opacity-60" />
            </button>

            {/* CTA dropdown */}
            <AnimatePresence>
              {ctaDropdown && ctaOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="absolute right-0 mt-2 w-44 rounded-xl border border-black/[0.08] bg-white/95 backdrop-blur-md shadow-lg overflow-hidden"
                >
                  {ctaDropdown.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => { item.onClick(); setCtaOpen(false); }}
                      className="w-full px-4 py-2.5 text-sm text-left text-neutral-700 hover:text-clay-700 hover:bg-clay-50 transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="sm:hidden p-1.5 rounded-full text-slate-600 hover:text-clay-600 transition-colors"
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
                    className="px-6 py-3 text-sm text-neutral-600 hover:text-clay-600 hover:bg-clay-50 text-left transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
                <div className="mx-4 my-2 h-px bg-slate-100" />
                {ctaDropdown ? (
                  <div className="flex flex-col gap-2 mx-4 mb-2">
                    {ctaDropdown.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => { item.onClick(); setMenuOpen(false); }}
                        className={`w-full rounded-full py-2.5 text-sm font-medium transition-colors ${
                          i === 0
                            ? 'bg-clay-600 text-white hover:bg-clay-700'
                            : 'border border-clay-200 text-clay-700 hover:bg-clay-50'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => { onCtaClick?.(); setMenuOpen(false); }}
                    className="mx-4 mb-2 rounded-full bg-clay-600 py-2.5 text-sm font-medium text-white hover:bg-clay-700 transition-colors"
                  >
                    {ctaLabel}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
};
