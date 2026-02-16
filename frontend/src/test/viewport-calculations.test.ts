// Viewport Calculations Unit Tests
// Feature: 001-custom-terminal-emulator
// User Story 2: Smooth Scrolling with Content Synchronization

import { describe, it, expect } from 'vitest'

/**
 * Viewport calculation utilities
 */

export interface ViewportCalculations {
  startLine: number
  endLine: number
  visibleLineCount: number
  bufferLines: number
}

export function calculateVisibleRange(
  scrollY: number,
  viewportHeight: number,
  lineHeight: number,
  bufferLines: number = 50
): ViewportCalculations {
  const startLine = Math.floor(scrollY / lineHeight)
  const visibleLineCount = Math.ceil(viewportHeight / lineHeight)
  const endLine = startLine + visibleLineCount + bufferLines

  return {
    startLine,
    endLine,
    visibleLineCount,
    bufferLines
  }
}

export function isLineVisible(
  lineNumber: number,
  scrollY: number,
  viewportHeight: number,
  lineHeight: number
): boolean {
  const lineTop = lineNumber * lineHeight
  const lineBottom = lineTop + lineHeight
  const viewportBottom = scrollY + viewportHeight

  return lineBottom >= scrollY && lineTop <= viewportBottom
}

export function calculateScrollPositionForLine(
  lineNumber: number,
  lineHeight: number,
  position: 'top' | 'center' | 'bottom' = 'top'
): number {
  if (position === 'top') {
    return lineNumber * lineHeight
  } else if (position === 'center') {
    return lineNumber * lineHeight - (window.innerHeight / 2)
  } else {
    return lineNumber * lineHeight - window.innerHeight + lineHeight
  }
}

describe('calculateVisibleRange', () => {
  it('should calculate correct visible range at top of buffer', () => {
    const result = calculateVisibleRange(0, 600, 20, 50)

    expect(result.startLine).toBe(0)
    expect(result.visibleLineCount).toBe(30) // 600 / 20
    expect(result.endLine).toBe(80) // 0 + 30 + 50
    expect(result.bufferLines).toBe(50)
  })

  it('should calculate correct visible range when scrolled', () => {
    const result = calculateVisibleRange(1000, 600, 20, 50)

    expect(result.startLine).toBe(50) // 1000 / 20
    expect(result.visibleLineCount).toBe(30)
    expect(result.endLine).toBe(130) // 50 + 30 + 50
  })

  it('should handle fractional scroll positions', () => {
    const result = calculateVisibleRange(1015, 600, 20, 50)

    expect(result.startLine).toBe(50) // floor(1015 / 20)
    expect(result.visibleLineCount).toBe(30)
    expect(result.endLine).toBe(130)
  })

  it('should handle different viewport heights', () => {
    const result = calculateVisibleRange(0, 800, 20, 50)

    expect(result.visibleLineCount).toBe(40) // 800 / 20
    expect(result.endLine).toBe(90) // 0 + 40 + 50
  })

  it('should handle different line heights', () => {
    const result = calculateVisibleRange(0, 600, 25, 50)

    expect(result.visibleLineCount).toBe(24) // ceil(600 / 25)
    expect(result.endLine).toBe(74) // 0 + 24 + 50
  })

  it('should handle custom buffer sizes', () => {
    const result = calculateVisibleRange(0, 600, 20, 100)

    expect(result.bufferLines).toBe(100)
    expect(result.endLine).toBe(130) // 0 + 30 + 100
  })

  it('should handle zero buffer', () => {
    const result = calculateVisibleRange(0, 600, 20, 0)

    expect(result.bufferLines).toBe(0)
    expect(result.endLine).toBe(30) // 0 + 30 + 0
  })

  it('should calculate correctly for mobile viewport', () => {
    // iPhone 12 Pro: 390x844
    const result = calculateVisibleRange(0, 844, 16, 50)

    expect(result.startLine).toBe(0)
    expect(result.visibleLineCount).toBe(53) // ceil(844 / 16)
    expect(result.endLine).toBe(103)
  })

  it('should calculate correctly for tablet viewport', () => {
    // iPad: 768x1024
    const result = calculateVisibleRange(0, 1024, 18, 50)

    expect(result.startLine).toBe(0)
    expect(result.visibleLineCount).toBe(57) // ceil(1024 / 18)
    expect(result.endLine).toBe(107)
  })

  it('should calculate correctly for desktop viewport', () => {
    // Desktop: 1920x1080
    const result = calculateVisibleRange(0, 1080, 20, 50)

    expect(result.startLine).toBe(0)
    expect(result.visibleLineCount).toBe(54) // ceil(1080 / 20)
    expect(result.endLine).toBe(104)
  })
})

describe('isLineVisible', () => {
  it('should return true for line fully in viewport', () => {
    const visible = isLineVisible(5, 0, 600, 20)
    expect(visible).toBe(true)
  })

  it('should return true for line at top of viewport', () => {
    const visible = isLineVisible(0, 0, 600, 20)
    expect(visible).toBe(true)
  })

  it('should return true for line at bottom of viewport', () => {
    const visible = isLineVisible(29, 0, 600, 20)
    expect(visible).toBe(true)
  })

  it('should return false for line above viewport', () => {
    const visible = isLineVisible(10, 500, 600, 20)
    expect(visible).toBe(false) // Line 10 is at position 200, viewport starts at 500
  })

  it('should return false for line below viewport', () => {
    const visible = isLineVisible(100, 0, 600, 20)
    expect(visible).toBe(false) // Line 100 is at 2000, viewport ends at 600
  })

  it('should return true for partially visible line at top', () => {
    // Line 5 is at 100-120, viewport starts at 110
    const visible = isLineVisible(5, 110, 600, 20)
    expect(visible).toBe(true)
  })

  it('should return true for partially visible line at bottom', () => {
    // Line 30 is at 600-620, viewport ends at 610
    const visible = isLineVisible(30, 10, 600, 20)
    expect(visible).toBe(true)
  })

  it('should handle different line heights', () => {
    const visible = isLineVisible(10, 0, 600, 30)
    expect(visible).toBe(true) // Line 10 at 300, viewport at 0-600
  })
})

describe('calculateScrollPositionForLine', () => {
  it('should calculate top position correctly', () => {
    const position = calculateScrollPositionForLine(10, 20, 'top')
    expect(position).toBe(200) // 10 * 20
  })

  it('should calculate center position correctly', () => {
    // Mock window height
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800
    })

    const position = calculateScrollPositionForLine(10, 20, 'center')
    expect(position).toBe(-200) // (10 * 20) - (800 / 2)

    // Restore
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    })
  })

  it('should calculate bottom position correctly', () => {
    const originalInnerHeight = window.innerHeight
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800
    })

    const position = calculateScrollPositionForLine(50, 20, 'bottom')
    expect(position).toBe(220) // (50 * 20) - 800 + 20

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight
    })
  })

  it('should default to top position', () => {
    const position = calculateScrollPositionForLine(5, 25)
    expect(position).toBe(125) // 5 * 25
  })

  it('should handle line 0', () => {
    const position = calculateScrollPositionForLine(0, 20, 'top')
    expect(position).toBe(0)
  })

  it('should handle large line numbers', () => {
    const position = calculateScrollPositionForLine(10000, 20, 'top')
    expect(position).toBe(200000)
  })
})

describe('Edge cases', () => {
  it('should handle extremely small viewport', () => {
    const result = calculateVisibleRange(0, 10, 20, 50)
    expect(result.visibleLineCount).toBe(1) // ceil(10 / 20)
    expect(result.endLine).toBe(51)
  })

  it('should handle extremely large viewport', () => {
    const result = calculateVisibleRange(0, 10000, 20, 50)
    expect(result.visibleLineCount).toBe(500)
    expect(result.endLine).toBe(550)
  })

  it('should handle very small line height', () => {
    const result = calculateVisibleRange(0, 600, 1, 50)
    expect(result.visibleLineCount).toBe(600)
    expect(result.endLine).toBe(650)
  })

  it('should handle very large line height', () => {
    const result = calculateVisibleRange(0, 600, 100, 50)
    expect(result.visibleLineCount).toBe(6) // ceil(600 / 100)
    expect(result.endLine).toBe(56)
  })

  it('should handle zero scroll position', () => {
    const result = calculateVisibleRange(0, 600, 20, 50)
    expect(result.startLine).toBe(0)
  })

  it('should handle very large scroll position', () => {
    const result = calculateVisibleRange(1000000, 600, 20, 50)
    expect(result.startLine).toBe(50000) // floor(1000000 / 20)
  })
})
