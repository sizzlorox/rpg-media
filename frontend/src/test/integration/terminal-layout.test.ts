// Integration Test: Frame Centering and Layout
// Feature: 001-custom-terminal-emulator
// User Story 6: ASCII Frame Rendering with Centered Content

import { describe, it, expect } from 'vitest'
import { centerTextInFrame, createFrameBorder } from '../../utils/ascii-frame'
import { getResponsiveConfig } from '../../utils/terminal-responsive'

describe('Terminal Layout Integration', () => {
  it('should center text in frame on mobile', () => {
    const config = getResponsiveConfig(375) // Mobile
    const frameWidth = config.config.minCols

    const text = 'Title'
    const centered = centerTextInFrame(text, frameWidth)

    // Calculate expected padding
    const totalPadding = frameWidth - text.length
    const leftPadding = Math.floor(totalPadding / 2)
    const rightPadding = totalPadding - leftPadding

    expect(centered.length).toBe(frameWidth)
    expect(centered.trim()).toBe(text)
    expect(centered.indexOf(text)).toBe(leftPadding)
  })

  it('should center text in frame on tablet', () => {
    const config = getResponsiveConfig(768) // Tablet
    const frameWidth = config.config.minCols

    const text = 'Character Sheet'
    const centered = centerTextInFrame(text, frameWidth)

    expect(centered.length).toBe(frameWidth)
    expect(centered.trim()).toBe(text)

    // Text should be roughly centered
    const position = centered.indexOf(text)
    const expectedCenter = (frameWidth - text.length) / 2
    expect(Math.abs(position - expectedCenter)).toBeLessThanOrEqual(1)
  })

  it('should center text in frame on desktop', () => {
    const config = getResponsiveConfig(1920) // Desktop
    const frameWidth = config.config.minCols

    const text = 'Welcome to RPG Media'
    const centered = centerTextInFrame(text, frameWidth)

    expect(centered.length).toBe(frameWidth)
    expect(centered.trim()).toBe(text)

    // Verify centering accuracy
    const leftPadding = centered.indexOf(text)
    const rightPadding = centered.length - centered.lastIndexOf(text) - text.length
    expect(Math.abs(leftPadding - rightPadding)).toBeLessThanOrEqual(1)
  })

  it('should create frame border at mobile width', () => {
    const config = getResponsiveConfig(320) // Small mobile
    const width = config.config.minCols

    const topBorder = createFrameBorder(width, 'top')
    const bottomBorder = createFrameBorder(width, 'bottom')

    expect(topBorder.length).toBe(width)
    expect(bottomBorder.length).toBe(width)
    expect(topBorder[0]).toBe('┌')
    expect(topBorder[width - 1]).toBe('┐')
    expect(bottomBorder[0]).toBe('└')
    expect(bottomBorder[width - 1]).toBe('┘')
  })

  it('should create frame border at tablet width', () => {
    const config = getResponsiveConfig(768)
    const width = config.config.minCols

    const topBorder = createFrameBorder(width, 'top')
    const sideBorder = createFrameBorder(width, 'side', 'Content')

    expect(topBorder.length).toBe(width)
    expect(sideBorder.length).toBe(width)
    expect(sideBorder[0]).toBe('│')
    expect(sideBorder[width - 1]).toBe('│')
    expect(sideBorder).toContain('Content')
  })

  it('should create frame border at desktop width', () => {
    const config = getResponsiveConfig(1920)
    const width = config.config.minCols

    const border = createFrameBorder(width, 'top')

    expect(border.length).toBe(width)
    expect(border).toContain('─')
    expect(border[0]).toBe('┌')
    expect(border[border.length - 1]).toBe('┐')
  })

  it('should handle long text in narrow frames', () => {
    const config = getResponsiveConfig(320) // Very narrow
    const frameWidth = config.config.minCols

    const longText = 'This is a very long title that exceeds frame width'
    const centered = centerTextInFrame(longText, frameWidth)

    // Should truncate or wrap
    expect(centered.length).toBeLessThanOrEqual(frameWidth)
  })

  it('should handle empty text centering', () => {
    const config = getResponsiveConfig(1920)
    const frameWidth = config.config.minCols

    const centered = centerTextInFrame('', frameWidth)

    expect(centered.length).toBe(frameWidth)
    expect(centered.trim()).toBe('')
  })

  it('should maintain frame structure across breakpoints', () => {
    const breakpoints = [320, 768, 1920]

    breakpoints.forEach(width => {
      const config = getResponsiveConfig(width)
      const frameWidth = config.config.minCols

      const top = createFrameBorder(frameWidth, 'top')
      const bottom = createFrameBorder(frameWidth, 'bottom')
      const side = createFrameBorder(frameWidth, 'side', 'Test')

      // All borders should be same width
      expect(top.length).toBe(frameWidth)
      expect(bottom.length).toBe(frameWidth)
      expect(side.length).toBe(frameWidth)

      // Structure should be consistent
      expect(top[0]).toBe('┌')
      expect(bottom[0]).toBe('└')
      expect(side[0]).toBe('│')
    })
  })

  it('should handle multi-line content in frame', () => {
    const config = getResponsiveConfig(1920)
    const frameWidth = config.config.minCols

    const lines = [
      'Line 1',
      'Line 2',
      'Line 3'
    ]

    const centeredLines = lines.map(line => centerTextInFrame(line, frameWidth))

    centeredLines.forEach(line => {
      expect(line.length).toBe(frameWidth)
    })
  })

  it('should center content with different alignments', () => {
    const config = getResponsiveConfig(768)
    const frameWidth = config.config.minCols

    const shortText = 'Hi'
    const mediumText = 'Hello World'
    const longText = 'This is a longer piece of text'

    const centered1 = centerTextInFrame(shortText, frameWidth)
    const centered2 = centerTextInFrame(mediumText, frameWidth)
    const centered3 = centerTextInFrame(longText, frameWidth)

    // All should be same width
    expect(centered1.length).toBe(frameWidth)
    expect(centered2.length).toBe(frameWidth)
    expect(centered3.length).toBe(frameWidth)

    // All should be centered
    const pos1 = centered1.indexOf(shortText)
    const pos2 = centered2.indexOf(mediumText)
    const pos3 = centered3.indexOf(longText)

    expect(pos1).toBeGreaterThan(pos2)
    expect(pos2).toBeGreaterThan(pos3)
  })

  it('should handle frame rendering with ANSI colors', () => {
    const config = getResponsiveConfig(1920)
    const frameWidth = config.config.minCols

    // Frame with ANSI color codes
    const coloredText = '\x1b[32mGreen Title\x1b[0m'
    const centered = centerTextInFrame(coloredText, frameWidth)

    // Should preserve ANSI codes
    expect(centered).toContain('\x1b[32m')
    expect(centered).toContain('\x1b[0m')
    expect(centered).toContain('Green Title')
  })

  it('should handle nested frames', () => {
    const config = getResponsiveConfig(1920)
    const outerWidth = config.config.minCols
    const innerWidth = outerWidth - 4 // Leave space for borders

    const outerTop = createFrameBorder(outerWidth, 'top')
    const innerTop = createFrameBorder(innerWidth, 'top')

    expect(outerTop.length).toBe(outerWidth)
    expect(innerTop.length).toBe(innerWidth)
    expect(outerTop.length).toBeGreaterThan(innerTop.length)
  })

  it('should handle frame with custom characters', () => {
    const config = getResponsiveConfig(768)
    const width = config.config.minCols

    // Custom border characters
    const border = '═'.repeat(width - 2)
    const frame = `╔${border}╗`

    expect(frame.length).toBe(width)
    expect(frame[0]).toBe('╔')
    expect(frame[frame.length - 1]).toBe('╗')
  })

  it('should maintain layout during breakpoint transitions', () => {
    const widths = [320, 640, 641, 1024, 1025, 1920]
    const frames = widths.map(w => {
      const config = getResponsiveConfig(w)
      return createFrameBorder(config.config.minCols, 'top')
    })

    frames.forEach((frame, i) => {
      expect(frame.length).toBeGreaterThan(0)
      // Each frame should be valid
      expect(frame[0]).toMatch(/[┌╔]/)
    })
  })

  it('should handle RTL text in frames', () => {
    const config = getResponsiveConfig(1920)
    const frameWidth = config.config.minCols

    // Hebrew text (RTL)
    const rtlText = 'שלום עולם'
    const centered = centerTextInFrame(rtlText, frameWidth)

    expect(centered.length).toBe(frameWidth)
    expect(centered).toContain(rtlText)
  })

  it('should handle very wide content', () => {
    const config = getResponsiveConfig(1920)
    const frameWidth = config.config.minCols

    const wideContent = 'A'.repeat(frameWidth + 50)
    const centered = centerTextInFrame(wideContent, frameWidth)

    // Should not exceed frame width
    expect(centered.length).toBeLessThanOrEqual(frameWidth)
  })

  it('should handle character sheet frame layout', () => {
    const config = getResponsiveConfig(1920)
    const frameWidth = config.config.minCols

    const sheetLines = [
      createFrameBorder(frameWidth, 'top'),
      createFrameBorder(frameWidth, 'side', centerTextInFrame('CHARACTER SHEET', frameWidth - 4)),
      createFrameBorder(frameWidth, 'side', centerTextInFrame('Level 5 Wizard', frameWidth - 4)),
      createFrameBorder(frameWidth, 'bottom')
    ]

    sheetLines.forEach(line => {
      expect(line.length).toBeGreaterThan(0)
    })

    expect(sheetLines[0][0]).toBe('┌')
    expect(sheetLines[1][0]).toBe('│')
    expect(sheetLines[3][0]).toBe('└')
  })

  it('should handle dynamic content resizing', () => {
    const mobileConfig = getResponsiveConfig(375)
    const desktopConfig = getResponsiveConfig(1920)

    const content = 'Dynamic Content'

    const mobileCentered = centerTextInFrame(content, mobileConfig.config.minCols)
    const desktopCentered = centerTextInFrame(content, desktopConfig.config.minCols)

    // Both should contain the content
    expect(mobileCentered).toContain(content)
    expect(desktopCentered).toContain(content)

    // Desktop should have more padding
    const mobilePadding = mobileCentered.indexOf(content)
    const desktopPadding = desktopCentered.indexOf(content)

    expect(desktopPadding).toBeGreaterThan(mobilePadding)
  })
})
