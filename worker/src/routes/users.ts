// Users routes: user profiles and post history

import { Hono } from 'hono'
import { HonoEnv } from '../lib/types'
import { createDatabaseClient } from '../lib/db'
import { UserModel } from '../models/user'
import { PostModel } from '../models/post'
import { authMiddleware, optionalAuth } from '../middleware/auth'
import { canAccessFeature, THEME_OPTIONS } from '../lib/constants'
import { sanitizeError } from '../lib/error-sanitizer'

const users = new Hono<HonoEnv>()

// GET /api/users/:username - Get user profile (character sheet)
users.get('/:username', optionalAuth, async (c) => {
  const username = c.req.param('username')
  // const currentUserId = c.get('userId') // Optional - not used yet

  try {
    const db = createDatabaseClient(c.env)
    const userModel = new UserModel(db)

    const profile = await userModel.getProfileByUsername(username)

    if (!profile) {
      return c.json({ error: 'NotFound', message: 'User not found' }, 404)
    }

    // Don't return password hash
    const { password_hash, ...profileWithoutPassword } = profile

    return c.json(profileWithoutPassword)
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// GET /api/users/:username/posts - Get user's post history
users.get('/:username/posts', optionalAuth, async (c) => {
  const username = c.req.param('username')
  const currentUserId = c.get('userId') // Optional - for is_liked_by_user flag

  try {
    const limit = parseInt(c.req.query('limit') || '50')
    const offset = parseInt(c.req.query('offset') || '0')

    const db = createDatabaseClient(c.env)
    const userModel = new UserModel(db)
    const postModel = new PostModel(db)

    // Get user by username
    const user = await userModel.findByUsername(username)

    if (!user) {
      return c.json({ error: 'NotFound', message: 'User not found' }, 404)
    }

    // Get user's posts
    const posts = await postModel.getPostsByUserId(user.id, limit + 1, offset)

    const has_more = posts.length > limit
    const postsToReturn = posts.slice(0, limit)

    // Enrich with author details
    const enrichedPosts = await postModel.enrichPostsWithAuthor(postsToReturn, currentUserId)

    return c.json({
      posts: enrichedPosts,
      total: posts.length,
      has_more,
    })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// PATCH /api/users/me/profile - Update user profile (avatar, banner, bio, theme)
users.patch('/me/profile', authMiddleware, async (c) => {
  const userId = c.get('userId')
  const level = c.get('level')

  if (!userId || level === undefined) {
    return c.json({ error: 'Unauthorized', message: 'Not authenticated' }, 401)
  }

  try {
    const body = await c.req.json<{
      avatar_url?: string
      banner_url?: string
      bio?: string
      theme_preference?: string
    }>()

    const { avatar_url, banner_url, bio, theme_preference } = body

    // Check avatar/banner upload permission (level 7+)
    if ((avatar_url || banner_url) && !canAccessFeature(level, 'avatar_upload')) {
      return c.json({
        error: 'Forbidden',
        message: 'Avatar and banner uploads unlock at level 7',
      }, 403)
    }

    // Check custom theme permission (level 10+)
    if (theme_preference && theme_preference !== 'default' && !canAccessFeature(level, 'custom_themes')) {
      return c.json({
        error: 'Forbidden',
        message: 'Custom themes unlock at level 10',
      }, 403)
    }

    // Validate theme option
    if (theme_preference && !THEME_OPTIONS.includes(theme_preference as any)) {
      return c.json({
        error: 'BadRequest',
        message: `Invalid theme. Choose from: ${THEME_OPTIONS.join(', ')}`,
      }, 400)
    }

    // Validate bio length (max 500 characters)
    if (bio && bio.length > 500) {
      return c.json({
        error: 'BadRequest',
        message: 'Bio exceeds 500 character limit',
      }, 400)
    }

    const db = createDatabaseClient(c.env)
    const userModel = new UserModel(db)

    // Build update query dynamically based on provided fields
    const updates: string[] = []
    const values: any[] = []

    if (avatar_url !== undefined) {
      updates.push('avatar_url = ?')
      values.push(avatar_url)
    }

    if (banner_url !== undefined) {
      updates.push('banner_url = ?')
      values.push(banner_url)
    }

    if (bio !== undefined) {
      updates.push('bio = ?')
      values.push(bio)
    }

    if (theme_preference !== undefined) {
      updates.push('theme_preference = ?')
      values.push(theme_preference)
    }

    updates.push('updated_at = ?')
    values.push(Date.now())

    values.push(userId)

    await db.exec(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      ...values
    )

    // Return updated profile
    const updatedProfile = await userModel.getProfile(userId)

    return c.json(updatedProfile)
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// GET /api/users/:username/followers - Get user's followers list
users.get('/:username/followers', optionalAuth, async (c) => {
  const username = c.req.param('username')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  try {
    const db = createDatabaseClient(c.env)
    const userModel = new UserModel(db)

    // Get user by username
    const user = await userModel.findByUsername(username)

    if (!user) {
      return c.json({ error: 'NotFound', message: 'User not found' }, 404)
    }

    // Get followers with user details
    const followers = await db.query(
      `SELECT u.id, u.username, u.level, u.avatar_url, u.created_at
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.followee_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      user.id,
      limit + 1,
      offset
    )

    const has_more = followers.length > limit
    const followersToReturn = followers.slice(0, limit)

    return c.json({
      followers: followersToReturn,
      total: followersToReturn.length,
      has_more,
    })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

// GET /api/users/:username/following - Get users that this user follows
users.get('/:username/following', optionalAuth, async (c) => {
  const username = c.req.param('username')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = parseInt(c.req.query('offset') || '0')

  try {
    const db = createDatabaseClient(c.env)
    const userModel = new UserModel(db)

    // Get user by username
    const user = await userModel.findByUsername(username)

    if (!user) {
      return c.json({ error: 'NotFound', message: 'User not found' }, 404)
    }

    // Get following with user details
    const following = await db.query(
      `SELECT u.id, u.username, u.level, u.avatar_url, u.created_at
       FROM follows f
       JOIN users u ON f.followee_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      user.id,
      limit + 1,
      offset
    )

    const has_more = following.length > limit
    const followingToReturn = following.slice(0, limit)

    return c.json({
      following: followingToReturn,
      total: followingToReturn.length,
      has_more,
    })
  } catch (error) {
    const isDev = c.env.ENVIRONMENT !== 'production'
    return c.json({
      error: 'InternalServerError',
      message: sanitizeError(error, isDev),
    }, 500)
  }
})

export default users
