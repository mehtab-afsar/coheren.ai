import { useState, useEffect } from 'react';

export function useBreakpoint() {
  const [isMobile, setIsMobile] = useState(() =>
    window.matchMedia('(max-width: 767px)').matches
  );
  const [isTablet, setIsTablet] = useState(() =>
    window.matchMedia('(max-width: 1023px)').matches
  );
  // Wide = roomy desktop where multi-column grids look good; XWide = very large displays.
  const [isWide, setIsWide] = useState(() =>
    window.matchMedia('(min-width: 1024px)').matches
  );
  const [isXWide, setIsXWide] = useState(() =>
    window.matchMedia('(min-width: 1440px)').matches
  );
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const mqlMobile = window.matchMedia('(max-width: 767px)');
    const mqlTablet = window.matchMedia('(max-width: 1023px)');
    const mqlWide = window.matchMedia('(min-width: 1024px)');
    const mqlXWide = window.matchMedia('(min-width: 1440px)');

    const onMobile = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    const onTablet = (e: MediaQueryListEvent) => setIsTablet(e.matches);
    const onWide = (e: MediaQueryListEvent) => setIsWide(e.matches);
    const onXWide = (e: MediaQueryListEvent) => setIsXWide(e.matches);
    const onResize = () => setWidth(window.innerWidth);

    mqlMobile.addEventListener('change', onMobile);
    mqlTablet.addEventListener('change', onTablet);
    mqlWide.addEventListener('change', onWide);
    mqlXWide.addEventListener('change', onXWide);
    window.addEventListener('resize', onResize);

    return () => {
      mqlMobile.removeEventListener('change', onMobile);
      mqlTablet.removeEventListener('change', onTablet);
      mqlWide.removeEventListener('change', onWide);
      mqlXWide.removeEventListener('change', onXWide);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return { isMobile, isTablet, isWide, isXWide, width };
}
