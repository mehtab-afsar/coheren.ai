import { useState, useEffect } from 'react';

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia('(max-width: 767px)').matches
  );
  const [isTablet, setIsTablet] = useState(() =>
    window.matchMedia('(max-width: 1023px)').matches
  );
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const mqlMobile = window.matchMedia('(max-width: 767px)');
    const mqlTablet = window.matchMedia('(max-width: 1023px)');

    const onMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const onTablet = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    const onResize = () => setWidth(window.innerWidth);

    mqlMobile.addEventListener('change', onMobile);
    mqlTablet.addEventListener('change', onTablet);
    window.addEventListener('resize', onResize);

    return () => {
      mqlMobile.removeEventListener('change', onMobile);
      mqlTablet.removeEventListener('change', onTablet);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return { isMobile, isTablet, width };
}
