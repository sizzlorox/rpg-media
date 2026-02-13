// Centralized error handling middleware with Sentry integration

import * as Sentry from '@sentry/cloudflare'
import { Context } from 'hono'
import { HonoEnv } from '../lib/types'
import { logError } from '../lib/logger'

export async function errorHandler(err: Error, c: Context<HonoEnv>) {
  // Log error
  logError('Request error', {
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
    userId: c.get('userId'),
  })

  // Capture in Sentry
  Sentry.captureException(err, {
    tags: {
      path: c.req.path,
      method: c.req.method,
    },
    user: c.get('userId') ? {
      id: c.get('userId'),
      username: c.get('username'),
    } : undefined,
  })

  // Determine status code
  const status = (err as any).status || 500

  // Return error response
  return c.json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    code: status.toString(),
  }, status)
}
