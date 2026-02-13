// ANSI color code utilities for terminal output

export const ANSI = {
  // Reset
  RESET: '\x1b[0m',

  // Foreground colors
  BLACK: '\x1b[30m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',

  // Bright foreground colors
  BRIGHT_BLACK: '\x1b[90m',
  BRIGHT_RED: '\x1b[91m',
  BRIGHT_GREEN: '\x1b[92m',
  BRIGHT_YELLOW: '\x1b[93m',
  BRIGHT_BLUE: '\x1b[94m',
  BRIGHT_MAGENTA: '\x1b[95m',
  BRIGHT_CYAN: '\x1b[96m',
  BRIGHT_WHITE: '\x1b[97m',

  // Background colors
  BG_BLACK: '\x1b[40m',
  BG_RED: '\x1b[41m',
  BG_GREEN: '\x1b[42m',
  BG_YELLOW: '\x1b[43m',
  BG_BLUE: '\x1b[44m',
  BG_MAGENTA: '\x1b[45m',
  BG_CYAN: '\x1b[46m',
  BG_WHITE: '\x1b[47m',

  // Text styles
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  ITALIC: '\x1b[3m',
  UNDERLINE: '\x1b[4m',
  BLINK: '\x1b[5m',
  REVERSE: '\x1b[7m',
  HIDDEN: '\x1b[8m',
}

// Helper functions
export function colorize(text: string, color: string): string {
  return `${color}${text}${ANSI.RESET}`
}

export function green(text: string): string {
  return colorize(text, ANSI.GREEN)
}

export function red(text: string): string {
  return colorize(text, ANSI.RED)
}

export function yellow(text: string): string {
  return colorize(text, ANSI.YELLOW)
}

export function cyan(text: string): string {
  return colorize(text, ANSI.CYAN)
}

export function magenta(text: string): string {
  return colorize(text, ANSI.MAGENTA)
}

export function bold(text: string): string {
  return `${ANSI.BOLD}${text}${ANSI.RESET}`
}
