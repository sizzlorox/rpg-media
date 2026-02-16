// Safe Area Insets Handling
// Feature: 001-custom-terminal-emulator
// User Story 5: Responsive Design Across All Devices
// Purpose: Handle iPhone X+ notch and other device cutouts

export interface SafeAreaInsets {
  top: number
  right: number
  bottom: number
  left: number
}

// Cache for safe area insets to avoid repeated getComputedStyle calls
let cachedInsets: SafeAreaInsets | null = null

/**
 * Get current safe area insets from CSS environment variables
 * Supports iPhone X+ notch and other device cutouts
 */
export function getSafeAreaInsets(): SafeAreaInsets {
  // Return cached values if available
  if (cachedInsets !== null) {
    return { ...cachedInsets }
  }

  // Try to read safe-area-inset-* CSS environment variables
  // These are available on devices with notches/cutouts
  const computedStyle = getComputedStyle(document.documentElement)

  const insets: SafeAreaInsets = {
    top: parseSafeAreaValue(computedStyle.getPropertyValue('safe-area-inset-top')),
    right: parseSafeAreaValue(computedStyle.getPropertyValue('safe-area-inset-right')),
    bottom: parseSafeAreaValue(computedStyle.getPropertyValue('safe-area-inset-bottom')),
    left: parseSafeAreaValue(computedStyle.getPropertyValue('safe-area-inset-left'))
  }

  // Cache the results
  cachedInsets = insets

  return { ...insets }
}

/**
 * Parse safe area inset value from CSS
 */
function parseSafeAreaValue(value: string): number {
  if (!value || value === '') {
    return 0
  }

  // Remove 'px' suffix and parse as float
  const parsed = parseFloat(value.replace('px', ''))
  return isNaN(parsed) ? 0 : Math.max(0, parsed)
}

/**
 * Apply safe area padding to a container element
 * Returns calculated padding values
 */
export function applySafeAreaPadding(
  element: HTMLElement | null,
  options: {
    top?: boolean
    right?: boolean
    bottom?: boolean
    left?: boolean
    additionalPadding?: number
  } = {}
): SafeAreaInsets {
  const insets = getSafeAreaInsets()
  const additionalPadding = options.additionalPadding || 0

  const padding: SafeAreaInsets = {
    top: (options.top !== false ? insets.top : 0) + additionalPadding,
    right: (options.right !== false ? insets.right : 0) + additionalPadding,
    bottom: (options.bottom !== false ? insets.bottom : 0) + additionalPadding,
    left: (options.left !== false ? insets.left : 0) + additionalPadding
  }

  if (element) {
    element.style.paddingTop = `${padding.top}px`
    element.style.paddingRight = `${padding.right}px`
    element.style.paddingBottom = `${padding.bottom}px`
    element.style.paddingLeft = `${padding.left}px`
  }

  return padding
}

/**
 * Clear cached safe area insets (call on orientation change)
 */
export function clearSafeAreaCache(): void {
  cachedInsets = null
}

/**
 * Check if device supports safe area insets
 */
export function hasSafeAreaSupport(): boolean {
  const testValue = getComputedStyle(document.documentElement).getPropertyValue('safe-area-inset-top')
  return testValue !== ''
}
