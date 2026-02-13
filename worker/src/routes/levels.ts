// Levels routes: thresholds, progression info

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { createDatabaseClient } from '../lib/db'
import { xpForLevel, calculateLevel } from '../lib/constants'

const levels = new Hono<HonoEnv>()

interface LevelThreshold {
  level: number
  xp_required: number
  feature_unlocked: string | null
}

// GET /api/levels/thresholds - Get XP thresholds for all levels
levels.get('/thresholds', async (c) => {
  try {
    const db = createDatabaseClient(c.env)

    // Query level_thresholds table
    const thresholds = await db.query<LevelThreshold>(
      `SELECT level, xp_required, feature_unlocked
       FROM level_thresholds
       ORDER BY level ASC`
    )

    return c.json({ thresholds })
  } catch (error) {
    return c.json({
      error: 'InternalServerError',
      message: (error as Error).message,
    }, 500)
  }
})

// GET /api/levels/calculate/:xp - Calculate level from XP (utility endpoint)
levels.get('/calculate/:xp', async (c) => {
  const xpParam = c.param('xp')
  const xp = parseInt(xpParam, 10)

  if (isNaN(xp) || xp < 0) {
    return c.json({ error: 'BadRequest', message: 'Invalid XP value' }, 400)
  }

  const level = calculateLevel(xp)
  const xpForCurrentLevel = xpForLevel(level)
  const xpForNextLevel = xpForLevel(level + 1)
  const xpNeeded = xpForNextLevel - xp
  const progress = ((xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100

  return c.json({
    level,
    total_xp: xp,
    xp_for_current_level: xpForCurrentLevel,
    xp_for_next_level: xpForNextLevel,
    xp_needed: xpNeeded,
    progress_percent: Math.round(progress * 100) / 100,
  })
})

export default levels
