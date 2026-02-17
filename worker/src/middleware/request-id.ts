// Request ID Middleware
// Generates unique IDs for request tracking and correlation

import { Context, Next } from 'hono'
import { HonoEnv } from '../lib/types'

/**
 * Middleware to generate and track request IDs
 * - Generates UUID for each request
 * - Stores in context for use in logging
 * - Returns in X-Request-Id header for client-side debugging
 */
export const requestIdMiddleware = async (c: Context<HonoEnv>, next: Next) => {
  // Generate unique request ID
  const requestId = crypto.randomUUID()

  // Store in context for access in route handlers and loggers
  c.set('requestId', requestId)

  // Add to response headers for client-side debugging
  c.header('X-Request-Id', requestId)

  await next()
}
