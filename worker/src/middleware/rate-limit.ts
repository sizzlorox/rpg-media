// Rate limiting middleware using Cloudflare KV and token bucket algorithm
// Per Spec Assumption #9: 10 posts/hour, 50 likes/hour, 20 comments/hour

import { Context, Next } from 'hono'
import { HonoEnv } from '../lib/types'
import { RATE_LIMITS } from '../lib/constants'

type ActionType = 'post' | 'like' | 'comment'

const ACTION_LIMITS: Record<ActionType, number> = {
  post: RATE_LIMITS.POSTS_PER_HOUR,
  like: RATE_LIMITS.LIKES_PER_HOUR,
  comment: RATE_LIMITS.COMMENTS_PER_HOUR,
}

export function rateLimiter(action: ActionType) {
  return async function (c: Context<HonoEnv>, next: Next) {
    const userId = c.get('userId')

    if (!userId) {
      return c.json({ error: 'Unauthorized', message: 'Authentication required' }, 401)
    }

    const limit = ACTION_LIMITS[action]
    const key = `rate_limit:${userId}:${action}`

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

    await next()
  }
}
