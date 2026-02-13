// Feed routes: home feed and discovery feed

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { createDatabaseClient } from '../lib/db'
import { FeedService } from '../services/feed-service'
import { authMiddleware, optionalAuth } from '../middleware/auth'

const feed = new Hono<HonoEnv>()

// GET /api/feed/home - Get personalized home feed
feed.get('/home', authMiddleware, async (c) => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    const db = createDatabaseClient(c.env)
    const feedService = new FeedService(db)

    const result = await feedService.generateHomeFeed(userId, limit, offset)

    return c.json(result)
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// GET /api/feed/discover - Get discovery feed (popular posts)
// Uses FR-029 algorithm: popularity_score = ((likes × 1) + (comments × 3) + age_bonus) / hours^0.8
feed.get('/discover', optionalAuth, async (c) => {
  const userId = c.get('userId') // Optional - for is_liked_by_user flag

  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    const db = createDatabaseClient(c.env)
    const feedService = new FeedService(db)

    const result = await feedService.generateDiscoveryFeed(limit, offset, userId)

    return c.json(result)
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

export default feed
