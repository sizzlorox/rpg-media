// Terminal Type Definitions
// Feature: 001-custom-terminal-emulator

/**
 * Represents a single character cell in the terminal grid with formatting attributes
 */
export interface TerminalCell {
  char: string                    // Single character (1 Unicode grapheme)
  fgColor: string | null          // Foreground color (hex or ANSI name)
  bgColor: string | null          // Background color (hex or ANSI name)
  bold: boolean                   // Bold formatting
  italic: boolean                 // Italic formatting
  underline: boolean              // Underline formatting
  dim: boolean                    // Dim/faint text
  inverse: boolean                // Reverse video (swap fg/bg)
  hidden: boolean                 // Hidden text
}

/**
 * Metadata attached to each terminal line
 */
export interface TerminalLineMetadata {
  lineNumber: number              // Absolute line number in buffer
  timestamp: number               // Unix timestamp (ms) when line created
  wrapped: boolean                // True if line is continuation of previous
}

/**
 * Represents an inline image reference attached to a terminal line
 */
export interface ImageSlot {
  url: string                     // Image URL (data URI or HTTP/HTTPS)
  alt: string                     // Alt text for accessibility
  id: string                      // Unique identifier (for React keys)
  maxWidth: number                // Max width in pixels (responsive)
  maxHeight: number               // Max height in pixels (responsive)
}

/**
 * Represents a single line in the terminal buffer
 */
export interface TerminalLine {
  cells: TerminalCell[]           // Array of character cells
  image: ImageSlot | null         // Optional inline image
  metadata: TerminalLineMetadata  // Line metadata
}

/**
 * Tracks the current text formatting state during ANSI sequence parsing
 */
export interface ANSIState {
  fgColor: string | null          // Current foreground color
  bgColor: string | null          // Current background color
  bold: boolean                   // Bold enabled
  italic: boolean                 // Italic enabled
  underline: boolean              // Underline enabled
  dim: boolean                    // Dim/faint enabled
  inverse: boolean                // Reverse video enabled
  hidden: boolean                 // Hidden text enabled
}

/**
 * Tracks the terminal cursor position and visibility for input operations
 */
export interface CursorState {
  row: number                     // Current row (0-indexed from viewport top)
  col: number                     // Current column (0-indexed from line start)
  visible: boolean                // True if cursor should be rendered
  blinking: boolean               // True if cursor should blink
  style: 'block' | 'underline' | 'bar'  // Cursor visual style
}

/**
 * Manages the current command being typed
 */
export interface InputBuffer {
  text: string                    // Current input text
  cursorPosition: number          // Cursor index in text (0 to text.length)
  maxLength: number               // Maximum input length (2000 chars)
}

/**
 * Safe area insets for notched devices
 */
export interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Tracks the visible portion of the terminal buffer and scroll position
 */
export interface ViewportState {
  scrollY: number                 // Current scroll offset in pixels
  viewportHeight: number          // Viewport height in pixels
  viewportWidth: number           // Viewport width in pixels
  rows: number                    // Visible rows (calculated from height)
  cols: number                    // Visible columns (calculated from width)
  lineHeight: number              // Height of one line in pixels
  charWidth: number               // Width of one character in pixels
  breakpoint: 'mobile' | 'tablet' | 'desktop'  // Current responsive breakpoint
  isTouchDevice: boolean          // True if touch input is primary
  safeAreaInsets: SafeAreaInsets  // Safe area for notched devices
}

/**
 * Default ANSI state (no formatting)
 */
export const DEFAULT_ANSI_STATE: ANSIState = {
  fgColor: null,
  bgColor: null,
  bold: false,
  italic: false,
  underline: false,
  dim: false,
  inverse: false,
  hidden: false
}

/**
 * Default cursor state
 */
export const DEFAULT_CURSOR_STATE: CursorState = {
  row: 0,
  col: 0,
  visible: true,
  blinking: true,
  style: 'block'
}

/**
 * Create a default terminal cell
 */
export function createDefaultCell(char: string = ' '): TerminalCell {
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

/**
 * Create a default terminal line
 */
export function createDefaultLine(lineNumber: number, cols: number = 80): TerminalLine {
  return {
    cells: Array(cols).fill(null).map(() => createDefaultCell()),
    image: null,
    metadata: {
      lineNumber,
      timestamp: Date.now(),
      wrapped: false
    }
  }
}
