/**
 * SwipeableCard
 *
 * Thin wrapper that adds swipe-gesture detection to any card-like div.
 * Uses a non-passive touchmove listener so it can call preventDefault()
 * to block vertical page scroll when a horizontal swipe is detected.
 *
 * Swipe left  → onSwipeLeft()
 * Swipe right → onSwipeRight()
 */
import { useRef, useEffect, type ReactNode, type CSSProperties, type MouseEvent } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  style?: CSSProperties;
  onClick?: () => void;
  onMouseEnter?: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (e: MouseEvent<HTMLDivElement>) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Disable swipe (e.g. on desktop or when card is completed) */
  swipeDisabled?: boolean;
  /** Threshold in px before a swipe is triggered */
  threshold?: number;
  /** Forwarded data-* or aria-* attributes */
  [key: `data-${string}`]: unknown;
}

export default function SwipeableCard({
  children,
  style,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onSwipeLeft,
  onSwipeRight,
  swipeDisabled = false,
  threshold = 72,
  ...rest
}: SwipeableCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  // Keep callbacks fresh without re-registering touch listeners on every render
  const cbRef = useRef({ onSwipeLeft, onSwipeRight });
  useEffect(() => {
    cbRef.current = { onSwipeLeft, onSwipeRight };
  }, [onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    const el = ref.current;
    if (!el || swipeDisabled) return;

    let startX = 0;
    let startY = 0;
    let dx = 0;
    let direction: 'horizontal' | 'vertical' | null = null;

    const onStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      dx = 0;
      direction = null;
    };

    const onMove = (e: TouchEvent) => {
      const x = e.touches[0].clientX - startX;
      const y = e.touches[0].clientY - startY;

      // Lock direction once we have enough signal
      if (direction === null && (Math.abs(x) > 8 || Math.abs(y) > 8)) {
        direction = Math.abs(x) > Math.abs(y) ? 'horizontal' : 'vertical';
      }

      if (direction === 'horizontal') {
        e.preventDefault(); // block page scroll during horizontal swipe
        dx = x;
        const clamped = Math.max(-130, Math.min(130, x));
        el.style.transform = `translateX(${clamped}px)`;
        el.style.transition = 'none';
        // Colour hint: red left = skip, purple right = cinema
        el.style.borderLeftColor =
          x < -18 ? 'rgba(239,68,68,0.8)'
          : x > 18 ? '#C4552D'
          : '';
      }
    };

    const onEnd = () => {
      el.style.transform = '';
      el.style.transition = 'transform 0.28s cubic-bezier(0.4,0,0.2,1)';
      el.style.borderLeftColor = '';
      // Clear transition override after it finishes
      const tid = setTimeout(() => { if (el) el.style.transition = ''; }, 300);

      if (direction === 'horizontal') {
        if (dx < -threshold) cbRef.current.onSwipeLeft?.();
        else if (dx > threshold) cbRef.current.onSwipeRight?.();
      }

      dx = 0;
      direction = null;

      return () => clearTimeout(tid);
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false }); // non-passive to preventDefault
    el.addEventListener('touchend', onEnd, { passive: true });
    el.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [swipeDisabled, threshold]);

  return (
    <div
      ref={ref}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...rest}
    >
      {children}
    </div>
  );
}
