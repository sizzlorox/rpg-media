// Layout Calculator for ASCII Frames
// Feature: 001-custom-terminal-emulator
// User Story 6: ASCII Frame Layout and Centering

import type { FrameLayout, FrameBorderStyle } from '../types/layout'

/**
 * Calculate frame layout dimensions and centering for a given terminal width
 *
 * @param contentWidth Desired width of content area (excluding borders/padding)
 * @param terminalWidth Total available terminal columns
 * @param breakpoint Current responsive breakpoint
 * @param borderStyle Border characters to use
 * @returns FrameLayout with calculated dimensions and positioning
 */
export function calculateFrameLayout(
  contentWidth: number,
  terminalWidth: number,
  breakpoint: 'mobile' | 'tablet' | 'desktop',
  borderStyle: FrameBorderStyle
): FrameLayout {
  // Calculate total width needed: content + 2 borders + 2 padding (1 space on each side)
  const paddingWidth = 2  // 1 space on each side inside border
  const borderWidth = 2   // 1 character border on each side
  let totalWidth = contentWidth + borderWidth + paddingWidth

  // Clamp total width to terminal width
  if (totalWidth > terminalWidth) {
    totalWidth = terminalWidth
    contentWidth = totalWidth - borderWidth - paddingWidth
  }

  // Determine if we should center
  // Desktop: center if frame is significantly narrower than terminal (>10 cols available)
  // Tablet/Mobile: only center if plenty of space (>20% extra width)
  let centered = false
  let leftPadding = 0

  const availableSpace = terminalWidth - totalWidth

  if (breakpoint === 'desktop') {
    centered = availableSpace >= 10
  } else if (breakpoint === 'tablet') {
    centered = availableSpace >= terminalWidth * 0.2
  } else {
    // Mobile: only center if lots of extra space
    centered = availableSpace >= terminalWidth * 0.3
  }

  if (centered) {
    leftPadding = Math.floor(availableSpace / 2)
  }

  return {
    totalWidth,
    contentWidth,
    leftPadding,
    topPadding: 0,  // Vertical centering not implemented yet
    centered,
    borderStyle
  }
}

/**
 * Center text within a frame of given width
 *
 * @param text Text to center
 * @param frameWidth Target width (content area, not including borders)
 * @returns Padded text centered in frame
 */
export function centerTextInFrame(text: string, frameWidth: number): string {
  const textLength = text.length

  // If text is exactly frame width, no padding needed
  if (textLength === frameWidth) {
    return text
  }

  // If text is longer, truncate it
  if (textLength > frameWidth) {
    return text.slice(0, frameWidth)
  }

  // Calculate padding
  const totalPadding = frameWidth - textLength
  const leftPadding = Math.floor(totalPadding / 2)
  const rightPadding = totalPadding - leftPadding

  return ' '.repeat(leftPadding) + text + ' '.repeat(rightPadding)
}

/**
 * Calculate layout for a nested frame (frame within a frame)
 *
 * @param outerContentWidth Width of outer frame's content area
 * @param innerContentWidth Desired width of inner frame's content
 * @param borderStyle Border style for inner frame
 * @returns FrameLayout for the inner frame
 */
export function calculateNestedFrameLayout(
  outerContentWidth: number,
  innerContentWidth: number,
  borderStyle: FrameBorderStyle
): FrameLayout {
  // Inner frame sits inside outer frame's content area
  const paddingWidth = 2
  const borderWidth = 2
  let totalWidth = innerContentWidth + borderWidth + paddingWidth

  // Clamp to outer content width
  if (totalWidth > outerContentWidth) {
    totalWidth = outerContentWidth
    innerContentWidth = totalWidth - borderWidth - paddingWidth
  }

  // Center within outer content area
  const availableSpace = outerContentWidth - totalWidth
  const leftPadding = Math.floor(availableSpace / 2)

  return {
    totalWidth,
    contentWidth: innerContentWidth,
    leftPadding,
    topPadding: 0,
    centered: leftPadding > 0,
    borderStyle
  }
}
