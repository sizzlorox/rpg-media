// Integration Test: ANSI Rendering
// Feature: 001-custom-terminal-emulator
// User Story 4: ANSI Color and Formatting Support

import { describe, it, expect } from 'vitest'
import { ANSIParser, ANSI_COLORS, BRIGHT_ANSI_COLORS } from '../../utils/ansi-parser'

describe('Terminal ANSI Rendering Integration', () => {
  let parser: ANSIParser

  beforeEach(() => {
    parser = new ANSIParser()
  })

  it('should render text with foreground colors', () => {
    const input = '\x1B[31mRed text\x1B[0m'
    const cells = parser.parse(input)

    const redCells = cells.filter(c => c.char !== '\n')
    expect(redCells.every(c => c.fgColor === ANSI_COLORS[1])).toBe(true)
  })

  it('should render text with background colors', () => {
    const input = '\x1B[42mGreen background\x1B[0m'
    const cells = parser.parse(input)

    const greenBgCells = cells.filter(c => c.char !== '\n')
    expect(greenBgCells.every(c => c.bgColor === ANSI_COLORS[2])).toBe(true)
  })

  it('should render bold text', () => {
    const input = '\x1B[1mBold text\x1B[0m'
    const cells = parser.parse(input)

    const boldCells = cells.filter(c => c.char !== '\n')
    expect(boldCells.every(c => c.bold)).toBe(true)
  })

  it('should render italic text', () => {
    const input = '\x1B[3mItalic text\x1B[0m'
    const cells = parser.parse(input)

    const italicCells = cells.filter(c => c.char !== '\n')
    expect(italicCells.every(c => c.italic)).toBe(true)
  })

  it('should render underlined text', () => {
    const input = '\x1B[4mUnderlined text\x1B[0m'
    const cells = parser.parse(input)

    const underlinedCells = cells.filter(c => c.char !== '\n')
    expect(underlinedCells.every(c => c.underline)).toBe(true)
  })

  it('should handle multiple formatting codes', () => {
    const input = '\x1B[1;31;4mBold red underlined\x1B[0m'
    const cells = parser.parse(input)

    const formatted = cells.filter(c => c.char !== '\n')
    expect(formatted.every(c => c.bold && c.underline && c.fgColor === ANSI_COLORS[1])).toBe(true)
  })

  it('should handle bright colors', () => {
    const input = '\x1B[91mBright red\x1B[0m'
    const cells = parser.parse(input)

    const brightRed = cells.filter(c => c.char !== '\n')
    expect(brightRed.every(c => c.fgColor === BRIGHT_ANSI_COLORS[1])).toBe(true)
  })

  it('should reset formatting correctly', () => {
    const input = '\x1B[1;31mRed bold\x1B[0mNormal'
    const cells = parser.parse(input)

    const normalCells = cells.filter(c => c.char === 'N' || c.char === 'o' || c.char === 'r')
    expect(normalCells.every(c => !c.bold && !c.fgColor)).toBe(true)
  })

  it('should maintain state across multiple parse calls', () => {
    parser.parse('\x1B[31m')
    const cells = parser.parse('Red text')

    expect(cells.every(c => c.fgColor === ANSI_COLORS[1])).toBe(true)
  })

  it('should handle inverse colors', () => {
    const input = '\x1B[7mInverse\x1B[0m'
    const cells = parser.parse(input)

    const inverseCells = cells.filter(c => c.char !== '\n')
    expect(inverseCells.every(c => c.inverse)).toBe(true)
  })

  it('should handle dim text', () => {
    const input = '\x1B[2mDim text\x1B[0m'
    const cells = parser.parse(input)

    const dimCells = cells.filter(c => c.char !== '\n')
    expect(dimCells.every(c => c.dim)).toBe(true)
  })

  it('should handle hidden text', () => {
    const input = '\x1B[8mHidden\x1B[0m'
    const cells = parser.parse(input)

    const hiddenCells = cells.filter(c => c.char !== '\n')
    expect(hiddenCells.every(c => c.hidden)).toBe(true)
  })

  it('should handle all standard colors (0-7)', () => {
    for (let i = 0; i < 8; i++) {
      const input = `\x1B[3${i}mColor ${i}\x1B[0m`
      const cells = parser.parse(input)
      const coloredCells = cells.filter(c => c.char !== '\n')

      expect(coloredCells.some(c => c.fgColor === ANSI_COLORS[i])).toBe(true)
    }
  })

  it('should handle complex formatted output', () => {
    const input = [
      '\x1B[1;32m[SUCCESS]\x1B[0m ',
      '\x1B[37mOperation completed\x1B[0m ',
      '\x1B[2;33m(took 1.23s)\x1B[0m'
    ].join('')

    const cells = parser.parse(input)

    expect(cells.length).toBeGreaterThan(0)
    expect(cells.some(c => c.bold)).toBe(true)
    expect(cells.some(c => c.dim)).toBe(true)
  })

  it('should ignore non-whitelisted escape sequences', () => {
    const input = '\x1B[999mInvalid\x1B[0m'
    const cells = parser.parse(input)

    // Should parse text but ignore invalid code
    const textCells = cells.filter(c => c.char !== '\n')
    expect(textCells.length).toBeGreaterThan(0)
  })

  it('should handle cursor positioning codes (ignored for rendering)', () => {
    const input = '\x1B[2JClear\x1B[H'
    const cells = parser.parse(input)

    // Should parse text, codes are acknowledged but not applied
    const textCells = cells.filter(c => c.char !== '\n')
    expect(textCells.map(c => c.char).join('')).toBe('Clear')
  })

  it('should handle rainbow text', () => {
    const colors = [31, 33, 32, 36, 34, 35]
    const input = colors.map((c, i) => `\x1B[${c}m${i}`).join('') + '\x1B[0m'

    const cells = parser.parse(input)

    // Should have cells with different colors
    const uniqueColors = new Set(cells.map(c => c.fgColor))
    expect(uniqueColors.size).toBeGreaterThan(1)
  })
})
