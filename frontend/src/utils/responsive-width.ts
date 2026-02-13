/**
 * Responsive width utilities for ASCII art UI elements
 * Provides functions for calculating dynamic widths based on terminal columns
 */

/**
 * Get responsive width for boxes based on terminal columns
 * Returns safe width that fits terminal with margins
 */
export function getResponsiveWidth(terminalCols: number): number {
  // Ensure width fits within terminal with 2-char margin
  return Math.max(40, Math.min(terminalCols - 2, 80))
}

/**
 * Get box width for different breakpoints
 * 40 cols = mobile, 60 cols = tablet, 70+ cols = desktop
 */
export function getResponsiveBoxWidth(terminalCols: number): number {
  if (terminalCols <= 45) return 40  // Mobile
  if (terminalCols <= 65) return 60  // Tablet
  return 70  // Desktop
}

/**
 * Get progress bar width for different breakpoints
 */
export function getResponsiveProgressBarWidth(terminalCols: number): number {
  if (terminalCols <= 45) return 20  // Mobile
  if (terminalCols <= 65) return 30  // Tablet
  return 40  // Desktop
}

/**
 * Center text within a box, accounting for ANSI color codes
 */
export function centerInBox(text: string, boxWidth: number): string {
  // Strip ANSI codes to calculate actual text length
  const plainText = text.replace(/\x1b\[[0-9;]*m/g, '')
  const padding = Math.max(0, Math.floor((boxWidth - plainText.length) / 2))
  const rightPadding = Math.max(0, boxWidth - plainText.length - padding)
  return ' '.repeat(padding) + text + ' '.repeat(rightPadding)
}

/**
 * Center multi-line ASCII art within a box
 */
export function centerMultiLineArt(artLines: string[], boxWidth: number): string[] {
  return artLines.map(line => centerInBox(line, boxWidth - 2)) // -2 for box borders
}
