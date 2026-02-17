// Man page formatting utilities for Unix manual page aesthetic

import { bold, green } from './ansi-colors'

/**
 * Creates man page header in standard format
 * @param title - Page title (e.g., "SOCIALFORGE")
 * @param section - Man page section number (default 1 for general commands)
 * @param width - Width of the header (default 80)
 * @returns Formatted header like "SOCIALFORGE(1)    General Commands Manual    SOCIALFORGE(1)"
 */
export function createManPageHeader(title: string, section: number = 1, width: number = 80): string {
  const titleSection = `${title.toUpperCase()}(${section})`
  const sectionName = getSectionName(section)
  const padding = Math.max(0, width - titleSection.length * 2 - sectionName.length)
  const leftPad = Math.floor(padding / 2)
  const rightPad = padding - leftPad

  return bold(`${titleSection}${' '.repeat(leftPad)}${sectionName}${' '.repeat(rightPad)}${titleSection}`)
}

/**
 * Gets the section name for a given section number
 */
function getSectionName(section: number): string {
  const sections: Record<number, string> = {
    1: 'General Commands Manual',
    2: 'System Calls Manual',
    3: 'Library Functions Manual',
    4: 'Kernel Interfaces Manual',
    5: 'File Formats Manual',
    6: 'Games Manual',
    7: 'Miscellaneous Information Manual',
    8: 'System Manager\'s Manual',
  }
  return sections[section] || 'Manual'
}

/**
 * Creates a section header in uppercase
 * @param name - Section name (e.g., "NAME", "SYNOPSIS")
 * @returns Uppercase section header
 */
export function createSectionHeader(name: string): string {
  return bold(name.toUpperCase())
}

/**
 * Creates man page footer with date
 * @param title - Page title
 * @param date - Date string (e.g., "February 2026")
 * @param width - Width of the footer (default 80)
 * @returns Formatted footer
 */
export function createManPageFooter(title: string, date: string, width: number = 80): string {
  const titleUpper = title.toUpperCase()
  const padding = Math.max(0, width - titleUpper.length * 2 - date.length - `(1)`.length)
  const leftPad = Math.floor(padding / 2)
  const rightPad = padding - leftPad

  return bold(`${titleUpper}${' '.repeat(leftPad)}${date}${' '.repeat(rightPad)}${titleUpper}(1)`)
}

/**
 * Indents text by specified number of spaces (man page convention is 5)
 * @param text - Text to indent
 * @param spaces - Number of spaces to indent (default 5)
 * @returns Indented text
 */
export function indentText(text: string, spaces: number = 5): string {
  const indent = ' '.repeat(spaces)
  return text.split('\n').map(line => indent + line).join('\n')
}

/**
 * Formats a command synopsis with bold command name
 * @param command - Command name
 * @param args - Command arguments
 * @returns Formatted command line
 */
export function formatCommandSynopsis(command: string, args: string): string {
  return `${bold(command)} ${args}`
}

/**
 * Creates a trending badge with rank number
 * @param rank - Trending rank (1-10)
 * @returns Formatted badge like "[TRENDING #1]"
 */
export function createTrendingBadge(rank: number): string {
  return green(`[TRENDING #${rank}]`)
}

/**
 * Wraps text to fit within a specified width
 * @param text - Text to wrap
 * @param width - Maximum width (default 75 for man page body)
 * @param indent - Number of spaces to indent wrapped lines (default 5)
 * @returns Wrapped and indented text
 */
export function wrapText(text: string, width: number = 75, indent: number = 5): string {
  const words = text.split(' ')
  const lines: string[] = []
  let currentLine = ''
  const indentStr = ' '.repeat(indent)

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word

    if (testLine.length <= width) {
      currentLine = testLine
    } else {
      if (currentLine) {
        lines.push(indentStr + currentLine)
      }
      currentLine = word
    }
  }

  if (currentLine) {
    lines.push(indentStr + currentLine)
  }

  return lines.join('\n')
}

/**
 * Gets current date in man page format (e.g., "February 2026")
 */
export function getManPageDate(): string {
  const now = new Date()
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return `${months[now.getMonth()]} ${now.getFullYear()}`
}
