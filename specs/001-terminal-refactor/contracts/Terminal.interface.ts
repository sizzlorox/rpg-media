/**
 * Terminal Component Interface Contracts
 *
 * Defines the main Terminal component props and core module interfaces.
 * All interfaces use TypeScript strict mode - no `any` types allowed.
 *
 * @module contracts/Terminal.interface
 * @version 1.0.0
 */

/**
 * Props for the main Terminal component
 *
 * @example
 * ```tsx
 * <Terminal
 *   onCommand={(cmd, cols) => handleCommand(cmd, cols)}
 *   initialContent="Welcome to the terminal!\r\n"
 *   skipWelcome={false}
 * />
 * ```
 */
export interface TerminalProps {
  /**
   * Callback fired when user submits a command (presses Enter)
   *
   * @param command - The command string entered by the user
   * @param terminalCols - Current number of columns in terminal (for responsive rendering)
   */
  onCommand?: (command: string, terminalCols: number) => void

  /**
   * Initial content to display in the terminal on mount
   * Use ANSI escape sequences for colors/formatting
   * Use `\r\n` for line breaks (terminal convention)
   *
   * @example "Hello \x1B[1;32mWorld\x1B[0m\r\n"
   */
  initialContent?: string

  /**
   * Skip rendering the welcome message on mount
   * Useful when parent component controls initial content
   *
   * @default false
   */
  skipWelcome?: boolean
}

/**
 * Result object returned by useTerminalCore hook
 * Provides access to terminal instance and core operations
 */
export interface TerminalCoreResult {
  /**
   * Reference to the XTerm instance
   * Null until terminal is initialized
   */
  terminalRef: React.RefObject<import('@xterm/xterm').Terminal | null>

  /**
   * Reference to the FitAddon instance
   * Used for responsive terminal sizing
   */
  fitAddonRef: React.RefObject<import('@xterm/addon-fit').FitAddon | null>

  /**
   * Reference to the DOM container element
   * Terminal renders into this div
   */
  containerRef: React.RefObject<HTMLDivElement>

  /**
   * Recalculate terminal dimensions to fit container
   * Call this on window resize events
   */
  fit: () => void

  /**
   * Write data to terminal output
   * Supports ANSI escape sequences
   *
   * @param data - Content to write (use `\r\n` for line breaks)
   */
  write: (data: string) => void

  /**
   * Focus the terminal input
   * Call this when terminal should receive keyboard input
   */
  focus: () => void
}

/**
 * Options for terminal input handling
 */
export interface InputOptions {
  /**
   * Callback fired when user submits a command
   */
  onCommand?: (command: string, terminalCols: number) => void

  /**
   * Reference to terminal state manager
   * Used for command history and autocomplete
   */
  state: TerminalStateManager

  /**
   * Maximum allowed command length
   * @default 2000
   */
  maxLength?: number
}

/**
 * Result object returned by useTerminalInput hook
 * Provides keyboard input handlers
 */
export interface InputHandlers {
  /**
   * Current command buffer (user's typed input)
   */
  commandBuffer: string

  /**
   * Current cursor position within command buffer
   */
  cursorPosition: number

  /**
   * Whether password masking is active
   */
  isPasswordMasked: boolean

  /**
   * Manually clear the input buffer
   */
  clearInput: () => void

  /**
   * Manually submit the current command
   */
  submitCommand: () => void
}

/**
 * Options for terminal output handling
 */
export interface OutputOptions {
  /**
   * Reference to terminal state manager
   * Used for output buffer management
   */
  state: TerminalStateManager

  /**
   * Maximum output buffer lines
   * @default 10000
   */
  maxBufferLines?: number
}

/**
 * Result object returned by useTerminalOutput hook
 * Provides output rendering functions
 */
export interface OutputHandlers {
  /**
   * Write content to terminal
   * Automatically handles ANSI sanitization
   *
   * @param content - Text to write (supports ANSI escape sequences)
   */
  write: (content: string) => void

  /**
   * Write a single line with automatic line break
   *
   * @param content - Line content
   */
  writeLine: (content: string) => void

  /**
   * Clear the terminal screen
   */
  clear: () => void

  /**
   * Current output buffer size (number of lines)
   */
  bufferSize: number
}

/**
 * State manager returned by useTerminalState hook
 * Provides centralized terminal state and actions
 */
export interface TerminalStateManager {
  /**
   * Current terminal state
   */
  state: TerminalStateData

  /**
   * Dispatch an action to update state
   *
   * @param action - State update action
   */
  dispatch: (action: TerminalAction) => void

  /**
   * Clear command history
   */
  resetHistory: () => void

  /**
   * Add command to history (circular buffer, max 100)
   *
   * @param command - Command to add
   */
  addCommand: (command: string) => void

  /**
   * Navigate command history
   *
   * @param direction - 'up' for older, 'down' for newer
   */
  navigateHistory: (direction: 'up' | 'down') => void
}

/**
 * Terminal state data shape
 * Managed by useReducer in TerminalState module
 */
export interface TerminalStateData {
  /**
   * Command history buffer (max 100 entries, circular)
   */
  commandHistory: string[]

  /**
   * Current position in history navigation
   * -1 = not navigating history (typing new command)
   */
  historyIndex: number

  /**
   * Current command buffer (user's active input)
   */
  currentCommand: string

  /**
   * Cursor position within current command
   */
  cursorPosition: number

  /**
   * Autocomplete suggestion data
   */
  autocomplete: {
    /** Suggested completion text */
    suggestion: string
    /** Whether suggestion is currently visible */
    visible: boolean
  }

  /**
   * Current terminal column count (for responsive rendering)
   */
  terminalCols: number
}

/**
 * Terminal state actions
 * Dispatched to update state via reducer
 */
export type TerminalAction =
  | { type: 'SET_COMMAND'; payload: string }
  | { type: 'SET_CURSOR_POSITION'; payload: number }
  | { type: 'ADD_TO_HISTORY'; payload: string }
  | { type: 'NAVIGATE_HISTORY'; payload: 'up' | 'down' }
  | { type: 'RESET_HISTORY' }
  | { type: 'SET_AUTOCOMPLETE'; payload: { suggestion: string; visible: boolean } }
  | { type: 'CLEAR_AUTOCOMPLETE' }
  | { type: 'SET_TERMINAL_COLS'; payload: number }
  | { type: 'RESET_STATE' }
