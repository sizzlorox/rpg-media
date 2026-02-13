// XP service for awarding XP and managing character progression

import { DatabaseClient } from '../lib/db'
import { UserModel } from '../models/user'
import { XP_VALUES, calculateLevel } from '../lib/constants'
import { trackEvent } from '../lib/logger'

export class XPService {
  private userModel: UserModel

  constructor(private db: DatabaseClient) {
    this.userModel = new UserModel(db)
  }

  // Award XP to a user using batch operations (Constitution Principle V)
  async awardXP(userId: string, amount: number, reason: string): Promise<{ oldLevel: number; newLevel: number; levelUp: boolean }> {
    const user = await this.userModel.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const oldLevel = user.level
    const newTotalXP = user.total_xp + amount
    const newLevel = calculateLevel(newTotalXP)

    // Update user XP and level in one operation
    await this.db.exec(
      'UPDATE users SET total_xp = ?, level = ?, updated_at = ? WHERE id = ?',
      newTotalXP,
      newLevel,
      Date.now(),
      userId
    )

    const levelUp = newLevel > oldLevel

    // Track XP award event
    trackEvent('xp_awarded', {
      userId,
      amount,
      reason,
      oldXP: user.total_xp,
      newXP: newTotalXP,
      oldLevel,
      newLevel,
      levelUp,
    })

    // If level up, track that too
    if (levelUp) {
      trackEvent('level_up', {
        userId,
        oldLevel,
        newLevel,
        totalXP: newTotalXP,
      })
    }

    return {
      oldLevel,
      newLevel,
      levelUp,
    }
  }

  // Award XP to multiple users in a batch (for interactions like likes/comments)
  async awardXPBatch(awards: Array<{ userId: string; amount: number; reason: string }>): Promise<Map<string, boolean>> {
    const levelUps = new Map<string, boolean>()

    // Execute all XP awards
    for (const award of awards) {
      const result = await this.awardXP(award.userId, award.amount, award.reason)
      levelUps.set(award.userId, result.levelUp)
    }

    return levelUps
  }

  // Calculate total XP for a user (from all sources)
  async calculateTotalXP(userId: string): Promise<number> {
    const user = await this.userModel.findById(userId)
    return user?.total_xp || 0
  }

  // Get XP breakdown by action type
  async getXPBreakdown(userId: string): Promise<{
    from_posts: number
    from_likes_given: number
    from_likes_received: number
    from_comments_made: number
    from_comments_received: number
    from_follows_received: number
    total: number
  }> {
    // Get counts for each action type
    const [postsCount, likesGiven, likesReceived, commentsMade, commentsReceived, followsReceived] = await Promise.all([
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', userId),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM likes WHERE user_id = ?', userId),
      this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM likes WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)',
        userId
      ),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM comments WHERE user_id = ?', userId),
      this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM comments WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)',
        userId
      ),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM follows WHERE followee_id = ?', userId),
    ])

    const breakdown = {
      from_posts: (postsCount?.count || 0) * XP_VALUES.CREATE_POST,
      from_likes_given: (likesGiven?.count || 0) * XP_VALUES.LIKE_POST_EARNER,
      from_likes_received: (likesReceived?.count || 0) * XP_VALUES.LIKE_POST_CREATOR,
      from_comments_made: (commentsMade?.count || 0) * XP_VALUES.COMMENT_EARNER,
      from_comments_received: (commentsReceived?.count || 0) * XP_VALUES.COMMENT_CREATOR,
      from_follows_received: (followsReceived?.count || 0) * XP_VALUES.RECEIVE_FOLLOW,
      total: 0,
    }

    breakdown.total =
      breakdown.from_posts +
      breakdown.from_likes_given +
      breakdown.from_likes_received +
      breakdown.from_comments_made +
      breakdown.from_comments_received +
      breakdown.from_follows_received

    return breakdown
  }
}
