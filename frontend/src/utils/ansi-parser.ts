// ANSI Escape Sequence Parser
// Feature: 001-custom-terminal-emulator

import type { TerminalCell, ANSIState } from '../types/terminal'
import { DEFAULT_ANSI_STATE } from '../types/terminal'

/**
 * ANSI color palette (codes 30-37, 40-47)
 */
export const ANSI_COLORS = [
  '#000000', // 0: Black
  '#AA0000', // 1: Red
  '#00AA00', // 2: Green
  '#AA5500', // 3: Yellow
  '#0000AA', // 4: Blue
  '#AA00AA', // 5: Magenta
  '#00AAAA', // 6: Cyan
  '#AAAAAA'  // 7: White
]

/**
 * Bright ANSI color palette (codes 90-97, 100-107)
 */
export const BRIGHT_ANSI_COLORS = [
  '#555555', // 0: Bright Black (Gray)
  '#FF5555', // 1: Bright Red
  '#55FF55', // 2: Bright Green
  '#FFFF55', // 3: Bright Yellow
  '#5555FF', // 4: Bright Blue
  '#FF55FF', // 5: Bright Magenta
  '#55FFFF', // 6: Bright Cyan
  '#FFFFFF'  // 7: Bright White
]

/**
 * Parser state machine states
 */
type ParserState = 'TEXT' | 'ESCAPE' | 'CSI'

/**
 * Stateful ANSI escape sequence parser with incremental processing.
 *
 * Supports:
 * - SGR codes (colors, bold, italic, underline, etc.)
 * - Cursor positioning codes (CUP, CUU, CUD, CUF, CUB)
 * - Erase codes (ED, EL)
 * - Scroll codes (SU, SD)
 *
 * Security: Whitelist-based validation (rejects non-whitelisted codes)
 */
export class ANSIParser {
  private state: ParserState = 'TEXT'
  private params: number[] = []
  private currentParam: string = ''
  private formatState: ANSIState = { ...DEFAULT_ANSI_STATE }

  /**
   * Parse a string containing ANSI escape codes and return formatted cells.
   * State is maintained across multiple calls for handling partial sequences.
   */
  parse(input: string): TerminalCell[] {
    const cells: TerminalCell[] = []

    for (const char of input) {
      switch (this.state) {
        case 'TEXT':
          if (char === '\x1B') {
            // Start of escape sequence
            this.state = 'ESCAPE'
          } else if (char === '\r') {
            // Carriage return - ignore (handled by line breaks)
          } else if (char === '\n') {
            // Newline - emit as cell
            cells.push(this.createCell('\n'))
          } else {
            // Regular character
            cells.push(this.createCell(char))
          }
          break

        case 'ESCAPE':
          if (char === '[') {
            // CSI (Control Sequence Introducer) - most common
            this.state = 'CSI'
            this.params = []
            this.currentParam = ''
          } else {
            // Unknown escape sequence - return to TEXT
            this.state = 'TEXT'
          }
          break

        case 'CSI':
          if (char >= '0' && char <= '9') {
            // Parameter digit
            this.currentParam += char
          } else if (char === ';') {
            // Parameter separator
            this.params.push(parseInt(this.currentParam) || 0)
            this.currentParam = ''
          } else if (char === 'm') {
            // SGR (Select Graphic Rendition) - formatting codes
            this.params.push(parseInt(this.currentParam) || 0)
            this.applyFormat(this.params)
            this.state = 'TEXT'
          } else if (char >= 'A' && char <= 'H') {
            // Cursor movement codes - parse but don't apply (cursor handled separately)
            this.params.push(parseInt(this.currentParam) || 0)
            // We acknowledge these codes but don't process them in cell output
            this.state = 'TEXT'
          } else if (char === 'J' || char === 'K') {
            // Erase codes (ED, EL) - parse but don't apply in cell stream
            this.params.push(parseInt(this.currentParam) || 0)
            this.state = 'TEXT'
          } else if (char === 'S' || char === 'T') {
            // Scroll codes (SU, SD) - parse but don't apply in cell stream
            this.params.push(parseInt(this.currentParam) || 0)
            this.state = 'TEXT'
          } else {
            // Invalid sequence - return to TEXT
            this.state = 'TEXT'
          }
          break
      }
    }

    return cells
  }

  /**
   * Apply SGR (Select Graphic Rendition) formatting codes.
   * Whitelisted codes only - rejects unknown codes for security.
   */
  private applyFormat(params: number[]): void {
    for (const param of params) {
      if (param === 0) {
        // Reset all formatting
        this.formatState = { ...DEFAULT_ANSI_STATE }
      } else if (param === 1) {
        // Bold
        this.formatState.bold = true
      } else if (param === 2) {
        // Dim
        this.formatState.dim = true
      } else if (param === 3) {
        // Italic
        this.formatState.italic = true
      } else if (param === 4) {
        // Underline
        this.formatState.underline = true
      } else if (param === 7) {
        // Inverse
        this.formatState.inverse = true
      } else if (param === 8) {
        // Hidden
        this.formatState.hidden = true
      } else if (param === 22) {
        // Normal intensity (reset bold and dim)
        this.formatState.bold = false
        this.formatState.dim = false
      } else if (param === 23) {
        // Not italic
        this.formatState.italic = false
      } else if (param === 24) {
        // Not underlined
        this.formatState.underline = false
      } else if (param === 27) {
        // Not inverse
        this.formatState.inverse = false
      } else if (param === 28) {
        // Not hidden
        this.formatState.hidden = false
      } else if (param >= 30 && param <= 37) {
        // Foreground colors (normal)
        this.formatState.fgColor = ANSI_COLORS[param - 30]
      } else if (param === 39) {
        // Default foreground color
        this.formatState.fgColor = null
      } else if (param >= 40 && param <= 47) {
        // Background colors (normal)
        this.formatState.bgColor = ANSI_COLORS[param - 40]
      } else if (param === 49) {
        // Default background color
        this.formatState.bgColor = null
      } else if (param >= 90 && param <= 97) {
        // Foreground colors (bright)
        this.formatState.fgColor = BRIGHT_ANSI_COLORS[param - 90]
      } else if (param >= 100 && param <= 107) {
        // Background colors (bright)
        this.formatState.bgColor = BRIGHT_ANSI_COLORS[param - 100]
      }
      // All other codes are ignored (whitelist approach for security)
    }
  }

  /**
   * Create a TerminalCell with current formatting state.
   */
  private createCell(char: string): TerminalCell {
    return {
      char,
      fgColor: this.formatState.fgColor,
      bgColor: this.formatState.bgColor,
      bold: this.formatState.bold,
      italic: this.formatState.italic,
      underline: this.formatState.underline,
      dim: this.formatState.dim,
      inverse: this.formatState.inverse,
      hidden: this.formatState.hidden
    }
  }

  /**
   * Reset the parser to initial state.
   */
  reset(): void {
    this.state = 'TEXT'
    this.params = []
    this.currentParam = ''
    this.formatState = { ...DEFAULT_ANSI_STATE }
  }

  /**
   * Get the current formatting state.
   */
  getState(): ANSIState {
    return { ...this.formatState }
  }
}
