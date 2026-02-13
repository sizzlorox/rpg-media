// Analytics logging middleware for custom event tracking

import { Context, Next } from 'hono'
import { HonoEnv } from '../lib/types'
import { trackEvent } from '../lib/logger'

export async function analyticsLogger(c: Context<HonoEnv>, next: Next) {
  const start = Date.now()

  const response = await next()

  const duration = Date.now() - start

  // Track request metadata
  trackEvent('api_request', {
    path: c.req.path,
    method: c.req.method,
    status: c.res.status,
    duration,
    userId: c.get('userId'),
  })

  return response
}
