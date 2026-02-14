/**
 * Command Handler Interface
 *
 * Defines the contract for processing user commands in the terminal.
 * Parent components (Home.tsx, Landing.tsx) implement this interface.
 *
 * @module contracts/CommandHandler.interface
 * @version 1.0.0
 */

/**
 * Command handler function signature
 *
 * Processes a command submitted by the user in the terminal.
 * Returns the result to be displayed in terminal output.
 *
 * @param command - The full command string (e.g., "/post Hello world!")
 * @param terminalCols - Current terminal column count (for responsive output formatting)
 * @returns Promise resolving to formatted output string (ANSI escape sequences supported)
 *
 * @example
 * ```ts
 * const handleCommand: CommandHandler = async (command, cols) => {
 *   if (command.startsWith('/post ')) {
 *     const content = command.slice(6)
 *     const result = await createPost(content)
 *     return `✓ Post created (ID: ${result.id})\r\n`
 *   }
 *   return `Unknown command: ${command}\r\n`
 * }
 * ```
 */
export type CommandHandler = (
  command: string,
  terminalCols: number
) => Promise<string> | string

/**
 * Command validation result
 * Returned by command validators before execution
 */
export interface CommandValidationResult {
  /**
   * Whether the command passed validation
   */
  valid: boolean

  /**
   * Error message if validation failed
   * Undefined if valid
   */
  error?: string

  /**
   * Parsed command parts (if valid)
   */
  parsed?: ParsedCommand
}

/**
 * Parsed command structure
 * Break down user input into actionable parts
 */
export interface ParsedCommand {
  /**
   * The command name (e.g., "post" from "/post Hello")
   */
  command: string

  /**
   * Array of arguments following the command
   *
   * @example
   * "/post Hello world" → args: ["Hello", "world"]
   * "/like 123" → args: ["123"]
   */
  args: string[]

  /**
   * Full argument string (everything after command name)
   * Useful for commands that take free-form text
   *
   * @example
   * "/post Hello world" → rawArgs: "Hello world"
   */
  rawArgs: string

  /**
   * Whether this command requires password masking
   * True for /login and /register commands
   */
  requiresPasswordMask: boolean
}

/**
 * Command parser function
 * Converts raw user input into ParsedCommand structure
 *
 * @param input - Raw command string from user
 * @returns Parsed command object or null if parsing fails
 *
 * @example
 * ```ts
 * const parseCommand: CommandParser = (input) => {
 *   if (!input.startsWith('/')) return null
 *
 *   const parts = input.slice(1).split(' ')
 *   const command = parts[0]
 *   const args = parts.slice(1)
 *
 *   return {
 *     command,
 *     args,
 *     rawArgs: args.join(' '),
 *     requiresPasswordMask: ['login', 'register'].includes(command)
 *   }
 * }
 * ```
 */
export type CommandParser = (input: string) => ParsedCommand | null

/**
 * Command autocomplete provider
 * Suggests completions for partial command input
 */
export interface AutocompleteProvider {
  /**
   * Get autocomplete suggestions for partial input
   *
   * @param partial - Partial command string (e.g., "/pos")
   * @returns Array of possible completions (e.g., ["/post "])
   *
   * @example
   * ```ts
   * getSuggestions('/pos') → ['/post ']
   * getSuggestions('/') → ['/post ', '/like ', '/comment ', ...]
   * ```
   */
  getSuggestions: (partial: string) => string[]

  /**
   * All available commands for autocomplete
   */
  availableCommands: string[]
}

/**
 * Standard terminal commands
 * Built-in commands supported by Social Forge terminal
 */
export enum TerminalCommand {
  /** Create a new post */
  POST = 'post',

  /** Like a post */
  LIKE = 'like',

  /** Comment on a post */
  COMMENT = 'comment',

  /** Show post details with comments */
  SHOW = 'show',

  /** User login */
  LOGIN = 'login',

  /** User registration */
  REGISTER = 'register',

  /** User logout */
  LOGOUT = 'logout',

  /** Display help */
  HELP = 'help',

  /** Display manual pages */
  MAN = 'man',

  /** Display user profile/character sheet */
  PROFILE = 'profile',

  /** Clear terminal screen */
  CLEAR = 'clear',
}

/**
 * Command execution context
 * Provides state and utilities to command handlers
 */
export interface CommandContext {
  /**
   * Current authenticated user (if logged in)
   */
  user: { username: string; level: number } | null

  /**
   * Whether user is authenticated
   */
  isAuthenticated: boolean

  /**
   * Terminal column count (for formatting output)
   */
  terminalCols: number

  /**
   * Utility to format output with ANSI colors
   */
  formatters: {
    success: (text: string) => string
    error: (text: string) => string
    warning: (text: string) => string
    info: (text: string) => string
  }
}

/**
 * Command execution result
 * Returned by command handlers
 */
export interface CommandResult {
  /**
   * Formatted output to display in terminal
   * Supports ANSI escape sequences
   */
  output: string

  /**
   * Whether the command succeeded
   */
  success: boolean

  /**
   * Whether to clear terminal before displaying output
   * @default false
   */
  clearBefore?: boolean

  /**
   * Whether to add command to history
   * @default true (false for sensitive commands like /login password)
   */
  addToHistory?: boolean
}
