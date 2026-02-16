// Responsive terminal configuration and breakpoint detection

export interface TerminalConfig {
  fontSize: number
  lineHeight: number
  minRows: number
  minCols: number
  padding: string
  height: string
}

export interface ResponsiveBreakpoint {
  breakpoint: 'mobile' | 'tablet' | 'desktop'
  maxWidth: number
  config: TerminalConfig
  logoType: 'compact' | 'medium' | 'full'
}

export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoint[] = [
  {
    breakpoint: 'mobile',
    maxWidth: 640, // Mobile
    config: {
      fontSize: 10,
      lineHeight: 14,  // 1.4x fontSize
      minRows: 24,
      minCols: 40,
      padding: '8px',
      height: 'calc(100vh - 16px)' // Account for padding and safe areas
    },
    logoType: 'compact'
  },
  {
    breakpoint: 'tablet',
    maxWidth: 1024, // Tablet
    config: {
      fontSize: 12,
      lineHeight: 16.8,  // 1.4x fontSize
      minRows: 28,
      minCols: 60,
      padding: '12px',
      height: 'calc(100vh - 24px)' // Account for padding
    },
    logoType: 'medium'
  },
  {
    breakpoint: 'desktop',
    maxWidth: Infinity, // Desktop
    config: {
      fontSize: 14,
      lineHeight: 19.6,  // 1.4x fontSize
      minRows: 30,
      minCols: 80,
      padding: '20px',
      height: 'calc(100vh - 40px)' // Account for padding
    },
    logoType: 'full'
  }
]

export function getResponsiveConfig(width: number): ResponsiveBreakpoint {
  const breakpoint = RESPONSIVE_BREAKPOINTS.find(bp => width <= bp.maxWidth)
    || RESPONSIVE_BREAKPOINTS[2]

  // Calculate actual available columns based on viewport width
  const config = { ...breakpoint.config }

  // Parse padding (e.g., "8px" -> 8)
  const paddingValue = parseInt(config.padding) || 0
  const totalPadding = paddingValue * 2 // left + right

  // Get safe area insets (for iPhone notches, etc.)
  let safeAreaInsets = 0
  if (typeof window !== 'undefined' && typeof getComputedStyle !== 'undefined') {
    const root = document.documentElement
    const style = getComputedStyle(root)
    const leftInset = parseInt(style.getPropertyValue('padding-left')) || 0
    const rightInset = parseInt(style.getPropertyValue('padding-right')) || 0
    safeAreaInsets = leftInset + rightInset
  }

  // Character width is approximately 0.55em for IBM Plex Mono
  // (more accurate than 0.6 for smaller font sizes)
  const charWidth = config.fontSize * 0.55

  // Calculate how many characters actually fit
  const availableWidth = width - totalPadding - safeAreaInsets
  const calculatedCols = Math.floor(availableWidth / charWidth)

  // Use calculated columns, but respect the minCols as an absolute minimum
  // and cap at 80 for desktop readability
  const finalCols = Math.max(config.minCols, Math.min(calculatedCols, 80))

  console.log('[Terminal Responsive]', {
    width,
    breakpoint: breakpoint.breakpoint,
    fontSize: config.fontSize,
    padding: totalPadding,
    safeAreaInsets,
    charWidth,
    availableWidth,
    calculatedCols,
    finalCols
  })

  config.minCols = finalCols

  return {
    ...breakpoint,
    config
  }
}

export function getCurrentViewportWidth(): number {
  return window.innerWidth
}

// Responsive image sizing configuration
export interface ImageSize {
  maxWidth: number
  maxHeight: number
}

const IMAGE_SIZES: Record<string, ImageSize> = {
  mobile: { maxWidth: 280, maxHeight: 280 },
  tablet: { maxWidth: 400, maxHeight: 400 },
  desktop: { maxWidth: 600, maxHeight: 600 }
}

export function getResponsiveImageSize(breakpoint: string): ImageSize {
  return IMAGE_SIZES[breakpoint] || IMAGE_SIZES.mobile
}

export function calculateImageDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // Handle zero dimensions
  if (naturalWidth === 0 || naturalHeight === 0) {
    return { width: naturalWidth, height: naturalHeight }
  }

  // Don't upscale small images
  if (naturalWidth <= maxWidth && naturalHeight <= maxHeight) {
    return { width: naturalWidth, height: naturalHeight }
  }

  // Calculate aspect ratio
  const aspectRatio = naturalWidth / naturalHeight

  // Scale down by width constraint
  let width = Math.min(naturalWidth, maxWidth)
  let height = width / aspectRatio

  // If height exceeds max, scale by height instead
  if (height > maxHeight) {
    height = maxHeight
    width = height * aspectRatio
  }

  // Return whole numbers
  return {
    width: Math.round(width),
    height: Math.round(height)
  }
}
