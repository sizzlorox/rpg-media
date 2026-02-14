/**
 * Terminal Configuration Interface
 *
 * Defines terminal theme, dimensions, and responsive configuration.
 * Used by TerminalCore for initialization and TerminalStyling for responsive updates.
 *
 * @module contracts/TerminalConfig.interface
 * @version 1.0.0
 */

/**
 * Complete terminal configuration object
 * Includes theme, dimensions, and feature flags
 *
 * @example
 * ```ts
 * const config: TerminalConfig = {
 *   theme: MUD_THEME,
 *   fontSize: 14,
 *   fontFamily: 'IBM Plex Mono, monospace',
 *   rows: 30,
 *   cols: 80,
 *   cursorBlink: true,
 *   cursorStyle: 'block',
 *   scrollback: 1000
 * }
 * ```
 */
export interface TerminalConfig {
  /**
   * Terminal color theme
   */
  theme: TerminalTheme

  /**
   * Font size in pixels
   * Responsive: 10px (mobile), 12px (tablet), 14px (desktop)
   */
  fontSize: number

  /**
   * Font family stack
   * @default 'IBM Plex Mono, Courier New, monospace'
   */
  fontFamily: string

  /**
   * Number of terminal rows (height)
   * Responsive: 24 (mobile), 28 (tablet), 30 (desktop)
   */
  rows: number

  /**
   * Number of terminal columns (width)
   * Responsive: 40 (mobile), 60 (tablet), 80 (desktop)
   */
  cols: number

  /**
   * Enable cursor blinking animation
   * @default true
   */
  cursorBlink: boolean

  /**
   * Cursor visual style
   * @default 'block'
   */
  cursorStyle: 'block' | 'underline' | 'bar'

  /**
   * Number of lines to keep in scrollback buffer
   * @default 1000
   */
  scrollback: number
}

/**
 * Terminal color theme definition
 * Defines all terminal colors for ANSI escape sequences
 */
export interface TerminalTheme {
  /** Background color (default: #000000 - black) */
  background: string

  /** Foreground/text color (default: #00ff00 - green) */
  foreground: string

  /** Cursor color (default: #00ff00 - green) */
  cursor: string

  /** Cursor accent color (when cursor is over text) */
  cursorAccent: string

  /** Selection highlight color */
  selectionBackground: string

  /** ANSI color: Black (0) */
  black: string

  /** ANSI color: Red (1) */
  red: string

  /** ANSI color: Green (2) */
  green: string

  /** ANSI color: Yellow (3) */
  yellow: string

  /** ANSI color: Blue (4) */
  blue: string

  /** ANSI color: Magenta (5) */
  magenta: string

  /** ANSI color: Cyan (6) */
  cyan: string

  /** ANSI color: White (7) */
  white: string

  /** ANSI color: Bright Black (8) */
  brightBlack: string

  /** ANSI color: Bright Red (9) */
  brightRed: string

  /** ANSI color: Bright Green (10) */
  brightGreen: string

  /** ANSI color: Bright Yellow (11) */
  brightYellow: string

  /** ANSI color: Bright Blue (12) */
  brightBlue: string

  /** ANSI color: Bright Magenta (13) */
  brightMagenta: string

  /** ANSI color: Bright Cyan (14) */
  brightCyan: string

  /** ANSI color: Bright White (15) */
  brightWhite: string
}

/**
 * Viewport size categories for responsive configuration
 */
export type ViewportSize = 'mobile' | 'tablet' | 'desktop'

/**
 * Responsive configuration breakpoints
 */
export interface ResponsiveBreakpoints {
  /** Maximum width for mobile viewport (px) */
  mobileMax: number

  /** Maximum width for tablet viewport (px) */
  tabletMax: number

  /** Minimum width for desktop viewport (px) */
  desktopMin: number
}

/**
 * Responsive terminal configuration
 * Returned by TerminalStyling based on current viewport
 */
export interface ResponsiveConfig {
  /**
   * Current viewport size category
   */
  viewportSize: ViewportSize

  /**
   * Full terminal configuration for this viewport
   */
  config: TerminalConfig

  /**
   * Logo type to display (based on viewport width)
   * '3d' for wide screens, 'simple' for narrow
   */
  logoType: '3d' | 'simple'
}

/**
 * MUD (Multi-User Dungeon) theme preset
 * Classic green-on-black terminal aesthetic
 */
export const MUD_THEME: TerminalTheme = {
  background: '#000000',
  foreground: '#00ff00',
  cursor: '#00ff00',
  cursorAccent: '#000000',
  selectionBackground: '#00aa00',
  black: '#000000',
  red: '#ff0000',
  green: '#00ff00',
  yellow: '#ffff00',
  blue: '#0000ff',
  magenta: '#ff00ff',
  cyan: '#00ffff',
  white: '#ffffff',
  brightBlack: '#555555',
  brightRed: '#ff5555',
  brightGreen: '#55ff55',
  brightYellow: '#ffff55',
  brightBlue: '#5555ff',
  brightMagenta: '#ff55ff',
  brightCyan: '#55ffff',
  brightWhite: '#ffffff',
}

/**
 * Default responsive breakpoints
 * Mobile: 0-640px, Tablet: 641-1024px, Desktop: 1025px+
 */
export const DEFAULT_BREAKPOINTS: ResponsiveBreakpoints = {
  mobileMax: 640,
  tabletMax: 1024,
  desktopMin: 1025,
}
