// JWT authentication middleware with cookie validation

import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { HonoEnv } from '../lib/types'
import { JWTPayload } from '../../../../shared/types'

export async function authMiddleware(c: Context<HonoEnv>, next: Next) {
  const token = getCookie(c, 'auth_token')

  if (!token) {
    return c.json({
      error: 'Unauthorized',
      message: 'Authentication required',
      code: '401',
    }, 401)
  }

  try {
    // Verify JWT
    const payload = await verify(token, c.env.JWT_SECRET) as JWTPayload

    // Set user context for downstream handlers
    c.set('userId', payload.sub)
    c.set('username', payload.username)
    c.set('level', payload.level)

    await next()
  } catch (error) {
    return c.json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      code: '401',
    }, 401)
  }
}

// Optional auth middleware - doesn't fail if no token
export async function optionalAuth(c: Context<HonoEnv>, next: Next) {
  const token = getCookie(c, 'auth_token')

  if (token) {
    try {
      const payload = await verify(token, c.env.JWT_SECRET) as JWTPayload
      c.set('userId', payload.sub)
      c.set('username', payload.username)
      c.set('level', payload.level)
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  await next()
}
