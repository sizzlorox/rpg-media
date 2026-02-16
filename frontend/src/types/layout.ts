// Layout Type Definitions for ASCII Frame Rendering
// Feature: 001-custom-terminal-emulator

/**
 * Defines the characters used for frame borders
 */
export interface FrameBorderStyle {
  topLeft: string             // Corner character (e.g., '╔', '┌', '#')
  topRight: string            // Corner character (e.g., '╗', '┐', '#')
  bottomLeft: string          // Corner character (e.g., '╚', '└', '#')
  bottomRight: string         // Corner character (e.g., '╝', '┘', '#')
  horizontal: string          // Top/bottom edge (e.g., '═', '─', '=')
  vertical: string            // Left/right edge (e.g., '║', '│', '|')
}

/**
 * Represents the calculated dimensions and positioning for an ASCII frame
 */
export interface FrameLayout {
  totalWidth: number          // Total frame width in columns (including borders)
  contentWidth: number        // Inner width for content (totalWidth - 2 for borders)
  leftPadding: number         // Spaces before frame for horizontal centering
  topPadding: number          // Empty lines before frame for vertical spacing
  centered: boolean           // True if frame is centered, false if full-width
  borderStyle: FrameBorderStyle
}

/**
 * Predefined border styles
 */
export const BOX_DRAWING_DOUBLE: FrameBorderStyle = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║'
}

export const BOX_DRAWING_SINGLE: FrameBorderStyle = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│'
}

export const ASCII_BASIC: FrameBorderStyle = {
  topLeft: '+',
  topRight: '+',
  bottomLeft: '+',
  bottomRight: '+',
  horizontal: '-',
  vertical: '|'
}

export const ASCII_HASH: FrameBorderStyle = {
  topLeft: '#',
  topRight: '#',
  bottomLeft: '#',
  bottomRight: '#',
  horizontal: '#',
  vertical: '#'
}
