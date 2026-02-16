// Virtual Scrolling Logic Unit Tests
// Feature: 001-custom-terminal-emulator
// User Story 2: Smooth Scrolling with Content Synchronization

import { describe, it, expect } from 'vitest'

/**
 * Virtual scrolling utilities
 */

export interface VirtualScrollState {
  renderWindowStart: number
  renderWindowEnd: number
  topPadding: number
  bottomPadding: number
  shouldRender: boolean
}

export function calculateVirtualScroll(
  totalLines: number,
  scrollY: number,
  viewportHeight: number,
  lineHeight: number,
  bufferLines: number = 50
): VirtualScrollState {
  const startLine = Math.max(0, Math.floor(scrollY / lineHeight) - bufferLines)
  const visibleLineCount = Math.ceil(viewportHeight / lineHeight)
  const endLine = Math.min(
    totalLines,
    Math.floor(scrollY / lineHeight) + visibleLineCount + bufferLines
  )

  const topPadding = startLine * lineHeight
  const renderedLines = endLine - startLine
  const bottomPadding = Math.max(0, (totalLines - endLine) * lineHeight)

  return {
    renderWindowStart: startLine,
    renderWindowEnd: endLine,
    topPadding,
    bottomPadding,
    shouldRender: renderedLines > 0
  }
}

export function shouldUpdateVirtualScroll(
  prevState: VirtualScrollState,
  newScrollY: number,
  lineHeight: number,
  threshold: number = 10
): boolean {
  const prevScrollLine = Math.floor((prevState.renderWindowStart * lineHeight) / lineHeight)
  const newScrollLine = Math.floor(newScrollY / lineHeight)

  return Math.abs(newScrollLine - prevScrollLine) > threshold
}

export function calculateAbsolutePosition(
  lineNumber: number,
  lineHeight: number,
  topPadding: number
): number {
  return topPadding + (lineNumber * lineHeight)
}

describe('calculateVirtualScroll', () => {
  it('should calculate render window at start of buffer', () => {
    const state = calculateVirtualScroll(1000, 0, 600, 20, 50)

    expect(state.renderWindowStart).toBe(0) // Can't go below 0
    expect(state.renderWindowEnd).toBe(80) // 0 + 30 visible + 50 buffer
    expect(state.topPadding).toBe(0)
    expect(state.bottomPadding).toBe((1000 - 80) * 20) // 18400
    expect(state.shouldRender).toBe(true)
  })

  it('should calculate render window in middle of buffer', () => {
    // Scrolled to line 100 (scrollY = 2000)
    const state = calculateVirtualScroll(1000, 2000, 600, 20, 50)

    expect(state.renderWindowStart).toBe(50) // 100 - 50 buffer
    expect(state.renderWindowEnd).toBe(180) // 100 + 30 visible + 50 buffer
    expect(state.topPadding).toBe(50 * 20) // 1000
    expect(state.bottomPadding).toBe((1000 - 180) * 20) // 16400
    expect(state.shouldRender).toBe(true)
  })

  it('should calculate render window at end of buffer', () => {
    // Scrolled near end (total lines = 1000, visible = 30)
    const state = calculateVirtualScroll(1000, 19400, 600, 20, 50)

    const scrollLine = Math.floor(19400 / 20) // 970
    expect(state.renderWindowStart).toBe(920) // 970 - 50
    expect(state.renderWindowEnd).toBe(1000) // Can't exceed total
    expect(state.topPadding).toBe(920 * 20) // 18400
    expect(state.bottomPadding).toBe(0) // At the end
    expect(state.shouldRender).toBe(true)
  })

  it('should handle buffer size larger than viewport', () => {
    const state = calculateVirtualScroll(1000, 0, 600, 20, 200)

    expect(state.renderWindowStart).toBe(0)
    expect(state.renderWindowEnd).toBe(230) // 0 + 30 visible + 200 buffer
  })

  it('should handle buffer size of zero', () => {
    const state = calculateVirtualScroll(1000, 1000, 600, 20, 0)

    const scrollLine = Math.floor(1000 / 20) // 50
    expect(state.renderWindowStart).toBe(50) // 50 - 0 buffer
    expect(state.renderWindowEnd).toBe(80) // 50 + 30 visible + 0 buffer
  })

  it('should handle total lines less than viewport', () => {
    const state = calculateVirtualScroll(10, 0, 600, 20, 50)

    expect(state.renderWindowStart).toBe(0)
    expect(state.renderWindowEnd).toBe(10) // Clamped to total
    expect(state.topPadding).toBe(0)
    expect(state.bottomPadding).toBe(0)
    expect(state.shouldRender).toBe(true)
  })

  it('should handle empty buffer', () => {
    const state = calculateVirtualScroll(0, 0, 600, 20, 50)

    expect(state.renderWindowStart).toBe(0)
    expect(state.renderWindowEnd).toBe(0)
    expect(state.topPadding).toBe(0)
    expect(state.bottomPadding).toBe(0)
    expect(state.shouldRender).toBe(false) // No lines to render
  })

  it('should calculate correctly for mobile viewport', () => {
    const state = calculateVirtualScroll(1000, 500, 844, 16, 50)

    const scrollLine = Math.floor(500 / 16) // 31
    const visibleLines = Math.ceil(844 / 16) // 53
    expect(state.renderWindowStart).toBe(0) // max(0, 31 - 50)
    expect(state.renderWindowEnd).toBe(134) // 31 + 53 + 50
  })

  it('should calculate correctly for tablet viewport', () => {
    const state = calculateVirtualScroll(1000, 1000, 1024, 18, 50)

    const scrollLine = Math.floor(1000 / 18) // 55
    const visibleLines = Math.ceil(1024 / 18) // 57
    expect(state.renderWindowStart).toBe(5) // 55 - 50
    expect(state.renderWindowEnd).toBe(162) // 55 + 57 + 50
  })

  it('should calculate correctly for desktop viewport', () => {
    const state = calculateVirtualScroll(1000, 2000, 1080, 20, 50)

    const scrollLine = Math.floor(2000 / 20) // 100
    const visibleLines = Math.ceil(1080 / 20) // 54
    expect(state.renderWindowStart).toBe(50) // 100 - 50
    expect(state.renderWindowEnd).toBe(204) // 100 + 54 + 50
  })

  it('should prevent negative top padding', () => {
    const state = calculateVirtualScroll(1000, 0, 600, 20, 100)

    expect(state.topPadding).toBeGreaterThanOrEqual(0)
  })

  it('should prevent negative bottom padding', () => {
    const state = calculateVirtualScroll(100, 2000, 600, 20, 50)

    expect(state.bottomPadding).toBeGreaterThanOrEqual(0)
  })
})

describe('shouldUpdateVirtualScroll', () => {
  it('should not update for small scroll changes', () => {
    const prevState = calculateVirtualScroll(1000, 0, 600, 20, 50)
    const shouldUpdate = shouldUpdateVirtualScroll(prevState, 100, 20, 10)

    // Scrolled 100px = 5 lines, below threshold of 10
    expect(shouldUpdate).toBe(false)
  })

  it('should update for large scroll changes', () => {
    const prevState = calculateVirtualScroll(1000, 0, 600, 20, 50)
    const shouldUpdate = shouldUpdateVirtualScroll(prevState, 300, 20, 10)

    // Scrolled 300px = 15 lines, above threshold of 10
    expect(shouldUpdate).toBe(true)
  })

  it('should update when crossing buffer boundary', () => {
    const prevState = calculateVirtualScroll(1000, 0, 600, 20, 50)
    const shouldUpdate = shouldUpdateVirtualScroll(prevState, 1100, 20, 10)

    // Scrolled 1100px = 55 lines, well above threshold
    expect(shouldUpdate).toBe(true)
  })

  it('should handle custom threshold', () => {
    const prevState = calculateVirtualScroll(1000, 0, 600, 20, 50)

    // With threshold of 5, 6 lines should trigger update
    const shouldUpdate = shouldUpdateVirtualScroll(prevState, 120, 20, 5)
    expect(shouldUpdate).toBe(true)
  })

  it('should handle threshold of 0 (always update)', () => {
    const prevState = calculateVirtualScroll(1000, 0, 600, 20, 50)
    const shouldUpdate = shouldUpdateVirtualScroll(prevState, 20, 20, 0)

    expect(shouldUpdate).toBe(true)
  })

  it('should handle scrolling up', () => {
    const prevState = calculateVirtualScroll(1000, 1000, 600, 20, 50)
    const shouldUpdate = shouldUpdateVirtualScroll(prevState, 500, 20, 10)

    // Scrolled up 500px = 25 lines
    expect(shouldUpdate).toBe(true)
  })

  it('should handle scrolling down', () => {
    const prevState = calculateVirtualScroll(1000, 1000, 600, 20, 50)
    const shouldUpdate = shouldUpdateVirtualScroll(prevState, 1500, 20, 10)

    // Scrolled down 500px = 25 lines
    expect(shouldUpdate).toBe(true)
  })
})

describe('calculateAbsolutePosition', () => {
  it('should calculate position at start', () => {
    const position = calculateAbsolutePosition(0, 20, 0)
    expect(position).toBe(0)
  })

  it('should calculate position with top padding', () => {
    const position = calculateAbsolutePosition(0, 20, 1000)
    expect(position).toBe(1000) // topPadding + (0 * 20)
  })

  it('should calculate position for line in middle', () => {
    const position = calculateAbsolutePosition(10, 20, 1000)
    expect(position).toBe(1200) // 1000 + (10 * 20)
  })

  it('should calculate position for large line numbers', () => {
    const position = calculateAbsolutePosition(500, 20, 0)
    expect(position).toBe(10000) // 0 + (500 * 20)
  })

  it('should handle different line heights', () => {
    const position = calculateAbsolutePosition(10, 25, 500)
    expect(position).toBe(750) // 500 + (10 * 25)
  })

  it('should handle zero top padding', () => {
    const position = calculateAbsolutePosition(5, 20, 0)
    expect(position).toBe(100)
  })
})

describe('Virtual scrolling performance', () => {
  it('should handle rapid scroll updates efficiently', () => {
    let state = calculateVirtualScroll(10000, 0, 600, 20, 50)

    // Simulate rapid scrolling
    for (let i = 0; i < 100; i++) {
      const newScrollY = i * 100
      if (shouldUpdateVirtualScroll(state, newScrollY, 20, 10)) {
        state = calculateVirtualScroll(10000, newScrollY, 600, 20, 50)
      }
    }

    // Should have updated state multiple times
    expect(state.renderWindowStart).toBeGreaterThan(0)
  })

  it('should minimize render window size for performance', () => {
    const state = calculateVirtualScroll(10000, 5000, 600, 20, 50)

    const renderWindowSize = state.renderWindowEnd - state.renderWindowStart

    // Should be significantly smaller than total lines
    expect(renderWindowSize).toBeLessThan(10000)
    // But large enough for smooth scrolling
    expect(renderWindowSize).toBeGreaterThan(30) // At least viewport size
  })

  it('should maintain consistent render window size during scroll', () => {
    const state1 = calculateVirtualScroll(10000, 1000, 600, 20, 50)
    const state2 = calculateVirtualScroll(10000, 2000, 600, 20, 50)
    const state3 = calculateVirtualScroll(10000, 3000, 600, 20, 50)

    const size1 = state1.renderWindowEnd - state1.renderWindowStart
    const size2 = state2.renderWindowEnd - state2.renderWindowStart
    const size3 = state3.renderWindowEnd - state3.renderWindowStart

    // Render window size should be consistent (±1 due to rounding)
    expect(Math.abs(size1 - size2)).toBeLessThanOrEqual(1)
    expect(Math.abs(size2 - size3)).toBeLessThanOrEqual(1)
  })
})

describe('Edge cases', () => {
  it('should handle scroll position beyond content', () => {
    const state = calculateVirtualScroll(100, 10000, 600, 20, 50)

    expect(state.renderWindowEnd).toBeLessThanOrEqual(100)
    expect(state.bottomPadding).toBe(0)
  })

  it('should handle fractional scroll positions', () => {
    const state = calculateVirtualScroll(1000, 1234.56, 600, 20, 50)

    expect(state.renderWindowStart).toBeGreaterThanOrEqual(0)
    expect(state.renderWindowEnd).toBeLessThanOrEqual(1000)
  })

  it('should handle extremely large buffers', () => {
    const state = calculateVirtualScroll(1000, 500, 600, 20, 5000)

    expect(state.renderWindowStart).toBe(0) // max(0, 25 - 5000)
    expect(state.renderWindowEnd).toBe(1000) // min(1000, 25 + 30 + 5000)
  })

  it('should handle single line buffer', () => {
    const state = calculateVirtualScroll(1, 0, 600, 20, 50)

    expect(state.renderWindowStart).toBe(0)
    expect(state.renderWindowEnd).toBe(1)
    expect(state.shouldRender).toBe(true)
  })

  it('should handle very large line height', () => {
    const state = calculateVirtualScroll(1000, 0, 600, 200, 50)

    const visibleLines = Math.ceil(600 / 200) // 3
    expect(state.renderWindowEnd).toBe(53) // 0 + 3 + 50
  })
})
