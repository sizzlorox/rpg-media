// Frame Builder Unit Tests
// Feature: 001-custom-terminal-emulator
// User Story 6: ASCII Frame Layout and Centering

import { describe, it, expect } from 'vitest'
import { renderFrame, BOX_DRAWING_DOUBLE, BOX_DRAWING_SINGLE, ASCII_BASIC, ASCII_HASH } from '../utils/frame-builder'
import { calculateFrameLayout } from '../utils/layout-calculator'
import type { FrameLayout, FrameContent } from '../types/layout'

describe('renderFrame', () => {
  it('should render simple frame with single line content', () => {
    const layout: FrameLayout = {
      totalWidth: 20,
      contentWidth: 16,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: ['Hello World']
    }

    const lines = renderFrame(layout, content)

    // Should have top border, content line, bottom border
    expect(lines.length).toBeGreaterThanOrEqual(3)
    expect(lines[0].cells.some(c => c.char === '+')).toBe(true) // Top border
    expect(lines[lines.length - 1].cells.some(c => c.char === '+')).toBe(true) // Bottom border
  })

  it('should render frame with multiple lines', () => {
    const layout: FrameLayout = {
      totalWidth: 20,
      contentWidth: 16,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: ['Line 1', 'Line 2', 'Line 3']
    }

    const lines = renderFrame(layout, content)

    // Top border + 3 content lines + bottom border = 5
    expect(lines.length).toBe(5)
  })

  it('should use correct border characters for ASCII_BASIC', () => {
    const layout: FrameLayout = {
      totalWidth: 10,
      contentWidth: 6,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: ['Test']
    }

    const lines = renderFrame(layout, content)
    const topLine = lines[0]

    expect(topLine.cells[0].char).toBe('+')
    expect(topLine.cells[topLine.cells.length - 1].char).toBe('+')
    expect(topLine.cells[1].char).toBe('-')
  })

  it('should use correct border characters for BOX_DRAWING_DOUBLE', () => {
    const layout: FrameLayout = {
      totalWidth: 10,
      contentWidth: 6,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: BOX_DRAWING_DOUBLE
    }

    const content: FrameContent = {
      lines: ['Test']
    }

    const lines = renderFrame(layout, content)
    const topLine = lines[0]

    expect(topLine.cells[0].char).toBe('╔')
    expect(topLine.cells[topLine.cells.length - 1].char).toBe('╗')
    expect(topLine.cells[1].char).toBe('═')
  })

  it('should use correct border characters for BOX_DRAWING_SINGLE', () => {
    const layout: FrameLayout = {
      totalWidth: 10,
      contentWidth: 6,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: BOX_DRAWING_SINGLE
    }

    const content: FrameContent = {
      lines: ['Test']
    }

    const lines = renderFrame(layout, content)
    const topLine = lines[0]

    expect(topLine.cells[0].char).toBe('┌')
    expect(topLine.cells[topLine.cells.length - 1].char).toBe('┐')
    expect(topLine.cells[1].char).toBe('─')
  })

  it('should use correct border characters for ASCII_HASH', () => {
    const layout: FrameLayout = {
      totalWidth: 10,
      contentWidth: 6,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_HASH
    }

    const content: FrameContent = {
      lines: ['Test']
    }

    const lines = renderFrame(layout, content)
    const topLine = lines[0]

    expect(topLine.cells[0].char).toBe('#')
    expect(topLine.cells[topLine.cells.length - 1].char).toBe('#')
    expect(topLine.cells[1].char).toBe('#')
  })

  it('should pad content lines to frame width', () => {
    const layout: FrameLayout = {
      totalWidth: 20,
      contentWidth: 16,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: ['Short']
    }

    const lines = renderFrame(layout, content)
    const contentLine = lines[1] // First line after top border

    // Content line should have borders + padding + content + padding
    expect(contentLine.cells.length).toBe(layout.totalWidth)
    expect(contentLine.cells[0].char).toBe('|')
    expect(contentLine.cells[contentLine.cells.length - 1].char).toBe('|')
  })

  it('should handle empty content', () => {
    const layout: FrameLayout = {
      totalWidth: 20,
      contentWidth: 16,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: []
    }

    const lines = renderFrame(layout, content)

    // Should still have top and bottom borders
    expect(lines.length).toBeGreaterThanOrEqual(2)
  })

  it('should center content in frame when specified', () => {
    const layout: FrameLayout = {
      totalWidth: 30,
      contentWidth: 26,
      leftPadding: 0,
      topPadding: 0,
      centered: true,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: ['Short'],
      centered: true
    }

    const lines = renderFrame(layout, content)
    const contentLine = lines[1]

    // Content should be centered with spaces on both sides
    const text = contentLine.cells.map(c => c.char).join('')
    const trimmed = text.trim()

    expect(trimmed.includes('Short')).toBe(true)
  })

  it('should handle long content lines by truncating', () => {
    const layout: FrameLayout = {
      totalWidth: 20,
      contentWidth: 16,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: ['This is a very long line that should be truncated']
    }

    const lines = renderFrame(layout, content)
    const contentLine = lines[1]

    // Content line should not exceed total width
    expect(contentLine.cells.length).toBe(layout.totalWidth)
  })

  it('should render frame with title', () => {
    const layout: FrameLayout = {
      totalWidth: 30,
      contentWidth: 26,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      title: 'My Frame',
      lines: ['Content']
    }

    const lines = renderFrame(layout, content)

    // Should include title in or near top border
    const topBorderText = lines[0].cells.map(c => c.char).join('')
    const hasTitle = topBorderText.includes('My Frame') ||
                    (lines[1] && lines[1].cells.map(c => c.char).join('').includes('My Frame'))

    expect(hasTitle).toBe(true)
  })
})

describe('Border style constants', () => {
  it('should define BOX_DRAWING_DOUBLE', () => {
    expect(BOX_DRAWING_DOUBLE.topLeft).toBe('╔')
    expect(BOX_DRAWING_DOUBLE.topRight).toBe('╗')
    expect(BOX_DRAWING_DOUBLE.bottomLeft).toBe('╚')
    expect(BOX_DRAWING_DOUBLE.bottomRight).toBe('╝')
    expect(BOX_DRAWING_DOUBLE.horizontal).toBe('═')
    expect(BOX_DRAWING_DOUBLE.vertical).toBe('║')
  })

  it('should define BOX_DRAWING_SINGLE', () => {
    expect(BOX_DRAWING_SINGLE.topLeft).toBe('┌')
    expect(BOX_DRAWING_SINGLE.topRight).toBe('┐')
    expect(BOX_DRAWING_SINGLE.bottomLeft).toBe('└')
    expect(BOX_DRAWING_SINGLE.bottomRight).toBe('┘')
    expect(BOX_DRAWING_SINGLE.horizontal).toBe('─')
    expect(BOX_DRAWING_SINGLE.vertical).toBe('│')
  })

  it('should define ASCII_BASIC', () => {
    expect(ASCII_BASIC.topLeft).toBe('+')
    expect(ASCII_BASIC.topRight).toBe('+')
    expect(ASCII_BASIC.bottomLeft).toBe('+')
    expect(ASCII_BASIC.bottomRight).toBe('+')
    expect(ASCII_BASIC.horizontal).toBe('-')
    expect(ASCII_BASIC.vertical).toBe('|')
  })

  it('should define ASCII_HASH', () => {
    expect(ASCII_HASH.topLeft).toBe('#')
    expect(ASCII_HASH.topRight).toBe('#')
    expect(ASCII_HASH.bottomLeft).toBe('#')
    expect(ASCII_HASH.bottomRight).toBe('#')
    expect(ASCII_HASH.horizontal).toBe('#')
    expect(ASCII_HASH.vertical).toBe('#')
  })
})

describe('Integration with calculateFrameLayout', () => {
  it('should work with calculated layout', () => {
    const layout = calculateFrameLayout(40, 80, 'desktop', BOX_DRAWING_SINGLE)
    const content: FrameContent = {
      lines: ['Line 1', 'Line 2']
    }

    const lines = renderFrame(layout, content)

    expect(lines.length).toBeGreaterThan(0)
    expect(lines[0].cells.length).toBe(layout.totalWidth)
  })

  it('should handle centered layout from calculator', () => {
    const layout = calculateFrameLayout(30, 80, 'desktop', BOX_DRAWING_DOUBLE)
    const content: FrameContent = {
      lines: ['Centered content']
    }

    const lines = renderFrame(layout, content)

    expect(layout.centered).toBe(true)
    expect(lines.length).toBeGreaterThan(0)
  })
})

describe('Edge cases', () => {
  it('should handle minimum frame size', () => {
    const layout: FrameLayout = {
      totalWidth: 4, // Minimum: 2 borders + 2 chars
      contentWidth: 2,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: ['X']
    }

    const lines = renderFrame(layout, content)

    expect(lines.length).toBeGreaterThan(0)
    expect(lines[0].cells.length).toBe(4)
  })

  it('should handle single character width frame', () => {
    const layout: FrameLayout = {
      totalWidth: 3,
      contentWidth: 1,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: ['A']
    }

    const lines = renderFrame(layout, content)

    expect(lines.length).toBeGreaterThan(0)
  })

  it('should handle very wide frames', () => {
    const layout: FrameLayout = {
      totalWidth: 200,
      contentWidth: 196,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const content: FrameContent = {
      lines: ['Wide content']
    }

    const lines = renderFrame(layout, content)

    expect(lines[0].cells.length).toBe(200)
  })

  it('should handle many content lines', () => {
    const layout: FrameLayout = {
      totalWidth: 20,
      contentWidth: 16,
      leftPadding: 0,
      topPadding: 0,
      centered: false,
      borderStyle: ASCII_BASIC
    }

    const contentLines = Array(100).fill('Line')
    const content: FrameContent = {
      lines: contentLines
    }

    const lines = renderFrame(layout, content)

    expect(lines.length).toBe(102) // 100 content + top + bottom
  })
})
