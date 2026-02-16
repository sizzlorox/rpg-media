// Frame Builder for ASCII Frames
// Feature: 001-custom-terminal-emulator
// User Story 6: ASCII Frame Layout and Centering

import type { FrameLayout, FrameContent } from '../types/layout'
import type { TerminalLine, TerminalCell } from '../types/terminal'

// Re-export border styles for convenience
export { BOX_DRAWING_DOUBLE, BOX_DRAWING_SINGLE, ASCII_BASIC, ASCII_HASH } from '../types/layout'

/**
 * Render an ASCII frame with the given layout and content
 *
 * @param layout Frame layout with dimensions and border style
 * @param content Content lines to render inside the frame
 * @returns Array of TerminalLine objects representing the rendered frame
 */
export function renderFrame(layout: FrameLayout, content: FrameContent): TerminalLine[] {
  const lines: TerminalLine[] = []
  const { borderStyle, contentWidth, leftPadding } = layout

  // Generate top border
  lines.push(createBorderLine(
    leftPadding,
    borderStyle.topLeft,
    borderStyle.horizontal,
    borderStyle.topRight,
    contentWidth + 2, // +2 for inner padding
    lines.length
  ))

  // Generate content lines
  content.lines.forEach(textLine => {
    lines.push(createContentLine(
      leftPadding,
      borderStyle.vertical,
      textLine,
      contentWidth,
      lines.length
    ))
  })

  // Generate bottom border
  lines.push(createBorderLine(
    leftPadding,
    borderStyle.bottomLeft,
    borderStyle.horizontal,
    borderStyle.bottomRight,
    contentWidth + 2, // +2 for inner padding
    lines.length
  ))

  return lines
}

/**
 * Create a border line (top or bottom)
 */
function createBorderLine(
  leftPadding: number,
  leftCorner: string,
  horizontal: string,
  rightCorner: string,
  width: number,
  lineNumber: number
): TerminalLine {
  const cells: TerminalCell[] = []

  // Add left padding
  for (let i = 0; i < leftPadding; i++) {
    cells.push(createCell(' '))
  }

  // Add left corner
  cells.push(createCell(leftCorner))

  // Add horizontal line
  for (let i = 0; i < width; i++) {
    cells.push(createCell(horizontal))
  }

  // Add right corner
  cells.push(createCell(rightCorner))

  return {
    cells,
    image: null,
    metadata: {
      lineNumber,
      timestamp: Date.now(),
      wrapped: false
    }
  }
}

/**
 * Create a content line with side borders
 */
function createContentLine(
  leftPadding: number,
  vertical: string,
  text: string,
  contentWidth: number,
  lineNumber: number
): TerminalLine {
  const cells: TerminalCell[] = []

  // Add left padding
  for (let i = 0; i < leftPadding; i++) {
    cells.push(createCell(' '))
  }

  // Add left border
  cells.push(createCell(vertical))

  // Add inner left padding
  cells.push(createCell(' '))

  // Add content (padded or truncated to content width)
  const paddedText = text.padEnd(contentWidth, ' ').slice(0, contentWidth)
  for (const char of paddedText) {
    cells.push(createCell(char))
  }

  // Add inner right padding
  cells.push(createCell(' '))

  // Add right border
  cells.push(createCell(vertical))

  return {
    cells,
    image: null,
    metadata: {
      lineNumber,
      timestamp: Date.now(),
      wrapped: false
    }
  }
}

/**
 * Create a terminal cell with default formatting
 */
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
