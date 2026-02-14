/**
 * Logger Interface
 *
 * Defines structured logging contract for terminal component.
 * All errors, performance issues, and significant events are logged in JSON format.
 *
 * @module contracts/Logger.interface
 * @version 1.0.0
 */

/**
 * Log severity levels
 * Follows standard logging convention
 */
export enum LogLevel {
  /** Debugging information */
  DEBUG = 'debug',

  /** Informational messages */
  INFO = 'info',

  /** Warning conditions */
  WARN = 'warn',

  /** Error conditions */
  ERROR = 'error',

  /** Critical failures */
  CRITICAL = 'critical',
}

/**
 * Terminal-specific log event types
 * Categorizes different kinds of terminal events
 */
export enum TerminalLogEvent {
  /** Terminal initialization started */
  INIT_START = 'terminal.init.start',

  /** Terminal initialization succeeded */
  INIT_SUCCESS = 'terminal.init.success',

  /** Terminal initialization failed */
  INIT_ERROR = 'terminal.init.error',

  /** Library (xterm.js) failed to load */
  LIBRARY_LOAD_ERROR = 'terminal.library.load_error',

  /** Command executed by user */
  COMMAND_EXECUTED = 'terminal.command.executed',

  /** Command execution failed */
  COMMAND_ERROR = 'terminal.command.error',

  /** Input validation failed */
  INPUT_VALIDATION_ERROR = 'terminal.input.validation_error',

  /** Output buffer overflow */
  BUFFER_OVERFLOW = 'terminal.buffer.overflow',

  /** Command history overflow (>100 entries) */
  HISTORY_OVERFLOW = 'terminal.history.overflow',

  /** Performance bottleneck detected */
  PERFORMANCE_SLOW = 'terminal.performance.slow',

  /** Render error occurred */
  RENDER_ERROR = 'terminal.render.error',

  /** FitAddon resize triggered */
  RESIZE = 'terminal.resize',

  /** Unexpected error caught by error boundary */
  ERROR_BOUNDARY = 'terminal.error_boundary',
}

/**
 * Structured log entry
 * All logs follow this format for consistency
 */
export interface LogEntry {
  /**
   * ISO 8601 timestamp
   * @example "2026-02-14T10:30:00.123Z"
   */
  timestamp: string

  /**
   * Log severity level
   */
  level: LogLevel

  /**
   * Event type (predefined enum)
   */
  event: TerminalLogEvent

  /**
   * Human-readable log message
   */
  message: string

  /**
   * Structured context data
   * Additional information about the event
   */
  context?: LogContext

  /**
   * Error details (if level is ERROR or CRITICAL)
   */
  error?: ErrorDetails

  /**
   * User session information (if available)
   */
  session?: SessionInfo
}

/**
 * Log context data
 * Event-specific metadata
 */
export interface LogContext {
  /**
   * Command that triggered the event
   */
  command?: string

  /**
   * Terminal configuration at time of event
   */
  terminalConfig?: {
    cols: number
    rows: number
    viewport: string
  }

  /**
   * Buffer sizes at time of event
   */
  bufferSizes?: {
    outputLines: number
    historyEntries: number
  }

  /**
   * Performance metrics
   */
  performance?: {
    /** Duration in milliseconds */
    duration?: number
    /** Input lag in milliseconds */
    inputLag?: number
    /** Render time in milliseconds */
    renderTime?: number
  }

  /**
   * Additional freeform metadata
   */
  [key: string]: unknown
}

/**
 * Error details for error-level logs
 */
export interface ErrorDetails {
  /**
   * Error name (e.g., "TypeError", "ValidationError")
   */
  name: string

  /**
   * Error message
   */
  message: string

  /**
   * Stack trace (if available)
   */
  stack?: string

  /**
   * Error code (if applicable)
   */
  code?: string | number

  /**
   * Cause of the error (nested error)
   */
  cause?: ErrorDetails
}

/**
 * User session information
 */
export interface SessionInfo {
  /**
   * User ID (if authenticated)
   */
  userId?: string

  /**
   * Username (if authenticated)
   */
  username?: string

  /**
   * Session ID
   */
  sessionId?: string

  /**
   * User agent string
   */
  userAgent?: string

  /**
   * Browser viewport dimensions
   */
  viewport?: {
    width: number
    height: number
  }
}

/**
 * Logger interface
 * Main logging API
 */
export interface ITerminalLogger {
  /**
   * Log a debug message
   *
   * @param event - Event type
   * @param message - Log message
   * @param context - Optional context data
   */
  debug(event: TerminalLogEvent, message: string, context?: LogContext): void

  /**
   * Log an informational message
   *
   * @param event - Event type
   * @param message - Log message
   * @param context - Optional context data
   */
  info(event: TerminalLogEvent, message: string, context?: LogContext): void

  /**
   * Log a warning
   *
   * @param event - Event type
   * @param message - Log message
   * @param context - Optional context data
   */
  warn(event: TerminalLogEvent, message: string, context?: LogContext): void

  /**
   * Log an error
   *
   * @param event - Event type
   * @param message - Log message
   * @param error - Error object
   * @param context - Optional context data
   */
  error(
    event: TerminalLogEvent,
    message: string,
    error: Error,
    context?: LogContext
  ): void

  /**
   * Log a critical failure
   *
   * @param event - Event type
   * @param message - Log message
   * @param error - Error object
   * @param context - Optional context data
   */
  critical(
    event: TerminalLogEvent,
    message: string,
    error: Error,
    context?: LogContext
  ): void

  /**
   * Create a child logger with additional context
   * Useful for scoped logging (e.g., per-component)
   *
   * @param additionalContext - Context to merge with all logs
   * @returns New logger instance
   */
  child(additionalContext: LogContext): ITerminalLogger

  /**
   * Flush all pending logs (if batching is enabled)
   */
  flush(): void
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /**
   * Minimum log level to output
   * Logs below this level are ignored
   *
   * @default LogLevel.INFO
   */
  minLevel?: LogLevel

  /**
   * Whether to include session info in all logs
   *
   * @default true
   */
  includeSessionInfo?: boolean

  /**
   * Whether to include stack traces for errors
   *
   * @default true in development, false in production
   */
  includeStackTraces?: boolean

  /**
   * Whether to batch logs (flush on interval)
   * Useful for reducing console noise
   *
   * @default false
   */
  batchLogs?: boolean

  /**
   * Batch flush interval in milliseconds
   *
   * @default 1000
   */
  batchInterval?: number

  /**
   * Custom log formatter
   * Override to change JSON structure
   */
  formatter?: (entry: LogEntry) => string

  /**
   * Log transport
   * Where to send logs (console, server, file, etc.)
   *
   * @default console
   */
  transport?: LogTransport
}

/**
 * Log transport interface
 * Defines where logs are sent
 */
export interface LogTransport {
  /**
   * Send a log entry to the transport
   *
   * @param entry - Structured log entry
   */
  send(entry: LogEntry): void | Promise<void>

  /**
   * Flush all pending logs
   */
  flush?(): void | Promise<void>
}

/**
 * Built-in console transport
 * Logs to browser console with colored output
 */
export class ConsoleTransport implements LogTransport {
  send(entry: LogEntry): void {
    const level = entry.level
    const formattedMessage = this.formatMessage(entry)

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, entry)
        break
      case LogLevel.INFO:
        console.info(formattedMessage, entry)
        break
      case LogLevel.WARN:
        console.warn(formattedMessage, entry)
        break
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedMessage, entry)
        break
    }
  }

  private formatMessage(entry: LogEntry): string {
    return `[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.event}: ${entry.message}`
  }
}

/**
 * Create a terminal logger instance
 *
 * @param config - Logger configuration
 * @returns Logger instance
 *
 * @example
 * ```ts
 * const logger = createLogger({
 *   minLevel: LogLevel.INFO,
 *   includeSessionInfo: true
 * })
 *
 * logger.info(
 *   TerminalLogEvent.INIT_SUCCESS,
 *   'Terminal initialized successfully',
 *   { terminalConfig: { cols: 80, rows: 30, viewport: 'desktop' } }
 * )
 * ```
 */
export function createLogger(config?: LoggerConfig): ITerminalLogger {
  // Implementation will be in terminal-logger.ts
  throw new Error('Not implemented - see frontend/src/utils/terminal-logger.ts')
}
