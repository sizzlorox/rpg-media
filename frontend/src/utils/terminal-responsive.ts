// Responsive terminal configuration and breakpoint detection

export interface TerminalConfig {
  fontSize: number
  minRows: number
  minCols: number
  padding: string
  height: string
}

export interface ResponsiveBreakpoint {
  maxWidth: number
  config: TerminalConfig
  logoType: 'compact' | 'medium' | 'full'
}

export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoint[] = [
  {
    maxWidth: 640, // Mobile
    config: {
      fontSize: 10,
      minRows: 24,
      minCols: 40,
      padding: '8px',
      height: '95vh'
    },
    logoType: 'compact'
  },
  {
    maxWidth: 1024, // Tablet
    config: {
      fontSize: 12,
      minRows: 28,
      minCols: 60,
      padding: '12px',
      height: '98vh'
    },
    logoType: 'medium'
  },
  {
    maxWidth: Infinity, // Desktop
    config: {
      fontSize: 14,
      minRows: 30,
      minCols: 80,
      padding: '20px',
      height: '100vh'
    },
    logoType: 'full'
  }
]

export function getResponsiveConfig(width: number): ResponsiveBreakpoint {
  return RESPONSIVE_BREAKPOINTS.find(bp => width <= bp.maxWidth)
    || RESPONSIVE_BREAKPOINTS[2]
}

export function getCurrentViewportWidth(): number {
  return window.innerWidth
}
