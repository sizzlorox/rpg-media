// Structured JSON logging utility
// Logs user actions, XP awards, level-ups, and errors

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  timestamp: number
  message: string
  [key: string]: unknown
}

export function log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
  const entry: LogEntry = {
    level,
    timestamp: Date.now(),
    message,
    ...metadata,
  }

  console.log(JSON.stringify(entry))
}

export function logInfo(message: string, metadata?: Record<string, unknown>): void {
  log('info', message, metadata)
}

export function logWarn(message: string, metadata?: Record<string, unknown>): void {
  log('warn', message, metadata)
}

export function logError(message: string, metadata?: Record<string, unknown>): void {
  log('error', message, metadata)
}

export function logDebug(message: string, metadata?: Record<string, unknown>): void {
  log('debug', message, metadata)
}

// Analytics event tracking
export function trackEvent(eventName: string, metadata: Record<string, unknown>): void {
  logInfo(`event:${eventName}`, {
    event: eventName,
    ...metadata,
  })
}
