// Text Wrapping Unit Tests
// Feature: 001-custom-terminal-emulator
// User Story 8: Text Wrapping and Overflow Handling

import { describe, it, expect } from 'vitest'
import type { TerminalCell } from '../types/terminal'

/**
 * Text wrapping utilities
 */

export interface WrappedLine {
  cells: TerminalCell[]
  wrapped: boolean
}

export function wrapText(
  cells: TerminalCell[],
  terminalWidth: number,
  wordBreak: boolean = false
): WrappedLine[] {
  if (cells.length === 0) {
    return []
  }

  if (terminalWidth <= 0) {
    return []
  }

  const lines: WrappedLine[] = []
  let currentLine: TerminalCell[] = []
  let currentWidth = 0

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]

    // Handle newlines
    if (cell.char === '\n' || cell.char === '\r') {
      lines.push({ cells: currentLine, wrapped: false })
      currentLine = []
      currentWidth = 0
      continue
    }

    // Check if adding this cell would exceed width
    if (currentWidth >= terminalWidth) {
      // Wrap to next line
      lines.push({ cells: currentLine, wrapped: true })
      currentLine = [cell]
      currentWidth = 1
    } else {
      currentLine.push(cell)
      currentWidth++
    }
  }

  // Add remaining cells
  if (currentLine.length > 0) {
    lines.push({ cells: currentLine, wrapped: false })
  }

  return lines
}

export function wrapTextWithWordBreak(
  cells: TerminalCell[],
  terminalWidth: number
): WrappedLine[] {
  if (cells.length === 0) {
    return []
  }

  const lines: WrappedLine[] = []
  let currentLine: TerminalCell[] = []
  let currentWidth = 0
  let wordStart = 0
  let inWord = false

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i]

    // Handle newlines
    if (cell.char === '\n' || cell.char === '\r') {
      lines.push({ cells: currentLine, wrapped: false })
      currentLine = []
      currentWidth = 0
      inWord = false
      continue
    }

    const isSpace = cell.char === ' '

    if (isSpace) {
      inWord = false
    } else if (!inWord) {
      inWord = true
      wordStart = currentLine.length
    }

    // Check if adding this cell would exceed width
    if (currentWidth >= terminalWidth) {
      // Try to wrap at word boundary if we're in a word
      if (inWord && wordStart > 0) {
        // Move word to next line
        const word = currentLine.slice(wordStart)
        currentLine = currentLine.slice(0, wordStart)
        lines.push({ cells: currentLine, wrapped: true })
        currentLine = word.concat([cell])
        currentWidth = currentLine.length
        wordStart = 0
      } else {
        // Hard wrap at character boundary
        lines.push({ cells: currentLine, wrapped: true })
        currentLine = [cell]
        currentWidth = 1
        inWord = !isSpace
        wordStart = 0
      }
    } else {
      currentLine.push(cell)
      currentWidth++
    }
  }

  // Add remaining cells
  if (currentLine.length > 0) {
    lines.push({ cells: currentLine, wrapped: false })
  }

  return lines
}

export function reflowText(
  wrappedLines: WrappedLine[],
  newTerminalWidth: number
): WrappedLine[] {
  // Unwrap all cells back into a single stream
  const allCells: TerminalCell[] = []

  for (const line of wrappedLines) {
    allCells.push(...line.cells)
    // Add newline between non-wrapped lines
    if (!line.wrapped && line !== wrappedLines[wrappedLines.length - 1]) {
      allCells.push({ char: '\n', fgColor: null, bgColor: null, bold: false, italic: false, underline: false, dim: false, inverse: false, hidden: false })
    }
  }

  // Re-wrap at new width
  return wrapText(allCells, newTerminalWidth)
}

// Helper to create simple cells for testing
function createCell(char: string): TerminalCell {
  return {
    char,
    fgColor: null,
    bgColor: null,
    bold: false,
    italic: false,
    underline: false,
    dim: false,
    inverse: false,
    hidden: false
  }
}

function createCells(text: string): TerminalCell[] {
  return text.split('').map(createCell)
}

describe('wrapText', () => {
  it('should not wrap text shorter than terminal width', () => {
    const cells = createCells('Hello')
    const wrapped = wrapText(cells, 10)

    expect(wrapped.length).toBe(1)
    expect(wrapped[0].wrapped).toBe(false)
    expect(wrapped[0].cells.map(c => c.char).join('')).toBe('Hello')
  })

  it('should wrap text exactly at terminal width', () => {
    const cells = createCells('HelloWorld')
    const wrapped = wrapText(cells, 5)

    expect(wrapped.length).toBe(2)
    expect(wrapped[0].cells.map(c => c.char).join('')).toBe('Hello')
    expect(wrapped[1].cells.map(c => c.char).join('')).toBe('World')
    expect(wrapped[0].wrapped).toBe(true)
  })

  it('should wrap long text into multiple lines', () => {
    const cells = createCells('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    const wrapped = wrapText(cells, 10)

    expect(wrapped.length).toBe(3)
    expect(wrapped[0].cells.length).toBe(10)
    expect(wrapped[1].cells.length).toBe(10)
    expect(wrapped[2].cells.length).toBe(6)
  })

  it('should handle newlines', () => {
    const cells = createCells('Line1\nLine2')
    const wrapped = wrapText(cells, 20)

    expect(wrapped.length).toBe(2)
    expect(wrapped[0].cells.map(c => c.char).join('')).toBe('Line1')
    expect(wrapped[1].cells.map(c => c.char).join('')).toBe('Line2')
    expect(wrapped[0].wrapped).toBe(false)
  })

  it('should mark wrapped lines correctly', () => {
    const cells = createCells('ABCDEFGHIJ')
    const wrapped = wrapText(cells, 5)

    expect(wrapped[0].wrapped).toBe(true) // First line wrapped
    expect(wrapped[1].wrapped).toBe(false) // Last line not wrapped
  })

  it('should handle empty input', () => {
    const wrapped = wrapText([], 10)
    expect(wrapped.length).toBe(0)
  })

  it('should handle single character', () => {
    const cells = createCells('A')
    const wrapped = wrapText(cells, 10)

    expect(wrapped.length).toBe(1)
    expect(wrapped[0].cells.length).toBe(1)
  })

  it('should handle width of 1', () => {
    const cells = createCells('ABC')
    const wrapped = wrapText(cells, 1)

    expect(wrapped.length).toBe(3)
    expect(wrapped[0].cells.map(c => c.char).join('')).toBe('A')
    expect(wrapped[1].cells.map(c => c.char).join('')).toBe('B')
    expect(wrapped[2].cells.map(c => c.char).join('')).toBe('C')
  })
})

describe('wrapTextWithWordBreak', () => {
  it('should wrap at word boundaries', () => {
    const cells = createCells('Hello World')
    const wrapped = wrapTextWithWordBreak(cells, 8)

    expect(wrapped.length).toBe(2)
    expect(wrapped[0].cells.map(c => c.char).join('')).toBe('Hello ')
    expect(wrapped[1].cells.map(c => c.char).join('')).toBe('World')
  })

  it('should handle long words that exceed width', () => {
    const cells = createCells('Verylongword')
    const wrapped = wrapTextWithWordBreak(cells, 5)

    // Should hard-wrap the long word
    expect(wrapped.length).toBeGreaterThan(1)
  })

  it('should preserve spaces at line ends', () => {
    const cells = createCells('Word1 Word2 Word3')
    const wrapped = wrapTextWithWordBreak(cells, 7)

    expect(wrapped.length).toBeGreaterThan(1)
  })

  it('should handle multiple spaces', () => {
    const cells = createCells('A  B')
    const wrapped = wrapTextWithWordBreak(cells, 10)

    expect(wrapped.length).toBe(1)
    expect(wrapped[0].cells.map(c => c.char).join('')).toBe('A  B')
  })
})

describe('reflowText', () => {
  it('should reflow text to wider terminal', () => {
    const cells = createCells('HelloWorld')
    const wrapped = wrapText(cells, 5)
    const reflowed = reflowText(wrapped, 20)

    expect(reflowed.length).toBe(1)
    expect(reflowed[0].cells.map(c => c.char).join('')).toBe('HelloWorld')
  })

  it('should reflow text to narrower terminal', () => {
    const cells = createCells('HelloWorld')
    const wrapped = wrapText(cells, 20)
    const reflowed = reflowText(wrapped, 5)

    expect(reflowed.length).toBe(2)
  })

  it('should preserve content across reflow', () => {
    const original = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const cells = createCells(original)
    const wrapped = wrapText(cells, 10)
    const reflowed = reflowText(wrapped, 15)

    const reconstructed = reflowed.map(line =>
      line.cells.map(c => c.char).join('')
    ).join('')

    expect(reconstructed).toBe(original)
  })

  it('should preserve newlines during reflow', () => {
    const cells = createCells('Line1\nLine2')
    const wrapped = wrapText(cells, 10)
    const reflowed = reflowText(wrapped, 20)

    expect(reflowed.length).toBe(2)
  })

  it('should handle reflow to same width', () => {
    const cells = createCells('HelloWorld')
    const wrapped = wrapText(cells, 10)
    const reflowed = reflowText(wrapped, 10)

    expect(reflowed.length).toBe(wrapped.length)
  })
})

describe('Edge cases', () => {
  it('should handle cells with formatting', () => {
    const cells: TerminalCell[] = [
      { char: 'H', fgColor: '#ff0000', bgColor: null, bold: true, italic: false, underline: false, dim: false, inverse: false, hidden: false },
      { char: 'i', fgColor: '#ff0000', bgColor: null, bold: true, italic: false, underline: false, dim: false, inverse: false, hidden: false }
    ]

    const wrapped = wrapText(cells, 1)

    expect(wrapped.length).toBe(2)
    expect(wrapped[0].cells[0].fgColor).toBe('#ff0000')
    expect(wrapped[0].cells[0].bold).toBe(true)
  })

  it('should handle zero width', () => {
    const cells = createCells('Hello')
    const wrapped = wrapText(cells, 0)

    expect(wrapped.length).toBe(0)
  })

  it('should handle negative width', () => {
    const cells = createCells('Hello')
    const wrapped = wrapText(cells, -1)

    expect(wrapped.length).toBe(0)
  })

  it('should handle very long lines', () => {
    const longText = 'A'.repeat(10000)
    const cells = createCells(longText)
    const wrapped = wrapText(cells, 80)

    expect(wrapped.length).toBe(Math.ceil(10000 / 80))
  })

  it('should handle unicode characters', () => {
    const cells = createCells('Hello 😀 World')
    const wrapped = wrapText(cells, 10)

    expect(wrapped.length).toBeGreaterThan(0)
  })
})
