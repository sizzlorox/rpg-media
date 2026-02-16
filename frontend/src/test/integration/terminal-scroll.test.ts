// Integration Test: Scroll Performance
// Feature: 001-custom-terminal-emulator
// User Story 2: Smooth Scrolling with Content Synchronization

import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { CircularScrollBuffer } from '../../utils/scroll-buffer'
import { createDefaultLine } from '../../types/terminal'
import { calculateVirtualScroll } from '../virtual-scrolling.test'

describe('Terminal Scroll Performance Integration', () => {
  let buffer: CircularScrollBuffer

  beforeEach(() => {
    buffer = new CircularScrollBuffer(10000)
  })

  it('should handle rapid scroll through large buffer', () => {
    // Given: Large buffer with many lines
    for (let i = 0; i < 1000; i++) {
      const line = createDefaultLine(i, 80)
      line.cells = `Line ${i}`.split('').map(char => ({
        char,
        fgColor: null,
        bgColor: null,
        bold: false,
        italic: false,
        underline: false,
        dim: false,
        inverse: false,
        hidden: false
      }))
      buffer.append(line)
    }

    // When: Simulate rapid scrolling
    const scrollPositions = [0, 500, 1000, 1500, 2000, 1500, 1000, 500, 0]
    const results = scrollPositions.map(scrollY =>
      calculateVirtualScroll(1000, scrollY, 600, 20, 50)
    )

    // Then: All scroll calculations should complete successfully
    expect(results).toHaveLength(scrollPositions.length)
    results.forEach(result => {
      expect(result.renderWindowStart).toBeGreaterThanOrEqual(0)
      expect(result.renderWindowEnd).toBeLessThanOrEqual(1000)
      expect(result.shouldRender).toBe(true)
    })
  })

  it('should maintain buffer integrity during scroll', () => {
    // Given: Buffer with content
    const testLines = 100
    for (let i = 0; i < testLines; i++) {
      buffer.append(createDefaultLine(i, 80))
    }

    // When: Access lines at different positions
    const positions = [0, 25, 50, 75, 99]
    const lines = positions.map(pos => buffer.getLine(pos))

    // Then: All lines should be retrievable
    lines.forEach((line, index) => {
      expect(line).toBeDefined()
      expect(line?.metadata.lineNumber).toBe(positions[index])
    })
  })

  it('should handle scroll to bottom efficiently', () => {
    // Given: Full buffer
    for (let i = 0; i < 1000; i++) {
      buffer.append(createDefaultLine(i, 80))
    }

    // When: Calculate scroll at bottom
    const bottomScroll = calculateVirtualScroll(1000, 19000, 600, 20, 50)

    // Then: Should show correct range
    expect(bottomScroll.renderWindowStart).toBeGreaterThan(900)
    expect(bottomScroll.renderWindowEnd).toBe(1000)
    expect(bottomScroll.bottomPadding).toBe(0)
  })

  it('should handle scroll to top efficiently', () => {
    // Given: Buffer with content
    for (let i = 0; i < 1000; i++) {
      buffer.append(createDefaultLine(i, 80))
    }

    // When: Calculate scroll at top
    const topScroll = calculateVirtualScroll(1000, 0, 600, 20, 50)

    // Then: Should show correct range
    expect(topScroll.renderWindowStart).toBe(0)
    expect(topScroll.topPadding).toBe(0)
  })

  it('should maintain constant render window size during scroll', () => {
    // Given: Buffer with content
    for (let i = 0; i < 1000; i++) {
      buffer.append(createDefaultLine(i, 80))
    }

    // When: Calculate scroll at different positions
    const scrollPositions = [0, 1000, 2000, 3000, 4000, 5000]
    const windowSizes = scrollPositions.map(scrollY => {
      const result = calculateVirtualScroll(1000, scrollY, 600, 20, 50)
      return result.renderWindowEnd - result.renderWindowStart
    })

    // Then: Window sizes should be relatively constant
    const maxSize = Math.max(...windowSizes)
    const minSize = Math.min(...windowSizes)
    expect(maxSize - minSize).toBeLessThan(5) // Allow small variance
  })

  it('should handle buffer wraparound during scroll', () => {
    // Given: Buffer that will wrap (max 10000, add 11000)
    const bufferSmall = new CircularScrollBuffer(100)

    for (let i = 0; i < 150; i++) {
      bufferSmall.append(createDefaultLine(i, 80))
    }

    // When: Access lines after wraparound
    const visibleRange = bufferSmall.getVisibleRange(0, 50)

    // Then: Should get the most recent 100 lines
    expect(visibleRange.length).toBeGreaterThan(0)
    expect(bufferSmall.getLength()).toBe(100)
  })
})
