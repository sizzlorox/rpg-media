/**
 * State Manager Interface
 *
 * Defines the terminal state management contract using useReducer pattern.
 * Centralizes all terminal state and provides type-safe actions.
 *
 * @module contracts/StateManager.interface
 * @version 1.0.0
 */

/**
 * Complete terminal state shape
 * Managed by useReducer in TerminalState module
 */
export interface TerminalState {
  /**
   * Command history circular buffer
   * Maximum 100 entries - oldest removed when limit exceeded
   */
  commandHistory: string[]

  /**
   * Current position in history navigation
   * -1 = not navigating (typing new command)
   * 0 = oldest command
   * length-1 = newest command
   */
  historyIndex: number

  /**
   * User's current input buffer (command being typed)
   */
  currentCommand: string

  /**
   * Cursor position within current command
   * 0 = start, length = end
   */
  cursorPosition: number

  /**
   * Autocomplete suggestion state
   */
  autocomplete: AutocompleteState

  /**
   * Terminal dimensions (for responsive rendering)
   */
  dimensions: TerminalDimensions

  /**
   * Output buffer (sliding window, max 10000 lines)
   */
  outputBuffer: string[]
}

/**
 * Autocomplete state
 */
export interface AutocompleteState {
  /**
   * Current suggestion text
   * Empty string = no suggestion
   */
  suggestion: string

  /**
   * Whether suggestion is visible in terminal
   */
  visible: boolean

  /**
   * Partial command that triggered the suggestion
   */
  partial: string
}

/**
 * Terminal dimensions state
 */
export interface TerminalDimensions {
  /**
   * Number of columns (width)
   * Updated on window resize
   */
  cols: number

  /**
   * Number of rows (height)
   * Updated on window resize
   */
  rows: number

  /**
   * Viewport size category
   */
  viewport: 'mobile' | 'tablet' | 'desktop'
}

/**
 * Terminal state actions
 * All possible state mutations
 */
export type TerminalStateAction =
  // Command buffer actions
  | { type: 'SET_COMMAND'; payload: string }
  | { type: 'APPEND_TO_COMMAND'; payload: string }
  | { type: 'DELETE_FROM_COMMAND'; payload: { count: number } }
  | { type: 'CLEAR_COMMAND' }

  // Cursor actions
  | { type: 'SET_CURSOR_POSITION'; payload: number }
  | { type: 'MOVE_CURSOR'; payload: 'left' | 'right' | 'start' | 'end' }

  // History actions
  | { type: 'ADD_TO_HISTORY'; payload: string }
  | { type: 'NAVIGATE_HISTORY'; payload: 'up' | 'down' }
  | { type: 'RESET_HISTORY_NAVIGATION' }
  | { type: 'CLEAR_HISTORY' }

  // Autocomplete actions
  | { type: 'SET_AUTOCOMPLETE'; payload: { suggestion: string; partial: string } }
  | { type: 'SHOW_AUTOCOMPLETE' }
  | { type: 'HIDE_AUTOCOMPLETE' }
  | { type: 'CLEAR_AUTOCOMPLETE' }

  // Dimensions actions
  | { type: 'SET_DIMENSIONS'; payload: Partial<TerminalDimensions> }
  | { type: 'UPDATE_VIEWPORT'; payload: 'mobile' | 'tablet' | 'desktop' }

  // Output buffer actions
  | { type: 'ADD_TO_OUTPUT'; payload: string }
  | { type: 'CLEAR_OUTPUT' }
  | { type: 'TRIM_OUTPUT_BUFFER' }

  // Reset
  | { type: 'RESET_STATE' }

/**
 * State reducer function type
 * Processes actions to produce new state
 */
export type TerminalStateReducer = (
  state: TerminalState,
  action: TerminalStateAction
) => TerminalState

/**
 * Initial state factory
 * Creates default terminal state
 */
export interface InitialStateConfig {
  /**
   * Initial terminal columns
   * @default 80
   */
  cols?: number

  /**
   * Initial terminal rows
   * @default 30
   */
  rows?: number

  /**
   * Initial viewport category
   * @default 'desktop'
   */
  viewport?: 'mobile' | 'tablet' | 'desktop'

  /**
   * Pre-populate command history
   * @default []
   */
  initialHistory?: string[]
}

/**
 * Create initial terminal state
 *
 * @param config - Optional configuration overrides
 * @returns Initial state object
 *
 * @example
 * ```ts
 * const initialState = createInitialState({
 *   cols: 60,
 *   viewport: 'tablet'
 * })
 * ```
 */
export function createInitialState(config?: InitialStateConfig): TerminalState {
  return {
    commandHistory: config?.initialHistory ?? [],
    historyIndex: -1,
    currentCommand: '',
    cursorPosition: 0,
    autocomplete: {
      suggestion: '',
      visible: false,
      partial: '',
    },
    dimensions: {
      cols: config?.cols ?? 80,
      rows: config?.rows ?? 30,
      viewport: config?.viewport ?? 'desktop',
    },
    outputBuffer: [],
  }
}

/**
 * State selector utilities
 * Extract derived state without mutations
 */
export interface StateSelectors {
  /**
   * Get command at specific history index
   *
   * @param state - Current state
   * @param index - History index (0 = oldest)
   * @returns Command string or undefined if out of bounds
   */
  getHistoryCommand: (state: TerminalState, index: number) => string | undefined

  /**
   * Check if history navigation is active
   *
   * @param state - Current state
   * @returns True if user is navigating history
   */
  isNavigatingHistory: (state: TerminalState) => boolean

  /**
   * Get current autocomplete suggestion (if visible)
   *
   * @param state - Current state
   * @returns Suggestion text or null
   */
  getCurrentSuggestion: (state: TerminalState) => string | null

  /**
   * Check if output buffer is near limit
   *
   * @param state - Current state
   * @param threshold - Warning threshold (default: 9000 lines)
   * @returns True if buffer should be trimmed soon
   */
  isOutputBufferNearLimit: (state: TerminalState, threshold?: number) => boolean

  /**
   * Get command with autocomplete applied
   *
   * @param state - Current state
   * @returns Command string with suggestion inserted
   */
  getCommandWithAutocomplete: (state: TerminalState) => string
}

/**
 * State validator utilities
 * Validate state invariants
 */
export interface StateValidators {
  /**
   * Validate command history is within limits
   *
   * @param history - Command history array
   * @returns True if valid (≤100 entries)
   */
  isHistoryValid: (history: string[]) => boolean

  /**
   * Validate cursor position is within command bounds
   *
   * @param cursorPosition - Cursor index
   * @param commandLength - Current command length
   * @returns True if valid (0 ≤ cursor ≤ length)
   */
  isCursorValid: (cursorPosition: number, commandLength: number) => boolean

  /**
   * Validate output buffer is within limits
   *
   * @param buffer - Output buffer array
   * @returns True if valid (≤10000 lines)
   */
  isOutputBufferValid: (buffer: string[]) => boolean
}

/**
 * Constants for state management
 */
export const STATE_CONSTANTS = {
  /** Maximum command history entries */
  MAX_HISTORY_SIZE: 100,

  /** Maximum output buffer lines */
  MAX_OUTPUT_BUFFER: 10000,

  /** Lines to remove when buffer overflows */
  BUFFER_TRIM_SIZE: 1000,

  /** Maximum command length (characters) */
  MAX_COMMAND_LENGTH: 2000,
} as const
