// Authentication service for user registration and login

import { hash, compare } from 'bcryptjs'
import { sign } from 'hono/jwt'
import { DatabaseClient } from '../lib/db'
import { Env } from '../lib/types'
import { User, UserProfile, JWTPayload } from '../../../../shared/types'
import { calculateLevel, xpForLevel, xpForNextLevel, xpProgressPercent } from '../lib/constants'

const SALT_ROUNDS = 10

export class AuthService {
  constructor(
    private db: DatabaseClient,
    private env: Env
  ) {}

  // Register new user
  async register(username: string, password: string): Promise<UserProfile> {
    // Validate username
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      throw new Error('Username must be 3-20 characters, alphanumeric and underscores only')
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters')
    }

    // Check if username exists
    const existing = await this.db.queryOne<User>(
      'SELECT id FROM users WHERE username = ?',
      username
    )

    if (existing) {
      throw new Error('Username already exists')
    }

    // Hash password
    const passwordHash = await hash(password, SALT_ROUNDS)

    // Create user
    const userId = crypto.randomUUID()
    const now = Date.now()

    await this.db.exec(
      `INSERT INTO users (id, username, password_hash, level, total_xp, created_at, updated_at)
       VALUES (?, ?, ?, 1, 0, ?, ?)`,
      userId, username, passwordHash, now, now
    )

    // Fetch and return user profile
    const user = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      userId
    )

    if (!user) {
      throw new Error('Failed to create user')
    }

    return this.buildUserProfile(user)
  }

  // Login existing user
  async login(username: string, password: string): Promise<{ user: UserProfile; token: string }> {
    // Find user
    const user = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE username = ?',
      username
    )

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValid = await compare(password, user.password_hash)

    if (!isValid) {
      throw new Error('Invalid credentials')
    }

    // Generate JWT
    const token = await this.generateToken(user)

    return {
      user: await this.buildUserProfile(user),
      token,
    }
  }

  // Generate JWT token
  private async generateToken(user: User): Promise<string> {
    const payload: JWTPayload = {
      sub: user.id,
      username: user.username,
      level: user.level,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
    }

    return await sign(payload, this.env.JWT_SECRET)
  }

  // Build user profile with computed stats
  private async buildUserProfile(user: User): Promise<UserProfile> {
    // Get stats
    const [postsCount, likesGiven, likesReceived, commentsCount, followersCount, followingCount] = await Promise.all([
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM likes WHERE user_id = ?', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM likes WHERE post_id IN (SELECT id FROM posts WHERE user_id = ?)', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM comments WHERE user_id = ?', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM follows WHERE followee_id = ?', user.id),
      this.db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', user.id),
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

  // Get current user profile
  async getCurrentUser(userId: string): Promise<UserProfile> {
    const user = await this.db.queryOne<User>(
      'SELECT * FROM users WHERE id = ?',
      userId
    )

    if (!user) {
      throw new Error('User not found')
    }

    return this.buildUserProfile(user)
  }
}
