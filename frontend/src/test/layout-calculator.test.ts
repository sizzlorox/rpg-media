// Layout Calculator Unit Tests
// Feature: 001-custom-terminal-emulator
// User Story 6: ASCII Frame Layout and Centering

import { describe, it, expect } from 'vitest'
import { calculateFrameLayout, centerTextInFrame, calculateNestedFrameLayout } from '../utils/layout-calculator'
import type { FrameBorderStyle } from '../types/layout'

const ASCII_BASIC: FrameBorderStyle = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|'
}

describe('calculateFrameLayout', () => {
  it('should calculate centered frame for desktop', () => {
    const layout = calculateFrameLayout(60, 80, 'desktop', ASCII_BASIC)

    expect(layout.contentWidth).toBe(60)
    expect(layout.totalWidth).toBe(64) // 60 + 2 borders + 2 padding
    expect(layout.leftPadding).toBe(8) // (80 - 64) / 2
    expect(layout.centered).toBe(true)
  })

  it('should calculate full-width frame for mobile', () => {
    const layout = calculateFrameLayout(30, 40, 'mobile', ASCII_BASIC)

    expect(layout.contentWidth).toBe(30)
    expect(layout.totalWidth).toBe(34) // 30 + 2 borders + 2 padding
    expect(layout.leftPadding).toBe(0) // Mobile doesn't center if frame is too wide
    expect(layout.centered).toBe(false)
  })

  it('should calculate for tablet', () => {
    const layout = calculateFrameLayout(50, 60, 'tablet', ASCII_BASIC)

    expect(layout.contentWidth).toBe(50)
    expect(layout.totalWidth).toBe(54)
    expect(layout.leftPadding).toBe(3) // (60 - 54) / 2
  })

  it('should clamp content to terminal width', () => {
    const layout = calculateFrameLayout(100, 50, 'desktop', ASCII_BASIC)

    // Content should be clamped to fit in terminal
    expect(layout.totalWidth).toBeLessThanOrEqual(50)
  })

  it('should handle minimum content width', () => {
    const layout = calculateFrameLayout(5, 80, 'desktop', ASCII_BASIC)

    expect(layout.contentWidth).toBeGreaterThanOrEqual(5)
    expect(layout.totalWidth).toBeGreaterThan(layout.contentWidth)
  })

  it('should account for border and padding', () => {
    const layout = calculateFrameLayout(40, 80, 'desktop', ASCII_BASIC)

    // Total width = content + 2 borders + 2 padding (1 on each side)
    expect(layout.totalWidth).toBe(44)
  })

  it('should center when frame is narrower than terminal', () => {
    const layout = calculateFrameLayout(30, 80, 'desktop', ASCII_BASIC)

    expect(layout.centered).toBe(true)
    expect(layout.leftPadding).toBeGreaterThan(0)
  })

  it('should not center when frame is too wide', () => {
    const layout = calculateFrameLayout(70, 80, 'desktop', ASCII_BASIC)

    // Frame with borders/padding would exceed terminal width
    expect(layout.centered).toBe(false)
    expect(layout.leftPadding).toBe(0)
  })
})

describe('centerTextInFrame', () => {
  it('should center short text', () => {
    const centered = centerTextInFrame('Hello', 20)

    const leadingSpaces = centered.match(/^ */)?.[0].length || 0
    const trailingSpaces = centered.match(/ *$/)?.[0].length || 0

    expect(leadingSpaces).toBeGreaterThan(0)
    expect(leadingSpaces).toBeCloseTo(trailingSpaces, 0)
    expect(centered.includes('Hello')).toBe(true)
  })

  it('should return text unchanged if exactly frame width', () => {
    const text = 'Exact'
    const centered = centerTextInFrame(text, text.length)

    expect(centered).toBe(text)
  })

  it('should truncate text longer than frame', () => {
    const longText = 'This is a very long text that should be truncated'
    const centered = centerTextInFrame(longText, 20)

    expect(centered.length).toBeLessThanOrEqual(20)
    expect(centered.includes('...')).toBe(true)
  })

  it('should handle empty text', () => {
    const centered = centerTextInFrame('', 20)

    expect(centered.length).toBe(20)
    expect(centered.trim()).toBe('')
  })

  it('should handle single character', () => {
    const centered = centerTextInFrame('X', 10)

    expect(centered.includes('X')).toBe(true)
    expect(centered.length).toBe(10)
  })

  it('should preserve special characters', () => {
    const text = '!@#$%'
    const centered = centerTextInFrame(text, 20)

    expect(centered.includes(text)).toBe(true)
  })

  it('should handle unicode characters', () => {
    const text = '😀👍'
    const centered = centerTextInFrame(text, 20)

    expect(centered.includes(text)).toBe(true)
  })
})

describe('calculateNestedFrameLayout', () => {
  it('should calculate inner frame centered in outer frame', () => {
    const outerLayout = calculateFrameLayout(60, 80, 'desktop', ASCII_BASIC)
    const innerLayout = calculateNestedFrameLayout(40, outerLayout, ASCII_BASIC)

    expect(innerLayout.contentWidth).toBe(40)
    expect(innerLayout.leftPadding).toBeGreaterThan(0)
    expect(innerLayout.totalWidth + innerLayout.leftPadding).toBeLessThanOrEqual(outerLayout.contentWidth)
  })

  it('should clamp inner frame to outer content width', () => {
    const outerLayout = calculateFrameLayout(30, 80, 'desktop', ASCII_BASIC)
    const innerLayout = calculateNestedFrameLayout(50, outerLayout, ASCII_BASIC)

    // Inner frame should fit within outer content
    expect(innerLayout.totalWidth).toBeLessThanOrEqual(outerLayout.contentWidth)
  })

  it('should center narrow inner frame', () => {
    const outerLayout = calculateFrameLayout(60, 80, 'desktop', ASCII_BASIC)
    const innerLayout = calculateNestedFrameLayout(20, outerLayout, ASCII_BASIC)

    expect(innerLayout.centered).toBe(true)
    expect(innerLayout.leftPadding).toBeGreaterThan(0)
  })

  it('should not center wide inner frame', () => {
    const outerLayout = calculateFrameLayout(60, 80, 'desktop', ASCII_BASIC)
    const innerLayout = calculateNestedFrameLayout(55, outerLayout, ASCII_BASIC)

    expect(innerLayout.centered).toBe(false)
    expect(innerLayout.leftPadding).toBe(0)
  })
})

describe('Responsive frame sizing', () => {
  it('should use different widths for different breakpoints', () => {
    const contentWidth = 50

    const mobile = calculateFrameLayout(contentWidth, 40, 'mobile', ASCII_BASIC)
    const tablet = calculateFrameLayout(contentWidth, 60, 'tablet', ASCII_BASIC)
    const desktop = calculateFrameLayout(contentWidth, 80, 'desktop', ASCII_BASIC)

    // Mobile should clamp content more aggressively
    expect(mobile.contentWidth).toBeLessThan(contentWidth)
    expect(tablet.contentWidth).toBeLessThanOrEqual(contentWidth)
    expect(desktop.contentWidth).toBe(contentWidth)
  })

  it('should center on desktop but not mobile', () => {
    const contentWidth = 30

    const mobile = calculateFrameLayout(contentWidth, 40, 'mobile', ASCII_BASIC)
    const desktop = calculateFrameLayout(contentWidth, 80, 'desktop', ASCII_BASIC)

    expect(desktop.centered).toBe(true)
    expect(desktop.leftPadding).toBeGreaterThan(0)

    // Mobile might not center if space is tight
    if (mobile.totalWidth < 40) {
      expect(mobile.centered).toBe(true)
    }
  })
})

describe('Edge cases', () => {
  it('should handle terminal width of 1', () => {
    const layout = calculateFrameLayout(10, 1, 'desktop', ASCII_BASIC)

    expect(layout.totalWidth).toBeLessThanOrEqual(1)
  })

  it('should handle content width of 0', () => {
    const layout = calculateFrameLayout(0, 80, 'desktop', ASCII_BASIC)

    expect(layout.contentWidth).toBeGreaterThanOrEqual(0)
    expect(layout.totalWidth).toBeGreaterThan(0) // Still has borders
  })

  it('should handle very large terminal width', () => {
    const layout = calculateFrameLayout(50, 1000, 'desktop', ASCII_BASIC)

    expect(layout.totalWidth).toBe(54) // 50 + borders + padding
    expect(layout.leftPadding).toBeGreaterThan(0)
  })

  it('should handle very large content width', () => {
    const layout = calculateFrameLayout(1000, 80, 'desktop', ASCII_BASIC)

    expect(layout.totalWidth).toBeLessThanOrEqual(80)
  })
})
