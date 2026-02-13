// XP routes: history, breakdown, progress

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { createDatabaseClient } from '../lib/db'
import { XPService } from '../services/xp-service'
import { UserModel } from '../models/user'
import { authMiddleware } from '../middleware/auth'
import { xpForNextLevel, xpProgressPercent } from '../lib/constants'

const xp = new Hono<HonoEnv>()

// GET /api/xp/breakdown - Get XP breakdown by action type
xp.get('/breakdown', authMiddleware, async (c) => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const db = createDatabaseClient(c.env)
    const xpService = new XPService(db)

    const breakdown = await xpService.getXPBreakdown(userId)

    return c.json({ breakdown })
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// GET /api/xp/progress - Get current level progress
xp.get('/progress', authMiddleware, async (c) => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const db = createDatabaseClient(c.env)
    const userModel = new UserModel(db)

    const user = await userModel.findById(userId)
    if (!user) {
      return c.json({ error: 'NotFound', message: 'User not found' }, 404)
    }

    const nextLevelXP = xpForNextLevel(user.level)
    const progress = xpProgressPercent(user.level, user.total_xp)

    return c.json({
      current_level: user.level,
      total_xp: user.total_xp,
      xp_for_next_level: nextLevelXP,
      xp_needed: nextLevelXP - user.total_xp,
      progress_percent: progress,
    })
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

export default xp
