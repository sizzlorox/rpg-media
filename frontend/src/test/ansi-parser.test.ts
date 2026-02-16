// Unit tests for ANSIParser
// Feature: 001-custom-terminal-emulator

import { describe, it, expect, beforeEach } from 'vitest'
import { ANSIParser, ANSI_COLORS, BRIGHT_ANSI_COLORS} from '../utils/ansi-parser'

describe('ANSIParser', () => {
  let parser: ANSIParser

  beforeEach(() => {
    parser = new ANSIParser()
  })

  describe('plain text parsing', () => {
    it('parses plain text without ANSI codes', () => {
      const cells = parser.parse('Hello World')

      expect(cells).toHaveLength(11)
      expect(cells[0].char).toBe('H')
      expect(cells[6].char).toBe('W')
      expect(cells[0].fgColor).toBeNull()
      expect(cells[0].bold).toBe(false)
    })

    it('handles newlines', () => {
      const cells = parser.parse('Line1\nLine2')

      expect(cells.some(cell => cell.char === '\n')).toBe(true)
    })

    it('ignores carriage returns', () => {
      const cells = parser.parse('Hello\rWorld')

      const chars = cells.map(c => c.char)
      expect(chars).not.toContain('\r')
    })
  })

  describe('SGR formatting codes', () => {
    it('parses bold text (SGR 1)', () => {
      const cells = parser.parse('\x1B[1mBold\x1B[0m')

      expect(cells[0].char).toBe('B')
      expect(cells[0].bold).toBe(true)
      expect(cells[1].bold).toBe(true)
      expect(cells[2].bold).toBe(true)
      expect(cells[3].bold).toBe(true)
    })

    it('parses italic text (SGR 3)', () => {
      const cells = parser.parse('\x1B[3mItalic\x1B[0m')

      expect(cells[0].italic).toBe(true)
      expect(cells[5].italic).toBe(true)
    })

    it('parses underline text (SGR 4)', () => {
      const cells = parser.parse('\x1B[4mUnderline\x1B[0m')

      expect(cells[0].underline).toBe(true)
    })

    it('parses dim text (SGR 2)', () => {
      const cells = parser.parse('\x1B[2mDim\x1B[0m')

      expect(cells[0].dim).toBe(true)
    })

    it('parses inverse text (SGR 7)', () => {
      const cells = parser.parse('\x1B[7mInverse\x1B[0m')

      expect(cells[0].inverse).toBe(true)
    })

    it('parses hidden text (SGR 8)', () => {
      const cells = parser.parse('\x1B[8mHidden\x1B[0m')

      expect(cells[0].hidden).toBe(true)
    })
  })

  describe('color codes', () => {
    it('parses foreground colors (SGR 30-37)', () => {
      const cells = parser.parse('\x1B[32mGreen\x1B[0m')

      expect(cells[0].char).toBe('G')
      expect(cells[0].fgColor).toBe(ANSI_COLORS[2]) // Green
    })

    it('parses background colors (SGR 40-47)', () => {
      const cells = parser.parse('\x1B[41mRed BG\x1B[0m')

      expect(cells[0].bgColor).toBe(ANSI_COLORS[1]) // Red
    })

    it('parses bright foreground colors (SGR 90-97)', () => {
      const cells = parser.parse('\x1B[92mBright Green\x1B[0m')

      expect(cells[0].fgColor).toBe(BRIGHT_ANSI_COLORS[2]) // Bright Green
    })

    it('parses bright background colors (SGR 100-107)', () => {
      const cells = parser.parse('\x1B[103mBright Yellow BG\x1B[0m')

      expect(cells[0].bgColor).toBe(BRIGHT_ANSI_COLORS[3]) // Bright Yellow
    })

    it('resets foreground color (SGR 39)', () => {
      parser.parse('\x1B[32m') // Set green
      const cells = parser.parse('\x1B[39mDefault')

      expect(cells[0].fgColor).toBeNull()
    })

    it('resets background color (SGR 49)', () => {
      parser.parse('\x1B[41m') // Set red background
      const cells = parser.parse('\x1B[49mDefault')

      expect(cells[0].bgColor).toBeNull()
    })
  })

  describe('combined formatting', () => {
    it('parses combined SGR codes', () => {
      const cells = parser.parse('\x1B[1;32mBold Green\x1B[0m')

      expect(cells[0].bold).toBe(true)
      expect(cells[0].fgColor).toBe(ANSI_COLORS[2])
    })

    it('parses multiple formatting changes', () => {
      const cells = parser.parse('\x1B[1mBold\x1B[22mNormal\x1B[3mItalic')

      expect(cells[0].bold).toBe(true)
      expect(cells[4].bold).toBe(false) // After SGR 22
      expect(cells[10].italic).toBe(true)
    })
  })

  describe('reset codes', () => {
    it('resets all formatting (SGR 0)', () => {
      parser.parse('\x1B[1;3;4;32m') // Bold, italic, underline, green
      const cells = parser.parse('\x1B[0mReset')

      expect(cells[0].bold).toBe(false)
      expect(cells[0].italic).toBe(false)
      expect(cells[0].underline).toBe(false)
      expect(cells[0].fgColor).toBeNull()
    })

    it('resets bold and dim (SGR 22)', () => {
      parser.parse('\x1B[1m') // Bold
      const cells = parser.parse('\x1B[22mNormal')

      expect(cells[0].bold).toBe(false)
    })

    it('resets italic (SGR 23)', () => {
      parser.parse('\x1B[3m') // Italic
      const cells = parser.parse('\x1B[23mNormal')

      expect(cells[0].italic).toBe(false)
    })

    it('resets underline (SGR 24)', () => {
      parser.parse('\x1B[4m') // Underline
      const cells = parser.parse('\x1B[24mNormal')

      expect(cells[0].underline).toBe(false)
    })
  })

  describe('state persistence', () => {
    it('maintains formatting state across multiple parse calls', () => {
      const cells1 = parser.parse('\x1B[1mBold ')
      const cells2 = parser.parse('continues')

      expect(cells1[0].bold).toBe(true)
      expect(cells2[0].bold).toBe(true) // State persists
    })

    it('maintains color state across calls', () => {
      parser.parse('\x1B[32m') // Set green
      const cells = parser.parse('Green text')

      expect(cells[0].fgColor).toBe(ANSI_COLORS[2])
    })
  })

  describe('partial sequences', () => {
    it('handles split escape sequences', () => {
      const cells1 = parser.parse('\x1B[3') // Partial sequence
      expect(cells1).toHaveLength(0) // No output yet

      const cells2 = parser.parse('2mGreen') // Complete sequence
      expect(cells2[0].fgColor).toBe(ANSI_COLORS[2])
    })
  })

  describe('reset method', () => {
    it('resets parser state', () => {
      parser.parse('\x1B[1;32m') // Bold green
      parser.reset()

      const cells = parser.parse('Normal')
      expect(cells[0].bold).toBe(false)
      expect(cells[0].fgColor).toBeNull()
    })
  })

  describe('getState method', () => {
    it('returns current formatting state', () => {
      parser.parse('\x1B[1;4;32m') // Bold, underline, green

      const state = parser.getState()
      expect(state.bold).toBe(true)
      expect(state.underline).toBe(true)
      expect(state.fgColor).toBe(ANSI_COLORS[2])
    })
  })

  describe('security - whitelist validation', () => {
    it('ignores unknown SGR codes', () => {
      // Try to use an unsupported code
      const cells = parser.parse('\x1B[99mText')

      // Should not crash, just ignore the unknown code
      expect(cells[0].char).toBe('T')
    })

    it('handles cursor movement codes without applying them', () => {
      // Cursor codes should be acknowledged but not affect cells
      const cells = parser.parse('A\x1B[5CB') // Move cursor right 5

      expect(cells.map(c => c.char).join('')).toBe('AB')
    })
  })
})
