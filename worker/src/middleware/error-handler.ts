// Centralized error handling middleware

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

  // Determine status code
  const status = (err as any).status || 500

  // Return error response
  return c.json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    code: status.toString(),
  }, status)
}
