// JSON Body Parser Middleware
// Safely parses JSON request bodies with error handling

import { Context, Next } from 'hono'
import { HonoEnv } from '../lib/types'

/**
 * Middleware to safely parse JSON request bodies
 * - Validates Content-Type header
 * - Catches JSON parse errors
 * - Returns 400 BadRequest on invalid JSON
 */
export const jsonBodyParser = async (c: Context<HonoEnv>, next: Next) => {
  // Only parse body for methods that typically have a body
  if (c.req.method !== 'GET' && c.req.method !== 'DELETE' && c.req.method !== 'OPTIONS') {
    const contentType = c.req.header('content-type') || ''

    // Require application/json Content-Type for non-GET/DELETE requests
    if (!contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
      return c.json({
        error: 'BadRequest',
        message: 'Content-Type must be application/json'
      }, 400)
    }

    // Only parse JSON (skip multipart/form-data for file uploads)
    if (contentType.includes('application/json')) {
      try {
        // Pre-parse and cache the body for route handlers
        const body = await c.req.json()
        // Store parsed body in context for route handlers to access
        c.set('parsedBody', body)
      } catch (error) {
        return c.json({
          error: 'BadRequest',
          message: 'Invalid JSON in request body'
        }, 400)
      }
    }
  }

  await next()
}
