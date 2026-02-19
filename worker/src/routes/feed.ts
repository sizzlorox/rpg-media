// Feed routes: home feed and discovery feed

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { createDatabaseClient } from '../lib/db'
import { FeedService } from '../services/feed-service'
import { authMiddleware, optionalAuth } from '../middleware/auth'
import { sanitizeError } from '../lib/error-sanitizer'
import { validateChannel } from '../lib/constants'
import { type Channel, type FeedSortMode } from '../../../shared/types'

const VALID_SORT_MODES: FeedSortMode[] = ['new', 'top', 'trending']

const feed = new Hono<HonoEnv>()

// GET /api/feed/home - Get personalized home feed
// Query params: ?channel=dev&sort=new|top|trending&following=true&limit=30&offset=N
feed.get('/home', authMiddleware, async (c) => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '30'), 100)
    const offset = parseInt(c.req.query('offset') || '0')
    const rawChannel = c.req.query('channel')
    const rawSort = c.req.query('sort') || 'new'
    const followingOnly = c.req.query('following') !== 'false'

    // Validate channel
    let channel: Channel | undefined
    if (rawChannel) {
      try {
        channel = validateChannel(rawChannel)
      } catch (e) {
        return c.json({ error: 'BadRequest', message: (e as Error).message }, 400)
      }
    }

    // Validate sort
    if (!VALID_SORT_MODES.includes(rawSort as FeedSortMode)) {
      return c.json({
        error: 'BadRequest',
        message: `Invalid sort mode: "${rawSort}". Valid: ${VALID_SORT_MODES.join(', ')}`,
      }, 400)
    }
    const sort = rawSort as FeedSortMode

    const db = createDatabaseClient(c.env)
    const feedService = new FeedService(db)

    const result = await feedService.generateHomeFeed(userId, limit, offset, channel, sort, followingOnly)

    return c.json(result)
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// GET /api/feed/discover - Get discovery feed (popular posts)
// Uses FR-029 algorithm: popularity_score = ((likes × 1) + (comments × 3) + age_bonus) / hours^0.8
// Query params: ?channel=dev&sort=new|top|trending&following=true&limit=30&offset=N
feed.get('/discover', optionalAuth, async (c) => {
  const userId = c.get('userId') // Optional - for is_liked_by_user flag

  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '30'), 100)
    const offset = parseInt(c.req.query('offset') || '0')
    const rawChannel = c.req.query('channel')
    const rawSort = c.req.query('sort') || 'trending'
    const followingOnly = c.req.query('following') === 'true'

    // Validate channel
    let channel: Channel | undefined
    if (rawChannel) {
      try {
        channel = validateChannel(rawChannel)
      } catch (e) {
        return c.json({ error: 'BadRequest', message: (e as Error).message }, 400)
      }
    }

    // Validate sort
    if (!VALID_SORT_MODES.includes(rawSort as FeedSortMode)) {
      return c.json({
        error: 'BadRequest',
        message: `Invalid sort mode: "${rawSort}". Valid: ${VALID_SORT_MODES.join(', ')}`,
      }, 400)
    }
    const sort = rawSort as FeedSortMode

    const db = createDatabaseClient(c.env)
    const feedService = new FeedService(db)

    // When followingOnly is requested on discover feed, redirect to home feed logic
    if (followingOnly && userId) {
      const result = await feedService.generateHomeFeed(userId, limit, offset, channel, sort, true)
      return c.json(result)
    }

    const result = await feedService.generateDiscoveryFeed(limit, offset, userId, channel, sort)

    return c.json(result)
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

export default feed
