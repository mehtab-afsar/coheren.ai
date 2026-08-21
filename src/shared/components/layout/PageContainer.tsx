import type { CSSProperties, ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  /** Content column width. Views with dense grids (e.g. Today) want more room
   *  than single-column reading views. */
  maxWidth?: number;
  isMobile?: boolean;
  style?: CSSProperties;
}

/**
 * The page-content column: centers, caps width, applies the standard
 * responsive padding, and fades in on mount. Domain-agnostic — any feature
 * area's shell composes this, not just the dashboard.
 */
export function PageContainer({ children, maxWidth = 1120, isMobile = false, style }: PageContainerProps) {
  return (
    <div style={{
      maxWidth,
      margin: '0 auto',
      padding: isMobile ? '20px 16px' : '28px 40px',
      animation: 'apFadeIn 0.3s ease',
      ...style,
    }}>
      {children}
    </div>
  );
}
