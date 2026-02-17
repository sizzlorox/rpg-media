// Structured JSON logging utility
// Logs user actions, XP awards, level-ups, and errors

import { Context } from 'hono'
import { HonoEnv } from './types'

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  level: LogLevel
  timestamp: number
  message: string
  requestId?: string
  [key: string]: unknown
}

export function log(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>,
  context?: Context<HonoEnv>
): void {
  const entry: LogEntry = {
    level,
    timestamp: Date.now(),
    message,
    requestId: context?.get('requestId'),
    ...metadata,
  }

  console.log(JSON.stringify(entry))
}

export function logInfo(
  message: string,
  metadata?: Record<string, unknown>,
  context?: Context<HonoEnv>
): void {
  log('info', message, metadata, context)
}

export function logWarn(
  message: string,
  metadata?: Record<string, unknown>,
  context?: Context<HonoEnv>
): void {
  log('warn', message, metadata, context)
}

export function logError(
  message: string,
  metadata?: Record<string, unknown>,
  context?: Context<HonoEnv>
): void {
  log('error', message, metadata, context)
}

export function logDebug(
  message: string,
  metadata?: Record<string, unknown>,
  context?: Context<HonoEnv>
): void {
  log('debug', message, metadata, context)
}

// Analytics event tracking
export function trackEvent(
  eventName: string,
  metadata: Record<string, unknown>,
  context?: Context<HonoEnv>
): void {
  logInfo(`event:${eventName}`, {
    event: eventName,
    ...metadata,
  }, context)
}
