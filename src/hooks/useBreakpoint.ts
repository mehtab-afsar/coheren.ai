import { useState, useEffect } from 'react';

export function useBreakpoint() {
  // Initialize synchronously from matchMedia — no flash on first render
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return {
    isMobile,
    isTablet: window.innerWidth < 1024,
    width: window.innerWidth,
  };
}
