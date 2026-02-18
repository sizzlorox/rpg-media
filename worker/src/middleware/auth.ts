// JWT authentication middleware with cookie validation

import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { HonoEnv } from '../lib/types'
import { JWTPayload } from '../../../shared/types'

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
    // Verify JWT with HS256 algorithm
    const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as JWTPayload

    // Set user context for downstream handlers
    c.set('userId', payload.sub)
    c.set('username', payload.username)
    c.set('level', payload.level)

    return await next()
  } catch (error) {
    return c.json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
      code: '401',
    }, 401)
  }
}

// Middleware requiring a verified email address (used for 2FA setup)
// Legacy users with email=null bypass this check
export async function emailVerifiedMiddleware(c: Context<HonoEnv>, next: Next) {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401)
  }

  const db = c.env.DB
  const user = await db.prepare('SELECT email, email_verified FROM users WHERE id = ?').bind(userId).first<{ email: string | null; email_verified: number }>()

  // Only block if email is set but unverified
  if (user?.email && !user.email_verified) {
    return c.json({ error: 'EmailNotVerified', message: 'Please verify your email first', code: 'EmailNotVerified' }, 403)
  }

  return await next()
}

// Optional auth middleware - doesn't fail if no token
export async function optionalAuth(c: Context<HonoEnv>, next: Next) {
  const token = getCookie(c, 'auth_token')

  if (token) {
    try {
      const payload = await verify(token, c.env.JWT_SECRET, 'HS256') as JWTPayload
      c.set('userId', payload.sub)
      c.set('username', payload.username)
      c.set('level', payload.level)
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }

  return await next()
}
