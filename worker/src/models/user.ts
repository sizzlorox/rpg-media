// User model with D1 prepared statements

import { DatabaseClient } from '../lib/db'
import { User, UserProfile } from '../../../shared/types'
import { calculateLevel, xpForLevel, xpForNextLevel, xpProgressPercent } from '../lib/constants'

export class UserModel {
  constructor(private db: DatabaseClient) {}

  // Get user by ID
  async findById(id: string): Promise<User | null> {
    return await this.db.queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      id
    )
  }

  // Get user by username
  async findByUsername(username: string): Promise<User | null> {
    return await this.db.queryOne<User>(
      'SELECT * FROM users WHERE username = ?',
      username
    )
  }

  // Create new user
  async create(user: Omit<User, 'created_at' | 'updated_at'>): Promise<User> {
    const now = Date.now()

    await this.db.exec(
      `INSERT INTO users (
        id, username, password_hash, level, total_xp,
        created_at, updated_at, avatar_url, banner_url, bio, theme_preference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      user.id,
      user.username,
      user.password_hash,
      user.level,
      user.total_xp,
      now,
      now,
      user.avatar_url,
      user.banner_url,
      user.bio,
      user.theme_preference
    )

    const created = await this.findById(user.id)
    if (!created) {
      throw new Error('Failed to create user')
    }

    return created
  }

  // Update user XP and level
  async updateXP(userId: string, xpToAdd: number): Promise<User> {
    const user = await this.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    const newTotalXP = user.total_xp + xpToAdd
    const newLevel = calculateLevel(newTotalXP)

    await this.db.exec(
      'UPDATE users SET total_xp = ?, level = ?, updated_at = ? WHERE id = ?',
      newTotalXP,
      newLevel,
      Date.now(),
      userId
    )

    const updated = await this.findById(userId)
    if (!updated) {
      throw new Error('Failed to update user')
    }

    return updated
  }

  // Get user profile with computed stats
  async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.findById(userId)
    if (!user) {
      return null
    }

    // Get all stats in parallel
    const [postsCount, likesGiven, likesReceived, commentsCount, followersCount, followingCount] = await Promise.all([
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', userId),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM likes WHERE user_id = ?', userId),
      this.db.queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM likes WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)',
        userId
      ),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM comments WHERE user_id = ?', userId),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM follows WHERE followee_id = ?', userId),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', userId),
    ])

    const currentLevel = calculateLevel(user.total_xp)
    const xpForCurrent = xpForLevel(currentLevel)
    const xpForNext = xpForNextLevel(currentLevel)
    const xpProgress = xpProgressPercent(currentLevel, user.total_xp)

    return {
      ...user,
      total_posts: postsCount?.count || 0,
      total_likes_given: likesGiven?.count || 0,
      total_likes_received: likesReceived?.count || 0,
      total_comments_made: commentsCount?.count || 0,
      followers_count: followersCount?.count || 0,
      following_count: followingCount?.count || 0,
      xp_for_current_level: xpForCurrent,
      xp_for_next_level: xpForNext,
      xp_progress_percent: xpProgress,
    }
  }

  // Get user profile by username
  async getProfileByUsername(username: string): Promise<UserProfile | null> {
    const user = await this.findByUsername(username)
    if (!user) {
      return null
    }

    return this.getProfile(user.id)
  }
}
