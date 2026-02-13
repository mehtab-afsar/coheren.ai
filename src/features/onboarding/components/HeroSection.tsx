import { ArrowRightIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@shared/components/ui/badge";
import { Icons } from "@shared/components/ui/icons";
import { AIInput } from "@shared/components/ui/ai-input";
import { cn } from "@lib/utils";

const ROTATING_WORDS = ["More.", "Magic.", "Beyond.", "Mistakes.", "Smarter."];

function useRotatingWord(words: string[], interval = 2200) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), interval);
    return () => clearInterval(timer);
  }, [words, interval]);
  return words[index];
}

interface HeroProps {
  badge?: {
    text: string;
    action: {
      text: string;
      onClick?: () => void;
    };
  };
  description: string;
  onGoalSubmit?: (goal: string) => void;
  secondaryAction?: {
    text: string;
    onClick?: () => void;
  };
}

export function HeroSection({
  badge,
  description,
  onGoalSubmit,
  secondaryAction,
}: HeroProps) {
  const word = useRotatingWord(ROTATING_WORDS);

  return (
    <section
      className={cn(
        "relative min-h-screen",
        "bg-transparent text-foreground",
        "px-4",
      )}
    >
      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-container flex-col items-center gap-6 pt-52 pb-32 text-center sm:gap-8 sm:pt-60">

        {/* Badge */}
        {badge && (
          <Badge variant="outline" className="animate-appear gap-2 py-1 pl-2 pr-3">
            <Icons.logo className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{badge.text}</span>
            <button
              onClick={badge.action.onClick}
              className="flex items-center gap-1 font-semibold hover:underline"
            >
              {badge.action.text}
              <ArrowRightIcon className="h-3 w-3" />
            </button>
          </Badge>
        )}

        {/* Title with rotating last word — single line, no shift */}
        <h1 className="relative z-10 animate-appear text-4xl font-semibold leading-tight sm:text-6xl sm:leading-tight md:text-8xl md:leading-tight">
          <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent drop-shadow-2xl">
            Think less. Do{" "}
          </span>
          {/* inline-grid stacks enter/exit in same cell — container never collapses */}
          <span className="relative inline-grid align-bottom">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={word}
                style={{ gridArea: "1/1" }}
                initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -16, filter: "blur(4px)" }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="inline-block bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent"
              >
                {word}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        {/* Description */}
        <p className="text-md relative z-10 max-w-[550px] animate-appear font-medium text-muted-foreground opacity-0 delay-100 sm:text-xl">
          {description}
        </p>

        {/* AI Input */}
        <div className="relative z-10 w-full max-w-xl animate-appear opacity-0 delay-300">
          <AIInput onSubmit={onGoalSubmit} />
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="mt-3 flex items-center gap-1 mx-auto text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {secondaryAction.text}
              <ArrowRightIcon className="h-3 w-3" />
            </button>
          )}
        </div>

      </div>

    </section>
  );
}
