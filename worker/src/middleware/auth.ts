// JWT authentication middleware with cookie validation

import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { HonoEnv } from '../lib/types'
import { JWTPayload } from '../../../../shared/types'

export async function authMiddleware(c: Context<HonoEnv>, next: Next) {
  const token = getCookie(c, 'auth_token')

  console.log('Auth middleware - token present:', !!token)

  if (!token) {
    console.log('Auth middleware - no token found')
    return c.json({
      error: 'Unauthorized',
      message: 'Authentication required',
      code: '401',
    }, 401)
  }

  try {
    // Verify JWT
    console.log('Auth middleware - verifying token')
    const payload = await verify(token, c.env.JWT_SECRET) as JWTPayload

    console.log('Auth middleware - token valid for user:', payload.username)

    // Set user context for downstream handlers
    c.set('userId', payload.sub)
    c.set('username', payload.username)
    c.set('level', payload.level)

    return await next()
  } catch (error) {
    console.log('Auth middleware - verification failed:', (error as Error).message)
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

  return await next()
}
