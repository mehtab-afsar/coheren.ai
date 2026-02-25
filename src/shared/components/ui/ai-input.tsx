import { ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@lib/utils";
import { useAutoResizeTextarea } from "@shared/components/hooks/use-auto-resize-textarea";

const GOAL_EXAMPLES = [
  "I want to learn boxing",
  "I want to study for UPSC",
  "I want to run a 5K in 90 days",
  "I want to build a reading habit",
  "I want to learn Spanish",
  "I want to get fit before summer",
  "I want to code every day",
  "I want to meditate consistently",
];

function useTypewriter(phrases: string[]) {
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const current = phrases[phraseIdx];

    if (!deleting) {
      if (charIdx < current.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx + 1));
          setCharIdx((c) => c + 1);
        }, 45);
      } else {
        // Pause at end before deleting
        timeoutRef.current = setTimeout(() => setDeleting(true), 1800);
      }
    } else {
      if (charIdx > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx - 1));
          setCharIdx((c) => c - 1);
        }, 25);
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDeleting(false);
        setPhraseIdx((p) => (p + 1) % phrases.length);
      }
    }

    return () => clearTimeout(timeoutRef.current);
  }, [charIdx, deleting, phraseIdx, phrases]);

  return displayed;
}

interface AIInputProps {
  id?: string;
  minHeight?: number;
  maxHeight?: number;
  onSubmit?: (value: string) => void;
  className?: string;
}

export function AIInput({
  id = "ai-input",
  minHeight = 56,
  maxHeight = 200,
  onSubmit,
  className,
}: AIInputProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight, maxHeight });
  const [inputValue, setInputValue] = useState("");
  const [focused, setFocused] = useState(false);
  const typewriterText = useTypewriter(GOAL_EXAMPLES);

  const handleSubmit = () => {
    if (!inputValue.trim()) return;
    onSubmit?.(inputValue.trim());
    setInputValue("");
    adjustHeight(true);
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Outer glow ring on focus */}
      <div
        className={cn(
          "relative rounded-2xl transition-all duration-300",
          focused
            ? "shadow-[0_0_0_3px_rgba(139,92,246,0.15),0_4px_24px_rgba(139,92,246,0.1)]"
            : "shadow-[0_2px_16px_rgba(0,0,0,0.06)]",
        )}
      >
        {/* Gradient border */}
        <div
          className={cn(
            "absolute inset-0 rounded-2xl transition-opacity duration-300",
            focused ? "opacity-100" : "opacity-0",
          )}
          style={{
            background:
              "linear-gradient(135deg, rgba(139,92,246,0.4), rgba(99,102,241,0.2), rgba(139,92,246,0.4))",
            padding: "1.5px",
            WebkitMask:
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />

        <div className="relative flex items-center rounded-2xl bg-white/80 backdrop-blur-sm px-5">
          {/* Textarea */}
          <textarea
            id={id}
            ref={textareaRef}
            value={inputValue}
            placeholder={focused || inputValue ? "" : " "}
            className={cn(
              "flex-1 bg-transparent py-4 pr-4 text-[15px] text-slate-800",
              "placeholder:text-transparent",
              "resize-none overflow-y-auto",
              "outline-none border-none ring-0 focus:ring-0",
              "leading-relaxed",
              "[&::-webkit-resizer]:hidden",
            )}
            style={{ minHeight: `${minHeight}px`, maxHeight: `${maxHeight}px` }}
            onChange={(e) => {
              setInputValue(e.target.value);
              adjustHeight();
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          {/* Animated placeholder — only when not focused and empty */}
          {!focused && !inputValue && (
            <span
              className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[15px] text-slate-400 select-none"
              aria-hidden
            >
              {typewriterText}
              <span className="ml-px inline-block w-[2px] h-[1em] bg-violet-400 align-middle animate-pulse" />
            </span>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            type="button"
            className={cn(
              "ml-2 flex-shrink-0 flex items-center justify-center",
              "h-8 w-8 rounded-xl transition-all duration-200",
              inputValue
                ? "bg-violet-600 text-white shadow-[0_2px_8px_rgba(139,92,246,0.4)] scale-100 opacity-100"
                : "bg-black/[0.06] text-black/25 scale-95 opacity-100",
            )}
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
