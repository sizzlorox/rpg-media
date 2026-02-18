// Rate limiting middleware using Cloudflare KV and token bucket algorithm
// Per Spec Assumption #9: 10 posts/hour, 50 likes/hour, 20 comments/hour

import { Context, Next } from 'hono'
import { HonoEnv } from '../lib/types'
import { RATE_LIMITS } from '../lib/constants'

type ActionType = 'post' | 'like' | 'comment' | 'register' | 'login'
  | 'email_verify' | 'password_reset' | 'totp_verify' | 'resend_verify'

const ACTION_LIMITS: Record<ActionType, number> = {
  post: RATE_LIMITS.POSTS_PER_HOUR,
  like: RATE_LIMITS.LIKES_PER_HOUR,
  comment: RATE_LIMITS.COMMENTS_PER_HOUR,
  register: 5,         // 5 registration attempts per hour
  login: 10,           // 10 login attempts per hour
  email_verify: 10,    // 10 verification attempts per hour
  password_reset: 3,   // strict — prevent email flooding
  totp_verify: 5,      // brute-force protection
  resend_verify: 2,    // 2 resends per hour
}

export function rateLimiter(action: ActionType, requireAuth: boolean = true) {
  return async function (c: Context<HonoEnv>, next: Next) {
    let identifier: string

    if (requireAuth) {
      // For authenticated actions, use userId
      const userId = c.get('userId')
      if (!userId) {
        return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401)
      }
      identifier = userId
    } else {
      // For unauthenticated actions (register/login), use IP address
      const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
      identifier = `ip:${ip}`
    }

    const limit = ACTION_LIMITS[action]
    const key = `rate_limit:${identifier}:${action}`

    // Get current count from KV
    const currentStr = await c.env.RATE_LIMIT_KV.get(key)
    const count = currentStr ? parseInt(currentStr) : 0

    // Check if limit exceeded
    if (count >= limit) {
      return c.json({
        error: 'RateLimitExceeded',
        message: `Rate limit exceeded. Maximum ${limit} ${action}s per hour.`,
        code: '429',
      }, 429)
    }

    // Increment counter with 1-hour expiration
    await c.env.RATE_LIMIT_KV.put(key, (count + 1).toString(), {
      expirationTtl: 3600,
    })

    return await next()
  }
}
